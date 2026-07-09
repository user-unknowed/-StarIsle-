import os
from typing import List, Dict, Optional
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from app.prompts.star宝_system_prompt import Star宝SystemPrompt
from app.utils.encryption import EncryptionUtil
import time

class ChatService:
    """
    AI对话服务 - 基于国产大模型的CBT对话引擎
    """
    
    def __init__(self):
        # 加载大模型（MVP阶段可使用API调用）
        self.model_name = os.getenv("MODEL_NAME", "deepseek-ai/deepseek-chat")
        self.api_key = os.getenv("MODEL_API_KEY")
        
        # 如果本地部署，加载模型
        if os.getenv("USE_LOCAL_MODEL") == "true":
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
        else:
            # 使用API调用
            from openai import OpenAI
            self.client = OpenAI(
                api_key=self.api_key,
                base_url=os.getenv("MODEL_API_BASE", "https://api.deepseek.com")
            )
        
        self.system_prompt = Star宝SystemPrompt()
        self.encryption_util = EncryptionUtil()
    
    async def generate_response(
        self, 
        user_id: str,
        message: str,
        context: Optional[List[Dict]] = [],
        user_profile: Optional[Dict] = {}
    ) -> Dict:
        """
        生成对话回复 - CBT框架驱动
        
        Args:
            user_id: 用户ID
            message: 用户消息
            context: 对话历史
            user_profile: 用户画像
        
        Returns:
            包含回复内容和响应时间的字典
        """
        start_time = time.time()
        
        # 构建System Prompt
        system_prompt = self.system_prompt.generate_prompt(user_profile)
        
        # 构建对话历史
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # 添加历史对话
        for msg in context[-10:]:  # 保留最近10轮对话
            messages.append(msg)
        
        # 添加当前用户消息
        messages.append({"role": "user", "content": message})
        
        # 生成回复
        try:
            if os.getenv("USE_LOCAL_MODEL") == "true":
                # 本地模型推理
                response_text = await self._generate_local(messages)
            else:
                # API调用
                response_text = await self._generate_api(messages)
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            return {
                "content": response_text,
                "response_time_ms": response_time_ms,
                "model": self.model_name
            }
            
        except Exception as e:
            # 降级策略：返回预设的安全回复
            return {
                "content": "小星好像有点迷糊了，请稍后再试试～",
                "response_time_ms": 2000,
                "error": str(e)
            }
    
    async def _generate_api(self, messages: List[Dict]) -> str:
        """
        通过API生成回复
        """
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
        本地模型推理
        """
        # TODO: 实现本地模型推理逻辑
        prompt = self.tokenizer.apply_chat_template(messages, tokenize=False)
        
        inputs = self.tokenizer(prompt, return_tensors="pt")
        
        with torch.no_grad():
            outputs = self.model.generate(
                inputs.input_ids,
                max_new_tokens=200,
                temperature=0.7,
                top_p=0.9,
                do_sample=True
            )
        
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        return response