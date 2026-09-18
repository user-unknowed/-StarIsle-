package com.starisle.student.data.repo

import com.starisle.student.data.api.AiApiService
import com.starisle.student.data.api.ChatCompletionRequest
import com.starisle.student.data.api.ChatMessage
import javax.inject.Inject
import javax.inject.Singleton

/**
 * AI 仓储层（对应 Dart services/ai_service.dart）。
 *
 * 封装智谱 GLM 与 SiliconFlow 两家供应商调用，主供应商失败时自动回退。
 * 提供：文章生成、内容摘要、风格转换、主题分析四大能力。
 *
 * @param aiApiService 注入的 Retrofit 接口。
 * @param apiKey       用户配置的 API Key，运行时由 ViewModel 调用 [setApiKey]。
 */
@Singleton
class AiRepository @Inject constructor(
    private val aiApiService: AiApiService,
) {
    // 智谱 API 基础地址（Dart 中 _zhipuBaseUrl）
    private val zhipuBaseUrl: String = "https://open.bigmodel.cn/api/paas/v4/"
    // SiliconFlow API 基础地址（Dart 中 _siliconFlowBaseUrl）
    private val siliconFlowBaseUrl: String = "https://api.siliconflow.cn/v1/"

    // 当前 API Key
    @Volatile
    private var apiKey: String? = null

    // 当前供应商标识：'zhipu' 或 'siliconflow'
    @Volatile
    private var currentProvider: String = "zhipu"

    fun setApiKey(key: String) {
        apiKey = key
    }

    fun switchProvider(provider: String) {
        currentProvider = provider
    }

    fun currentProvider(): String = currentProvider

    suspend fun generateArticle(
        topic: String,
        style: String? = "professional",
        wordCount: Int? = 800,
        additionalRequirements: String? = null,
    ): String {
        val systemPrompt = buildSystemPrompt("article_writer")
        val userPrompt = buildString {
            append("请根据以下主题撰写一篇${wordCount}字左右的文章：\n\n")
            append("主题：${topic}\n\n")
            append("风格要求：${styleDescription(style)}\n\n")
            if (!additionalRequirements.isNullOrBlank()) {
                append("附加要求：${additionalRequirements}\n\n")
            }
            append("请确保文章结构清晰、内容专业、语言流畅，符合青少年心理健康教育领域的特点。")
        }
        return callApi(systemPrompt, userPrompt)
    }

    suspend fun summarizeContent(
        content: String,
        summaryLength: Int? = 200,
        summaryType: String? = "general",
    ): String {
        val systemPrompt = buildSystemPrompt("summarizer")
        val userPrompt = buildString {
            append(
                "请对以下内容进行${if (summaryType == "academic") "学术性" else "一般性"}摘要，" +
                    "控制在${summaryLength}字左右：\n\n"
            )
            append("原文内容：\n${content}\n\n")
            append("要求：提取核心要点，保持逻辑清晰，准确传达原文主旨。")
        }
        return callApi(systemPrompt, userPrompt)
    }

    suspend fun convertStyle(content: String, targetStyle: String): String {
        val systemPrompt = buildSystemPrompt("style_converter")
        val userPrompt = buildString {
            append("请将以下文本转换为\"${targetStyle}\"风格：\n\n")
            append("原文：\n${content}\n\n")
            append("目标风格特点：${styleDescription(targetStyle)}\n\n")
            append("请保持原文内容不变，仅改变表达方式和语言风格。")
        }
        return callApi(systemPrompt, userPrompt)
    }

    suspend fun analyzeTopic(
        content: String,
        includeSentiment: Boolean = true,
        includeKeywords: Boolean = true,
        includeSuggestions: Boolean = true,
    ): String {
        val systemPrompt = buildSystemPrompt("topic_analyzer")
        val userPrompt = buildString {
            append("请对以下内容进行主题分析：\n\n")
            append("内容：\n${content}\n\n")
            append("分析要求：\n")
            if (includeSentiment) append("- 情感分析：识别文本的情感倾向\n")
            if (includeKeywords) append("- 关键词提取：列出核心关键词\n")
            if (includeSuggestions) append("- 改进建议：针对内容提出优化建议\n")
            append("\n请以结构化方式输出分析结果。")
        }
        return callApi(systemPrompt, userPrompt)
    }

    /**
     * 统一 API 调用入口，依据 currentProvider 分发，
     * 主供应商失败时自动切换到备用供应商重试。
     */
    private suspend fun callApi(systemPrompt: String, userPrompt: String): String {
        val key = apiKey
        require(!key.isNullOrBlank()) { "API密钥未配置，请先设置API Key" }

        return try {
            when (currentProvider) {
                "zhipu" -> callZhipu(systemPrompt, userPrompt, key)
                else -> callSiliconFlow(systemPrompt, userPrompt, key)
            }
        } catch (e: Exception) {
            // 主供应商（智谱）失败时切换到备用供应商重试
            if (currentProvider == "zhipu") {
                currentProvider = "siliconflow"
                callSiliconFlow(systemPrompt, userPrompt, key)
            } else {
                throw e
            }
        }
    }

    /**
     * 调用智谱 GLM API（模型 glm-4-flash）。
     */
    private suspend fun callZhipu(
        systemPrompt: String,
        userPrompt: String,
        apiKey: String,
    ): String {
        val request = ChatCompletionRequest(
            model = "glm-4-flash",
            messages = listOf(
                ChatMessage(role = "system", content = systemPrompt),
                ChatMessage(role = "user", content = userPrompt),
            ),
        )
        val response = aiApiService.chatCompletion(
            "${zhipuBaseUrl}chat/completions",
            "Bearer $apiKey",
            request,
        )
        return response.choices.firstOrNull()
            ?.message?.content?.trim().orEmpty().ifEmpty { "生成失败" }
    }

    /**
     * 调用 SiliconFlow API（模型 Qwen/Qwen2-7B-Instruct）。
     */
    private suspend fun callSiliconFlow(
        systemPrompt: String,
        userPrompt: String,
        apiKey: String,
    ): String {
        val request = ChatCompletionRequest(
            model = "Qwen/Qwen2-7B-Instruct",
            messages = listOf(
                ChatMessage(role = "system", content = systemPrompt),
                ChatMessage(role = "user", content = userPrompt),
            ),
        )
        val response = aiApiService.chatCompletion(
            "${siliconFlowBaseUrl}chat/completions",
            "Bearer $apiKey",
            request,
        )
        return response.choices.firstOrNull()
            ?.message?.content?.trim().orEmpty().ifEmpty { "生成失败" }
    }

    /**
     * 系统提示词构建（迁移自 Dart _buildSystemPrompt）。
     */
    private fun buildSystemPrompt(role: String): String = when (role) {
        "article_writer" -> ARTICLE_WRITER_PROMPT
        "summarizer" -> SUMMARIZER_PROMPT
        "style_converter" -> STYLE_CONVERTER_PROMPT
        "topic_analyzer" -> TOPIC_ANALYZER_PROMPT
        else -> ARTICLE_WRITER_PROMPT
    }

    /**
     * 风格描述（迁移自 Dart _styleDescription）。
     */
    private fun styleDescription(style: String?): String = when (style) {
        "professional" -> "专业严谨，适合学术或正式场合"
        "casual" -> "轻松随意，适合日常交流"
        "warm" -> "温暖亲切，富有同理心"
        "humorous" -> "幽默风趣，轻松愉快"
        "inspirational" -> "激励鼓舞，充满正能量"
        "academic" -> "学术规范，严谨专业"
        "simple" -> "通俗易懂，适合大众阅读"
        else -> "专业严谨，适合学术或正式场合"
    }

    private val ARTICLE_WRITER_PROMPT = """
你是一名专业的青少年心理健康教育文章撰稿人。

角色背景：
- 拥有心理学专业背景，熟悉青少年心理发展规律
- 长期从事心理健康教育工作，了解教师和学生的需求
- 擅长将专业知识转化为通俗易懂的教育内容

语言风格：
- 温和亲切，富有同理心
- 专业严谨，数据准确
- 鼓励性强，传递正能量
- 适合青少年阅读，避免使用过于学术化的术语

专业领域知识：
- 青少年情绪管理
- 压力应对策略
- 人际交往技巧
- 自我认知与成长
- 心理健康维护

写作要求：
- 结构清晰，层次分明
- 观点明确，论据充分
- 语言流畅，易于理解
- 符合教育目的，传递积极价值观
""".trimIndent()

    private val SUMMARIZER_PROMPT = """
你是一名专业的内容摘要专家，擅长提炼文本核心信息。

角色背景：
- 拥有信息学和心理学双专业背景
- 熟悉教育领域文本的特点和重点
- 擅长在保持信息完整性的前提下进行精准概括

语言风格：
- 简洁明了，直击要点
- 逻辑清晰，层次分明
- 客观中立，不添加主观评价

专业能力：
- 快速识别文本主旨和关键信息
- 准确提取核心论点和论据
- 保持原文逻辑结构和重要关系
- 根据需求调整摘要的详细程度

摘要要求：
- 保留关键数据和结论
- 不遗漏重要观点
- 语言精炼，避免冗余
- 符合原文风格和语境
""".trimIndent()

    private val STYLE_CONVERTER_PROMPT = """
你是一名精通多种写作风格的语言转换专家。

角色背景：
- 拥有文学和教育学专业背景
- 熟悉各种文体的特点和规范
- 擅长在不同风格间进行自然转换

语言风格库：
- 正式专业：适合学术论文、研究报告
- 通俗易懂：适合科普文章、大众读物
- 温暖亲切：适合心理辅导、情感文章
- 幽默风趣：适合轻松话题、互动内容
- 激励鼓舞：适合励志文章、演讲文稿

转换要求：
- 保持内容的准确性和完整性
- 自然流畅，不生硬
- 符合目标风格的语言特点
- 根据受众调整表达方式
""".trimIndent()

    private val TOPIC_ANALYZER_PROMPT = """
你是一名专业的文本分析专家，擅长主题挖掘和内容评估。

角色背景：
- 拥有语言学和心理学专业背景
- 熟悉青少年心理健康领域的内容特点
- 擅长从多角度进行深度分析

分析能力：
- 主题识别：准确判断文本的核心主题
- 情感分析：识别文本的情感倾向和强度
- 关键词提取：提炼最具代表性的关键词
- 内容评估：评估内容质量和适用性

分析要求：
- 客观中立，基于文本事实
- 结构清晰，分点论述
- 提供具体的改进建议
- 结合青少年心理健康教育的专业视角
""".trimIndent()
}
