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

class ChatService:
    """
    AI对话服务 - 基于国产大模型的CBT对话引擎
    
    集成RAG（检索增强生成），从心理咨询知识库中检索相关知识，
    并通过技能路由器注入 Fork Skills 上下文，最终由大模型生成回复。
    """
    
    def __init__(self):
        """
        初始化对话服务，加载大模型与各依赖组件。

        根据 USE_LOCAL_MODEL 决定使用本地推理或 API 调用，
        并初始化 System Prompt 生成器、加密工具、知识库服务与技能路由器。
        """
        # 加载大模型（MVP阶段可使用API调用）
        self.model_name = os.getenv("MODEL_NAME", "deepseek-ai/deepseek-chat")
        self.api_key = os.getenv("MODEL_API_KEY")
        
        # 如果本地部署，加载模型
        if os.getenv("USE_LOCAL_MODEL") == "true":
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
        else:
            # 使用API调用：构造 OpenAI 兼容客户端，指向国产模型服务
            from openai import OpenAI
            self.client = OpenAI(
                api_key=self.api_key,
                base_url=os.getenv("MODEL_API_BASE", "https://api.deepseek.com")
            )
        
        # 初始化各依赖组件
        self.system_prompt = Star宝SystemPrompt()   # System Prompt 生成器
        self.encryption_util = EncryptionUtil()      # 消息加密工具
        self.knowledge_service = KnowledgeService() # RAG 知识库服务
        self.skill_router = SkillRouter([])          # 技能路由器（初始为空）

    def set_skills(self, skills: List[BaseSkill]) -> None:
        """
        Orchestrator 完成 M2a 后注入新生成的 adapters。

        Args:
            skills: 技能适配器列表
        """
        self.skill_router = SkillRouter(skills)
    
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
        
        # 构建System Prompt：依据用户画像生成基础人设
        system_prompt = self.system_prompt.generate_prompt(user_profile)
        
        # RAG检索：从心理咨询知识库中检索相关知识
        knowledge_context = await self.knowledge_service.get_relevant_knowledge_for_chat(
            user_message=message,
            user_profile=user_profile
        )
        
        # 将检索到的知识注入到System Prompt中（不修改模型参数，仅作为上下文参考）
        if knowledge_context:
            system_prompt += f"\n\n【专业知识参考】\n你可以参考以下心理咨询专业知识来帮助用户，但请以自己的方式表达，不要直接引用原文：\n{knowledge_context}\n\n注意：这些知识仅作为参考，你需要结合小星的身份和说话风格来组织回复。"

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
        try:
            if os.getenv("USE_LOCAL_MODEL") == "true":
                # 本地模型推理
                response_text = await self._generate_local(messages)
            else:
                # API调用
                response_text = await self._generate_api(messages)
            
            # 计算响应耗时（毫秒）
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # 获取知识库检索统计，标记 RAG 是否增强及知识库模式
            knowledge_stats = await self.knowledge_service.get_stats()
            
            return {
                "content": response_text,
                "response_time_ms": response_time_ms,
                "model": self.model_name,
                "rag_enhanced": knowledge_context != "",
                "knowledge_mode": knowledge_stats.get("mode", "unknown")
            }
            
        except Exception as e:
            # 降级策略：返回预设的安全回复，避免空响应影响体验
            return {
                "content": "小星好像有点迷糊了，请稍后再试试～",
                "response_time_ms": 2000,
                "error": str(e),
                "rag_enhanced": False
            }
    
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
            model="deepseek-chat",
            messages=messages,
            max_tokens=200,  # 短句为主
            temperature=0.7,
            top_p=0.9
        )
        
        return response.choices[0].message.content
    
    async def _generate_local(self, messages: List[Dict]) -> str:
        """
        本地模型推理。

        Args:
            messages: 完整对话消息列表（含 System Prompt）

        Returns:
            str: 模型生成的回复文本
        """
        # TODO: 实现本地模型推理逻辑
        # 应用聊天模板构造模型输入
        prompt = self.tokenizer.apply_chat_template(messages, tokenize=False)
        
        # 对输入文本做分词，返回 PyTorch 张量
        inputs = self.tokenizer(prompt, return_tensors="pt")
        
        # 在无梯度上下文中执行采样生成
        with torch.no_grad():
            outputs = self.model.generate(
                inputs.input_ids,
                max_new_tokens=200,
                temperature=0.7,
                top_p=0.9,
                do_sample=True
            )
        
        # 解码输出张量为文本，跳过特殊 token
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return response