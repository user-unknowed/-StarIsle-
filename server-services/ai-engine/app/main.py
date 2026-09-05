"""
main.py - 星屿 AI 对话引擎 FastAPI 应用入口

所属模块：ai-engine/app
功能简述：
    定义 FastAPI 应用实例，统一装配 CORS 中间件、生命周期钩子、
    API 数据模型与各业务端点。提供 AI 对话、风险检测、情绪分析、
    话题卡片、WebSocket 实时对话及知识库管理（RAG 增强）等接口。
依赖关系：
    - app.skills：技能自动发现与路由
    - app.services：对话、风险检测、情绪分析、知识库等服务
    - app.utils：数据库连接等基础设施
    - dotenv：从 .env 文件加载环境变量
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import importlib
import pkgutil
from app.skills.base_skill import BaseSkill
from app.skills.skill_router import SkillRouter
from app.services.chat_service import ChatService
from app.services.risk_detection_service import RiskDetectionService
from app.services.emotion_analysis_service import EmotionAnalysisService
from app.services.knowledge_service import KnowledgeService
from contextlib import asynccontextmanager

# 加载环境变量：从 .env 文件读取配置注入 os.environ
load_dotenv()


def _autodiscover_skills():
    """
    自动发现并实例化所有已注册的 Fork Skills。

    扫描 app.skills 包下以 _adapter 或 _skill 结尾的模块，
    动态导入并收集其中 BaseSkill 的非抽象子类，逐一实例化后返回。

    Returns:
        List[BaseSkill]: 实例化后的技能对象列表
    """
    import app.skills as spkg
    found: List[BaseSkill] = []
    # 遍历 skills 包下的所有模块
    for _finder, name, _ispkg in pkgutil.iter_modules(spkg.__path__):
        # 仅处理适配器或技能模块，跳过其它辅助模块
        if not (name.endswith("_adapter") or name.endswith("_skill")): continue
        # 动态导入模块，失败则跳过并打印原因
        try: mod = importlib.import_module(f"app.skills.{name}")
        except Exception as e: print(f"[AI-Engine] 跳过 {name}: {e}"); continue
        # 遍历模块属性，收集 BaseSkill 的具体子类
        for attr in dir(mod):
            obj = getattr(mod, attr)
            if (isinstance(obj, type) and issubclass(obj, BaseSkill)
                    and obj is not BaseSkill and not getattr(obj, "__abstractmethods__", None)):
                # 实例化技能，失败则记录但不中断发现流程
                try: found.append(obj())
                except Exception as e: print(f"[AI-Engine] 实例化 {attr} 失败: {e}")
    print(f"[AI-Engine] 技能自动发现: {len(found)} 个 -> {[s.name for s in found]}")
    return found


# 初始化服务：在模块加载阶段创建各业务服务单例
chat_service = ChatService()                # 对话生成服务
risk_service = RiskDetectionService()      # 风险检测服务
emotion_service = EmotionAnalysisService() # 情绪分析服务
knowledge_service = KnowledgeService()     # 知识库管理服务

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI 生命周期上下文管理器，负责启动与关闭时的初始化和清理。

    启动阶段：加载知识库 JSON 文件、自动发现并注入 Fork Skills。
    关闭阶段：打印关闭日志。

    Args:
        app: FastAPI 应用实例
    Yields:
        在应用运行期间挂起，应用关闭后继续执行清理逻辑
    """
    # 启动时加载知识库：定位 data/knowledge_base.json 并导入
    print("[AI-Engine] 正在加载心理咨询知识库...")
    knowledge_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data",
        "knowledge_base.json"
    )
    if os.path.exists(knowledge_file):
        # 知识库文件存在则导入，并打印导入条数
        count = await knowledge_service.import_from_json(knowledge_file)
        print(f"[AI-Engine] 知识库加载完成，共 {count} 条知识")
    else:
        # 文件缺失时使用空知识库，避免阻塞启动
        print("[AI-Engine] 知识库文件未找到，使用空知识库")

    # 打印当前知识库模式与文档数，便于确认加载状态
    stats = await knowledge_service.get_stats()
    print(f"[AI-Engine] 知识库模式: {stats.get('mode')}, 文档数: {stats.get('total_documents')}")
    # 自动发现技能并注入对话服务
    skills = _autodiscover_skills()
    if skills and hasattr(chat_service, "set_skills"):
        chat_service.set_skills(skills)
        print(f"[AI-Engine] 已注入 {len(skills)} 个 Fork Skills: {[s.name for s in skills]}")
    print("[AI-Engine] AI引擎启动完成，RAG增强已就绪")

    # yield 之前为启动逻辑，之后为关闭逻辑
    yield

    # 关闭时清理：打印关闭日志（当前无显式资源释放）
    print("[AI-Engine] 正在关闭AI引擎...")

