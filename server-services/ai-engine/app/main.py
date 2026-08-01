from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
from app.services.chat_service import ChatService
from app.services.risk_detection_service import RiskDetectionService
from app.services.emotion_analysis_service import EmotionAnalysisService
from app.services.knowledge_service import KnowledgeService
from contextlib import asynccontextmanager

# 加载环境变量
load_dotenv()

# 初始化服务
chat_service = ChatService()
risk_service = RiskDetectionService()
emotion_service = EmotionAnalysisService()
knowledge_service = KnowledgeService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时加载知识库
    print("[AI-Engine] 正在加载心理咨询知识库...")
    knowledge_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data",
        "knowledge_base.json"
    )
    if os.path.exists(knowledge_file):
        count = await knowledge_service.import_from_json(knowledge_file)
        print(f"[AI-Engine] 知识库加载完成，共 {count} 条知识")
    else:
        print("[AI-Engine] 知识库文件未找到，使用空知识库")
    
    stats = await knowledge_service.get_stats()
    print(f"[AI-Engine] 知识库模式: {stats.get('mode')}, 文档数: {stats.get('total_documents')}")
    print("[AI-Engine] AI引擎启动完成，RAG增强已就绪")
    
    yield
    
    # 关闭时清理
    print("[AI-Engine] 正在关闭AI引擎...")

app = FastAPI(
    title="星屿AI对话引擎",
    description="基于CBT框架的青少年心理健康AI对话服务 | 集成心理咨询知识库RAG增强",
    version="1.0.0",
    lifespan=lifespan
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境需要限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    rag_enhanced: bool = False
    knowledge_mode: str = "unknown"

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
    AI对话接口 - 核心功能（集成RAG知识增强）
    
    知识库来源：ima知识库《心理咨询技术》（26本心理学经典书籍）
    知识仅作为上下文参考，AI模型不进行训练
    """
    try:
        # 生成对话回复（含RAG知识增强）
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
            response_time_ms=response["response_time_ms"],
            rag_enhanced=response.get("rag_enhanced", False),
            knowledge_mode=response.get("knowledge_mode", "unknown")
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
    WebSocket实时对话接口（集成RAG知识增强）
    """
    await websocket.accept()
    
    try:
        while True:
            # 接收消息
            data = await websocket.receive_text()
            
            # 生成回复（含RAG知识增强）
            response = await chat_service.generate_response(
                user_id=user_id,
                message=data
            )
            
            # 发送回复
            await websocket.send_text(response["content"])
            
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()

# ==================== 知识库管理API ====================

class KnowledgeSearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    top_k: int = 5

class KnowledgeImportRequest(BaseModel):
    json_path: Optional[str] = None

@app.post("/knowledge/search")
async def search_knowledge(request: KnowledgeSearchRequest):
    """
    知识库搜索接口 - 搜索心理咨询技术知识
    
    知识库来源：ima知识库《心理咨询技术》
    """
    try:
        results = await knowledge_service.search_knowledge(
            query=request.query,
            category=request.category,
            top_k=request.top_k
        )
        
        return {
            "query": request.query,
            "total_results": len(results),
            "results": [
                {
                    "title": r.document.title,
                    "source": r.document.source,
                    "category": r.document.category,
                    "content_preview": r.document.content[:200],
                    "techniques": r.document.techniques[:5],
                    "score": r.relevance_score,
                    "matched_keywords": r.matched_keywords
                }
                for r in results
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/knowledge/stats")
async def get_knowledge_stats():
    """
    获取知识库统计信息
    """
    try:
        stats = await knowledge_service.get_stats()
        return {
            "source": "ima知识库 - 心理咨询技术",
            "source_url": "https://ima.qq.com/wiki/?shareId=8c7d46dc19ed72214c4bd5183ff7cc95c77705fb587dce3e257adde06bd34d81",
            "description": "基于26本心理学经典书籍的心理咨询技术知识库",
            "usage": "知识仅作为RAG检索增强的参考，AI模型不进行训练",
            **stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/knowledge/import")
async def import_knowledge(request: KnowledgeImportRequest):
    """
    重新导入知识库数据
    """
    try:
        json_path = request.json_path
        if not json_path:
            json_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "data",
                "knowledge_base.json"
            )
        
        count = await knowledge_service.import_from_json(json_path)
        stats = await knowledge_service.get_stats()
        
        return {
            "success": True,
            "imported_count": count,
            "total_documents": stats.get("total_documents", 0),
            "mode": stats.get("mode", "unknown")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/knowledge/categories")
async def get_knowledge_categories():
    """
    获取知识库分类列表
    """
    try:
        stats = await knowledge_service.get_stats()
        return {
            "categories": stats.get("categories", []),
            "total_documents": stats.get("total_documents", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)