from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
from app.services.chat_service import ChatService
from app.services.risk_detection_service import RiskDetectionService
from app.services.emotion_analysis_service import EmotionAnalysisService

# 加载环境变量
load_dotenv()

app = FastAPI(
    title="星屿AI对话引擎",
    description="基于CBT框架的青少年心理健康AI对话服务",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境需要限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化服务
chat_service = ChatService()
risk_service = RiskDetectionService()
emotion_service = EmotionAnalysisService()

# API数据模型
class ChatRequest(BaseModel):
    user_id: str
    message: str
    context: Optional[List[dict]] = []
    user_profile: Optional[dict] = {}

class ChatResponse(BaseModel):
    response: str
    risk_level: str
    emotion_tags: List[str]
    response_time_ms: int

class RiskCheckRequest(BaseModel):
    user_id: str
    content: str
    content_type: str  # "chat" / "mood" / "assessment"

class EmotionAnalysisRequest(BaseModel):
    content: str

# API端点
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-engine", "version": "1.0.0"}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    AI对话接口 - 核心功能
    """
    try:
        # 生成对话回复
        response = await chat_service.generate_response(
            user_id=request.user_id,
            message=request.message,
            context=request.context,
            user_profile=request.user_profile
        )
        
        # 实时风险检测
        risk_level = await risk_service.detect_risk(
            user_id=request.user_id,
            content=request.message
        )
        
        # 情绪分析
        emotion_tags = await emotion_service.analyze(request.message)
        
        return ChatResponse(
            response=response["content"],
            risk_level=risk_level,
            emotion_tags=emotion_tags,
            response_time_ms=response["response_time_ms"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/risk/check")
async def check_risk(request: RiskCheckRequest):
    """
    风险检测接口 - L1关键词 + L2语义分析
    """
    try:
        result = await risk_service.detect_risk(
            user_id=request.user_id,
            content=request.content
        )
        
        return {
            "user_id": request.user_id,
            "risk_level": result,
            "confidence": 0.95,
            "details": await risk_service.get_detection_details(request.content)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/emotion/analyze")
async def analyze_emotion(request: EmotionAnalysisRequest):
    """
    情绪分析接口
    """
    try:
        emotions = await emotion_service.analyze(request.content)
        return {"emotions": emotions, "confidence": 0.92}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/topics")
async def get_topic_cards():
    """
    获取话题引导卡片
    """
    topics = [
        {"id": "topic_1", "title": "聊聊最近的压力", "category": "学业"},
        {"id": "topic_2", "title": "关于朋友的事", "category": "人际"},
        {"id": "topic_3", "title": "未来让我有点焦虑", "category": "未来"},
        {"id": "topic_4", "title": "和家人相处", "category": "家庭"},
        {"id": "topic_5", "title": "没有什么特别的事，就是有点闷", "category": "日常"}
    ]
    return {"topics": topics}

@app.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket, user_id: str):
    """
    WebSocket实时对话接口
    """
    await websocket.accept()
    
    try:
        while True:
            # 接收消息
            data = await websocket.receive_text()
            
            # 生成回复
            response = await chat_service.generate_response(
                user_id=user_id,
                message=data
            )
            
            # 发送回复
            await websocket.send_text(response["content"])
            
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)