app = FastAPI(
    title="星屿AI对话引擎",
    description="基于CBT框架的青少年心理健康AI对话服务 | 集成心理咨询知识库RAG增强",
    version="1.0.0",
    lifespan=lifespan
)

# CORS配置：允许跨域请求，生产环境需将 allow_origins 收紧为白名单
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境需要限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API数据模型：定义各端点请求/响应的数据结构
class ChatRequest(BaseModel):
    """对话请求模型，承载用户消息及上下文画像"""
    user_id: str                              # 用户唯一标识
    message: str                              # 用户发送的消息内容
    context: Optional[List[dict]] = []       # 历史对话上下文
    user_profile: Optional[dict] = {}         # 用户画像信息

class ChatResponse(BaseModel):
    """对话响应模型，返回AI回复及风险/情绪/RAG增强等附加信息"""
    response: str                             # AI 生成的回复文本
    risk_level: str                            # 风险等级
    emotion_tags: List[str]                    # 情绪标签列表
    response_time_ms: int                      # 响应耗时（毫秒）
    rag_enhanced: bool = False                 # 是否启用 RAG 知识增强
    knowledge_mode: str = "unknown"            # 知识库模式

class RiskCheckRequest(BaseModel):
    """风险检测请求模型，用于对内容进行风险评估"""
    user_id: str                               # 用户唯一标识
    content: str                               # 待检测的文本内容
    content_type: str  # "chat" / "mood" / "assessment"  内容类型

class EmotionAnalysisRequest(BaseModel):
    """情绪分析请求模型，仅包含待分析文本"""
    content: str                               # 待分析的情绪文本

# API端点
@app.get("/health")
async def health_check():
    """
    健康检查端点，供容器编排与负载均衡做存活探测。

    Returns:
        dict: 包含状态、服务名与版本的健康信息
    """
    return {"status": "healthy", "service": "ai-engine", "version": "1.0.0"}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    AI对话接口 - 核心功能（集成RAG知识增强）
    
    知识库来源：ima知识库《心理咨询技术》（26本心理学经典书籍）
    知识仅作为上下文参考，AI模型不进行训练

    Args:
        request: 对话请求，包含用户ID、消息、上下文与用户画像

    Returns:
        ChatResponse: 包含回复文本、风险等级、情绪标签与响应耗时

    Raises:
        HTTPException: 当对话生成或风险检测失败时返回 500
    """
    try:
        # 生成对话回复（含RAG知识增强）
        response = await chat_service.generate_response(
            user_id=request.user_id,
            message=request.message,
            context=request.context,
            user_profile=request.user_profile
        )
        
        # 实时风险检测：对用户消息进行风险评估
        risk_level = await risk_service.detect_risk(
            user_id=request.user_id,
            content=request.message
        )
        
        # 情绪分析：识别消息中蕴含的情绪标签
        emotion_tags = await emotion_service.analyze(request.message)
        
        # 组装响应，附带 RAG 增强与知识库模式标记
        return ChatResponse(
            response=response["content"],
            risk_level=risk_level,
            emotion_tags=emotion_tags,
            response_time_ms=response["response_time_ms"],
            rag_enhanced=response.get("rag_enhanced", False),
            knowledge_mode=response.get("knowledge_mode", "unknown")
        )
        
    except Exception as e:
        # 任意环节异常均返回 500，并携带错误详情
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/risk/check")
async def check_risk(request: RiskCheckRequest):
    """
    风险检测接口 - L1关键词 + L2语义分析

    Args:
        request: 风险检测请求，包含用户ID与待检测内容

    Returns:
        dict: 风险等级、置信度与检测细节

    Raises:
        HTTPException: 检测失败时返回 500
    """
    try:
        # 调用风险检测服务获取风险等级
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

    Args:
        request: 情绪分析请求，包含待分析文本

    Returns:
        dict: 情绪标签列表与置信度

    Raises:
        HTTPException: 分析失败时返回 500
    """
    try:
        # 调用情绪分析服务获取情绪标签
        emotions = await emotion_service.analyze(request.content)
        return {"emotions": emotions, "confidence": 0.92}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/topics")
