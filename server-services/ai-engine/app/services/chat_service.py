"""
chat_service.py - AI 对话服务（CBT 框架 + RAG 知识增强）

所属模块：ai-engine/app/services
功能简述：
    基于国产大模型的 CBT 对话引擎，集成 RAG（检索增强生成），
    从心理咨询知识库检索相关知识注入 System Prompt；支持本地模型推理
    与 API 调用两种模式，并具备降级回复策略。
依赖关系：
    - transformers/torch：本地模型推理（可选，缺失时懒加载降级）
    - openai：API 调用客户端
    - app.prompts：System Prompt 生成
    - app.utils.encryption：消息加密
    - app.services.knowledge_service：RAG 检索
    - app.skills：技能三段注入
"""
import os
import re
from pathlib import Path
from typing import List, Dict, Optional
try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
except Exception:  # 训练/无 heavy deps 环境懒加载
    AutoModelForCausalLM = None; AutoTokenizer = None  # type:ignore
try:
    import torch
except Exception:
    torch = None  # type:ignore
from app.prompts.star宝_system_prompt import Star宝SystemPrompt
from app.utils.encryption import EncryptionUtil
from app.services.knowledge_service import KnowledgeService
from app.skills.base_skill import BaseSkill
from app.skills.skill_router import SkillRouter
import time

# 规则语法检查器（scripts/grammar_checker.py）：用于回复输出侧的排版归一化
# （省略号/半角标点/重复字等确定性修正），保证交付回复语法干净
try:
    import importlib.util as _ilu
    _gc_spec = _ilu.spec_from_file_location(
        "grammar_checker",
        str(Path(__file__).resolve().parents[2] / "scripts" / "grammar_checker.py"))
    _gc = _ilu.module_from_spec(_gc_spec)
    _gc_spec.loader.exec_module(_gc)  # type: ignore
except Exception:
    _gc = None

