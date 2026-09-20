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
        self.model_name = os.getenv("MODEL_NAME", "deepseek-ai/deepseek-chat")
        self.api_key = os.getenv("MODEL_API_KEY")
        if os.getenv("USE_LOCAL_MODEL") == "true":
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
        else:
            from openai import OpenAI
            self.client = OpenAI(
                api_key=self.api_key,
                base_url=os.getenv("MODEL_API_BASE", "https://api.deepseek.com")
            )
        self.system_prompt = Star宝SystemPrompt()
        self.encryption_util = EncryptionUtil()
        self.knowledge_service = KnowledgeService()
        self.skill_router = SkillRouter([])

    def set_skills(self, skills: List[BaseSkill]) -> None:
        self.skill_router = SkillRouter(skills)
    
    async def generate_response(self, user_id: str, message: str, context: Optional[List[Dict]] = [], user_profile: Optional[Dict] = {}) -> Dict:
        start_time = time.time()
        system_prompt = self.system_prompt.generate_prompt(user_profile)
        knowledge_context = await self.knowledge_service.get_relevant_knowledge_for_chat(user_message=message, user_profile=user_profile)
        if knowledge_context:
            system_prompt += f"\n\n【专业知识参考】\n你可以参考以下心理咨询专业知识来帮助用户，但请以自己的方式表达，不要直接引用原文：\n{knowledge_context}\n\n注意：这些知识仅作为参考，你需要结合小星的身份和说话风格来组织回复。"
        skill_desc = self.skill_router.build_available_skills_description()
        skill_predict = self.skill_router.build_prompt_context(message, context or [], user_profile or {})
        skill_results = await self.skill_router.inject_for_chat(message, context or [], user_profile or {})
        system_prompt += self.system_prompt.add_available_skills_context(skill_desc, skill_predict, skill_results)
        messages = [{"role": "system", "content": system_prompt}]
        for msg in context[-10:]:
            messages.append(msg)
        messages.append({"role": "user", "content": message})
        try:
            if os.getenv("USE_LOCAL_MODEL") == "true":
                response_text = await self._generate_local(messages)
            else:
                response_text = await self._generate_api(messages)
            response_time_ms = int((time.time() - start_time) * 1000)
            knowledge_stats = await self.knowledge_service.get_stats()
            return {"content": response_text, "response_time_ms": response_time_ms, "model": self.model_name, "rag_enhanced": knowledge_context != "", "knowledge_mode": knowledge_stats.get("mode", "unknown")}
        except Exception as e:
            return {"content": "小星好像有点迷糊了，请稍后再试试～", "response_time_ms": 2000, "error": str(e), "rag_enhanced": False}
    
    async def _generate_api(self, messages: List[Dict]) -> str:
        response = self.client.chat.completions.create(model=self.model_name, messages=messages, max_tokens=200, temperature=0.7, top_p=0.9)
        return response.choices[0].message.content
    
    async def _generate_local(self, messages: List[Dict]) -> str:
        prompt = self.tokenizer.apply_chat_template(messages, tokenize=False)
        inputs = self.tokenizer(prompt, return_tensors="pt")
        with torch.no_grad():
            outputs = self.model.generate(inputs.input_ids, max_new_tokens=200, temperature=0.7, top_p=0.9, do_sample=True)
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return response