async def get_topic_cards():
    """
    获取话题引导卡片，帮助用户开启对话。

    Returns:
        dict: 包含话题ID、标题与分类的话题卡片列表
    """
    # 返回预设话题卡片，覆盖学业、人际、未来、家庭与日常
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

    维护一条长连接，循环接收用户消息、调用对话服务生成回复并回写。
    连接异常或断开时关闭 WebSocket。

    Args:
        websocket: WebSocket 连接对象
        user_id: 用户唯一标识，从路径参数获取
    """
    # 接受 WebSocket 握手，建立连接
    await websocket.accept()
    
    try:
        while True:
            # 接收客户端文本消息
            data = await websocket.receive_text()
            
            # 生成回复（含RAG知识增强）
            response = await chat_service.generate_response(
                user_id=user_id,
                message=data
            )
            
            # 发送回复文本给客户端
            await websocket.send_text(response["content"])
            
    except Exception as e:
        # 异常时打印日志并关闭连接
        print(f"WebSocket error: {e}")
        await websocket.close()

# ==================== 知识库管理API ====================

class KnowledgeSearchRequest(BaseModel):
    """知识库搜索请求模型"""
    query: str                                  # 搜索查询内容
    category: Optional[str] = None              # 分类筛选（可选）
    top_k: int = 5                              # 返回前K个结果

class KnowledgeImportRequest(BaseModel):
    """知识库导入请求模型，可指定 JSON 路径或使用默认路径"""
    json_path: Optional[str] = None             # 自定义 JSON 文件路径

@app.post("/knowledge/search")
async def search_knowledge(request: KnowledgeSearchRequest):
    """
    知识库搜索接口 - 搜索心理咨询技术知识
    
    知识库来源：ima知识库《心理咨询技术》

    Args:
        request: 搜索请求，包含查询文本、可选分类与返回条数

    Returns:
        dict: 查询文本、命中数量及结果列表（含标题、来源、预览等）

    Raises:
        HTTPException: 检索失败时返回 500
    """
    try:
        # 调用知识库服务执行检索
        results = await knowledge_service.search_knowledge(
            query=request.query,
            category=request.category,
            top_k=request.top_k
        )
        
        return {
            "query": request.query,
            "total_results": len(results),
            # 将每条结果转为前端可读的结构
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
    获取知识库统计信息，包含来源说明与文档数。

    Returns:
        dict: 来源、来源链接、用途说明及统计字段

    Raises:
        HTTPException: 获取统计失败时返回 500
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
    重新导入知识库数据，支持自定义或默认 JSON 路径。

    Args:
        request: 导入请求，json_path 为空时使用默认路径

    Returns:
        dict: 导入是否成功、导入条数、总文档数与模式

    Raises:
        HTTPException: 导入失败时返回 500
    """
    try:
        json_path = request.json_path
        # 未指定路径则回退到 data/knowledge_base.json
        if not json_path:
            json_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "data",
                "knowledge_base.json"
            )
        
        # 执行导入并立即获取最新统计
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
    获取知识库分类列表及文档总数。

    Returns:
        dict: 分类列表与文档总数

    Raises:
        HTTPException: 获取失败时返回 500
    """
    try:
        stats = await knowledge_service.get_stats()
        return {
            "categories": stats.get("categories", []),
            "total_documents": stats.get("total_documents", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/skills/status")
async def skills_status():
    """
    查询技能路由状态，返回已注册技能列表。

    若对话服务未注入 SkillRouter，则返回空列表与错误说明。

    Returns:
        dict: 技能状态信息
    """
    if hasattr(chat_service, "skill_router"):
        return {"skills": chat_service.skill_router.status()}
    return {"skills": [], "error": "SkillRouter 未初始化"}

if __name__ == "__main__":
    # 直接运行时以 uvicorn 启动服务，监听 8000 端口
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)