class ChatService:
    """
    AI对话服务 - 基于国产大模型的CBT对话引擎
    
    集成RAG（检索增强生成），从心理咨询知识库中检索相关知识，
    并通过技能路由器注入 Fork Skills 上下文，最终由大模型生成回复。
    """
    
    def __init__(self, knowledge_service: Optional[KnowledgeService] = None):
        """
        初始化对话服务。

        根据 USE_LOCAL_MODEL 决定使用本地推理或 API 调用，
        并初始化 System Prompt 生成器、加密工具、知识库服务与技能路由器。
        Args:
            knowledge_service: 共享的知识库服务实例（推荐注入，避免重复加载）。
                               若为 None 则内部创建独立实例。
        """
        # 加载大模型（MVP阶段可使用API调用）
        self.model_name = os.getenv("MODEL_NAME", "deepseek-ai/deepseek-chat")
        self.api_key = os.getenv("MODEL_API_KEY")
        self.device = "cpu"

        # 如果本地部署，加载模型
        if os.getenv("USE_LOCAL_MODEL") == "true":
            # 默认指向本仓库 SFT 微调产物（相对 ai-engine 根目录）
            default_local = str(Path(__file__).resolve().parents[2]
                                / "models" / "sft_xiaoxing_v1" / "final_model")
            self.model_name = os.getenv("MODEL_NAME") or default_local
            if not os.path.isdir(self.model_name):
                raise RuntimeError(f"本地模型目录不存在: {self.model_name}")
            use_cuda = torch is not None and torch.cuda.is_available()
            self.device = "cuda" if use_cuda else "cpu"
            dtype = torch.float16 if use_cuda else torch.float32
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name, torch_dtype=dtype).to(self.device).eval()
        else:
            # 使用API调用：构造 OpenAI 兼容客户端，指向国产模型服务
            from openai import OpenAI
            try:
                self.client = OpenAI(
                    api_key=self.api_key or "sk-placeholder-dev",
                    base_url=os.getenv("MODEL_API_BASE", "https://api.deepseek.com")
                )
            except Exception as e:
                # API Key 缺失或客户端初始化失败时记录告警，调用时再返回友好提示
                print(f"Warning: OpenAI client init failed: {e}")
                self.client = None
        
        # 初始化各依赖组件
        self.system_prompt = Star宝SystemPrompt()   # System Prompt 生成器
        self.encryption_util = EncryptionUtil()      # 消息加密工具
        # RAG 知识库服务：优先使用外部注入的共享实例（含已导入文档）
        self.knowledge_service = knowledge_service or KnowledgeService()
        self.skill_router = SkillRouter([])          # 技能路由器（初始为空）

        # 用户聊天记忆：key=user_id, value=最近用户消息列表（用于 RAG 个性化推荐）
        self._chat_memory: Dict[str, List[str]] = {}

    def set_skills(self, skills: List[BaseSkill]) -> None:
        """
        Orchestrator 完成 M2a 后注入新生成的 adapters。

        Args:
            skills: 技能适配器列表
        """
        self.skill_router = SkillRouter(skills)

    def get_recent_messages(self, user_id: str, limit: int = 10) -> List[str]:
        """
        获取用户最近的聊天消息（用于 RAG 个性化推荐的记忆增强）。

        Args:
            user_id: 用户 ID
            limit: 返回条数上限

        Returns:
            List[str]: 最近的用户消息列表（按时间倒序）
        """
        msgs = self._chat_memory.get(user_id, [])
        return list(reversed(msgs[-limit:]))

    def _is_joke_request(self, message: str) -> bool:
        """
        判断用户是否在要求讲一个笑话。

        Args:
            message: 用户消息

        Returns:
            bool: 命中“讲/说/来 + 个/段/点 + 笑话/段子”句式时返回 True
        """
        return bool(re.search(r"(讲|说|来)(一?个|一?段|点)?(笑话|段子)", message or ""))
    
    async def generate_response(
        self, 
        user_id: str,
        message: str,
        context: Optional[List[Dict]] = [],
        user_profile: Optional[Dict] = {}
    ) -> Dict:
        """
        生成对话回复 - CBT框架驱动 + RAG知识增强
        
        Args:
            user_id: 用户ID
            message: 用户消息
            context: 对话历史
            user_profile: 用户画像
        
        Returns:
            dict: 包含回复内容和响应时间的字典
        """
        # 记录起始时间用于统计响应耗时
        start_time = time.time()

        # 记录用户消息到聊天记忆（最近 20 条），供 RAG 个性化推荐使用
        self._chat_memory.setdefault(user_id, []).append(message)
        if len(self._chat_memory[user_id]) > 20:
            self._chat_memory[user_id] = self._chat_memory[user_id][-20:]

        # 讲笑话意图：直接从知识库随机取一条笑话原样输出，不经过检索打分与模型生成
        if self._is_joke_request(message):
            joke = await self.knowledge_service.pick_random_document("joke")
            if joke:
                knowledge_stats = await self.knowledge_service.get_stats()
                self.knowledge_service.last_chat_hits = [joke["title"]]
                return {
                    "content": joke["content"],
                    "response_time_ms": int((time.time() - start_time) * 1000),
                    "model": "joke-rag",
                    "rag_enhanced": True,
                    "knowledge_mode": knowledge_stats.get("mode", "unknown"),
                    "knowledge_hits": [joke["title"]],
                }

        # 构建System Prompt：依据用户画像生成基础人设
        system_prompt = self.system_prompt.generate_prompt(user_profile)
        
        # RAG检索：依据对话内容（含历史）+ 记忆（用户画像）检索知识库，适量注入
        knowledge_context = await self.knowledge_service.get_relevant_knowledge_for_chat(
            user_message=message,
            user_profile=user_profile,
            context=context
        )
        knowledge_hits = list(self.knowledge_service.last_chat_hits)
        
        # 将检索到的知识注入到System Prompt中（不修改模型参数，仅作为上下文参考）
        if knowledge_context:
            system_prompt += (
                f"\n\n【专业知识参考】\n"
                f"你可以参考以下心理咨询专业知识来帮助用户，但请用自己的方式简要表达，"
                f"每次只融入 1-2 个关键点，不要整段照搬或罗列原文：\n{knowledge_context}\n\n"
                f"注意：这些知识仅作为参考，你需要结合小星的身份和说话风格来组织回复。"
                f"只有当这些内容与用户当前的话题直接相关时才引用；"
                f"如果与用户此刻说的内容无关，就不要提及它们，更不要主动把话题引向知识库内容。"
                f"标注为 L3 的内容只用于识别风险并建议寻求专业帮助，不要据此给出自我处置建议。"
            )

        # +++ Skill 三段注入：描述、预测、结果，依次拼接到 System Prompt +++
        skill_desc = self.skill_router.build_available_skills_description()
        skill_predict = self.skill_router.build_prompt_context(message, context or [], user_profile or {})
        skill_results = await self.skill_router.inject_for_chat(message, context or [], user_profile or {})
        system_prompt += self.system_prompt.add_available_skills_context(
            skill_desc, skill_predict, skill_results
        )
        # +++ End 三段注入

        # 构建对话历史：首位为 System Prompt
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # 添加历史对话：仅保留最近10轮以控制上下文长度
        for msg in context[-10:]:  # 保留最近10轮对话
            messages.append(msg)
        
        # 添加当前用户消息
        messages.append({"role": "user", "content": message})
        
        # 生成回复：按配置选择本地推理或 API 调用
        response_text = None
        generation_error = None
        try:
            if os.getenv("USE_LOCAL_MODEL") == "true":
                # 本地模型推理
                response_text = await self._generate_local(messages)
            else:
                # API调用
                response_text = await self._generate_api(messages)
        except Exception as e:
            # API 不可用时降级到本地规则生成，保证对话不中断
            generation_error = str(e)
            try:
                response_text = await self._generate_fallback(messages)
            except Exception:
                response_text = "小星好像有点迷糊了，请稍后再试试～"

        # 计算响应耗时（毫秒）
        response_time_ms = int((time.time() - start_time) * 1000)

        # 获取知识库检索统计，标记 RAG 是否增强及知识库模式
        try:
            knowledge_stats = await self.knowledge_service.get_stats()
            knowledge_mode = knowledge_stats.get("mode", "unknown")
        except Exception:
            knowledge_mode = "unknown"

        result = {
            "content": response_text,
            "response_time_ms": response_time_ms,
            "model": self.model_name,
            "rag_enhanced": knowledge_context != "",
            "knowledge_mode": knowledge_mode,
            "knowledge_hits": knowledge_hits
        }
        if generation_error:
            result["error"] = generation_error
            result["used_fallback"] = True
        return result
    
    async def _generate_api(self, messages: List[Dict]) -> str:
        """
        通过API生成回复。

        Args:
            messages: 完整对话消息列表（含 System Prompt）

        Returns:
            str: 模型生成的回复文本
        """
        # 调用 OpenAI 兼容接口生成回复，限制 max_tokens 以保持短句风格
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            max_tokens=200,  # 短句为主
            temperature=0.7,
            top_p=0.9
        )
        
        return response.choices[0].message.content
    
    async def _generate_fallback(self, messages: List[Dict]) -> str:
        """
        本地规则回退回复生成器（无 API Key 或 API 不可用时使用）。

        基于 CBT 框架与关键词匹配，生成共情、不贴标签的短句回复，
        确保 MVP 在无大模型 API 的情况下仍可正常对话。

        Args:
            messages: 完整对话消息列表（含 System Prompt）

        Returns:
            str: 规则生成的回复文本
        """
        # 提取最后一条用户消息
        user_msg = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                user_msg = msg.get("content", "")
                break

        msg_lower = user_msg.lower()

        # 关键词 → 共情回应模板（避免诊断性词汇，使用"状态/感受"描述）
        keyword_responses = [
            (["失眠", "睡不着", "睡不好", "熬夜"], [
                "睡眠确实很影响心情呢。试着睡前一小时放下手机，做几次深呼吸，让身体慢慢放松下来。如果持续很久，也许可以和信任的人说说。",
                "睡不着的夜晚确实难熬。可以试试把注意力放在呼吸上，或者听听轻音乐。小星陪着你，慢慢来。"
            ]),
            (["焦虑", "紧张", "担心", "害怕", "不安"], [
                "这种紧绷的感觉一定很辛苦。深呼吸，把注意力放在当下——你现在是安全的。如果愿意，可以和我说说是什么让你如此不安。",
                "感到紧张是身体在提醒我们需要照顾自己了。试试握紧拳头再慢慢松开，重复几次，看看会不会好一点。"
            ]),
            (["压力", "累", "疲惫", "撑不住", "喘不过气"], [
                "你已经很努力了。压力大的时候，允许自己休息一下不是逃避，而是为了走得更远。今天可以只做一件小事。",
                "肩上的担子一定很重吧。试着把它们一件件列出来，也许会发现有些可以暂时放下。你不需要一个人扛着所有。"
            ]),
            (["难过", "伤心", "想哭", "低落", "不开心"], [
                "难过的时候哭出来也没关系。情绪就像天气，会来也会走。我在这里听你说。",
                "谢谢你愿意告诉我你的感受。低落的时候，哪怕只是说出来，也是一种释放。"
            ]),
            (["考试", "学习", "成绩", "作业"], [
                "学习上的压力确实让人焦虑。试着把大目标拆成今天能完成的一小步，完成它就是胜利。你的价值从来不只是分数。",
                "考试只是人生中的一个节点，不是全部。尽力就好，小星相信你。"
            ]),
            (["朋友", "同学", "人际关系", "孤独", "没人理"], [
                "人际关系有时候确实让人疲惫。真正的朋友会接纳真实的你。如果暂时没有，也没关系——你可以先成为自己的朋友。",
                "感到孤独的时候，记得你不是一个人。可以试着参加一些感兴趣的活动，也许会遇到同频的人。"
            ]),
            (["家长", "父母", "妈妈", "爸爸", "家庭"], [
                "和家人之间的沟通有时确实很难。试着用'我感到...'而不是'你总是...'来表达，也许会有不一样的结果。",
                "家庭带来的压力往往最沉。你已经做得很好了。如果可以，找一个让你感到安全的地方喘口气。"
            ]),
            (["自我", "价值", "没用", "一无是处", "失败"], [
                "你不是没用，只是暂时被疲惫遮住了光芒。每个人都有自己的节奏，不需要和别人比较。",
                "请不要这样说自己。你愿意来和我聊天，说明你还在乎自己，这已经很勇敢了。"
            ]),
            (["精神分析", "认知行为", "cbt", "治疗", "咨询"], [
                "心理咨询是一段自我探索的旅程。精神分析关注过去如何影响现在，认知行为疗法则聚焦于调整想法与行为的关系。如果你感兴趣，我可以分享更多。",
                "了解心理学知识是自我成长的好方式。不同的流派有不同的视角，找到适合自己的才最重要。"
            ]),
        ]

        # 命中关键词则随机返回一条对应回应
        import random
        for keywords, responses in keyword_responses:
            if any(kw in msg_lower for kw in keywords):
                return random.choice(responses)

        # 通用共情回应（未命中关键词时）
        generic_responses = [
            "谢谢你愿意和我说说。在这里你可以放心地表达自己，我会认真听。",
            "我在这里陪你。你现在的感受是真实且重要的，愿意多说说吗？",
            "听到你这么说，我能感觉到你最近不太轻松。慢慢来，不急。",
            "你的感受很重要。无论是什么让你烦恼，说出来本身就是一种力量。",
            "小星在听。你不需要表现得很好，真实就好。"
        ]
        return random.choice(generic_responses)

    async def generate_completion(
        self,
        messages: List[Dict],
        max_new_tokens: int = 200,
        temperature: float = 0.7,
        top_p: float = 0.9,
    ) -> str:
        """
        OpenAI 兼容的补全入口：直接按给定 messages 生成本地模型回复。

        供 /v1/chat/completions 端点使用（学生端文章生成/摘要/风格转换/主题分析）。

        Args:
            messages: 完整对话消息列表
            max_new_tokens: 最大新生成 token 数
            temperature: 采样温度
            top_p: 核采样阈值

        Returns:
            str: 模型生成的回复文本
        """
        # 本地模型不可用时退回 API / 规则兜底，保证端点始终有响应
        if os.getenv("USE_LOCAL_MODEL") != "true":
            try:
                return await self._generate_api(messages)
            except Exception:
                return await self._generate_fallback(messages)
        return await self._generate_local(messages, max_new_tokens, temperature, top_p)

    def _build_local_prompt(self, messages: List[Dict]) -> str:
        """
        用 tokenizer 的 chat template 构造本地模型输入。

        优先使用 apply_chat_template；老模型/无模板时回退到 ChatML 手写格式。
        """
        try:
            return self.tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True)
        except Exception:
            buf = "".join(
                f"<|im_start|>{m['role']}\n{m['content']}<|im_end|>\n" for m in messages)
            return buf + "<|im_start|>assistant\n"

    def _generate_sync(
        self,
        prompt: str,
        max_new_tokens: int = 200,
        temperature: float = 0.7,
        top_p: float = 0.9,
    ) -> str:
        """同步推理（阻塞），由 _generate_local 放到线程池执行。"""
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=True,
                temperature=temperature,
                top_p=top_p,
                repetition_penalty=1.05,
                pad_token_id=self.tokenizer.pad_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
            )
        # 只解码新生成的 token，避免把整段 prompt 混进回复
        new_tokens = outputs[0][inputs["input_ids"].shape[-1]:]
        text = self.tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
        # 输出侧排版归一化：确定性修正省略号/半角标点/重复字等，保证语法干净
        if _gc is not None:
            try:
                text = _gc.auto_fix(text)
            except Exception:
                pass
        # 清理基座模型偶发的方括号伪标签（如 [自动分隔情绪]）与幻觉 URL，保证回复自然
        text = re.sub(r"\[[^\[\]]{2,16}\]", "", text)
        text = re.sub(r"https?://\S+", "", text).strip()
        return text

    async def _generate_local(
        self,
        messages: List[Dict],
        max_new_tokens: int = 200,
        temperature: float = 0.7,
        top_p: float = 0.9,
    ) -> str:
        """
        本地模型推理。

        Args:
            messages: 完整对话消息列表（含 System Prompt）
            max_new_tokens: 最大新生成 token 数
            temperature: 采样温度
            top_p: 核采样阈值

        Returns:
            str: 模型生成的回复文本
        """
        import asyncio
        prompt = self._build_local_prompt(messages)
        # 放到线程池，避免阻塞 FastAPI 事件循环
        return await asyncio.to_thread(
            self._generate_sync, prompt, max_new_tokens, temperature, top_p
        )
