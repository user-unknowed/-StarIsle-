package com.starisle.teacher.data.repo

import com.starisle.teacher.data.api.ChatCompletionRequest
import com.starisle.teacher.data.api.ChatMessageDto
import com.starisle.teacher.data.api.SiliconFlowApiService
import com.starisle.teacher.data.api.ZhipuApiService
import javax.inject.Inject
import javax.inject.Singleton

/**
 * AI Repository：封装对智谱 GLM 与 SiliconFlow 的调用，主供应商失败时自动降级。
 *
 * 对应 Dart 端 `services/ai_service.dart`。
 */
@Singleton
class AiRepository @Inject constructor(
    private val zhipuApi: ZhipuApiService,
    private val siliconFlowApi: SiliconFlowApiService,
) {
    /** 当前使用的 API Key，默认空。 */
    @Volatile
    private var apiKey: String = ""

    /** 当前供应商标识。 */
    @Volatile
    private var currentProvider: Provider = Provider.ZHIPU

    fun setApiKey(key: String) {
        apiKey = key
    }

    fun switchProvider(provider: Provider) {
        currentProvider = provider
    }

    /** 生成文章。 */
    suspend fun generateArticle(
        topic: String,
        style: String = "professional",
        wordCount: Int = 800,
        additionalRequirements: String? = null,
    ): String {
        val systemPrompt = buildSystemPrompt(Role.ARTICLE_WRITER)
        val userPrompt = buildString {
            appendLine("请根据以下主题撰写一篇${wordCount}字左右的文章：")
            appendLine()
            appendLine("主题：$topic")
            appendLine()
            appendLine("风格要求：${styleDescription(style)}")
            appendLine()
            if (!additionalRequirements.isNullOrBlank()) {
                appendLine("附加要求：$additionalRequirements")
                appendLine()
            }
            appendLine("请确保文章结构清晰、内容专业、语言流畅，符合青少年心理健康教育领域的特点。")
        }
        return callApi(systemPrompt, userPrompt)
    }

    /** 内容摘要。 */
    suspend fun summarizeContent(
        content: String,
        summaryLength: Int = 200,
        summaryType: String = "general",
    ): String {
        val systemPrompt = buildSystemPrompt(Role.SUMMARIZER)
        val userPrompt = buildString {
            appendLine("请对以下内容进行${if (summaryType == "academic") "学术性" else "一般性"}摘要，控制在${summaryLength}字左右：")
            appendLine()
            appendLine("原文内容：")
            appendLine(content)
            appendLine()
            appendLine("要求：提取核心要点，保持逻辑清晰，准确传达原文主旨。")
        }
        return callApi(systemPrompt, userPrompt)
    }

    /** 转换文风。 */
    suspend fun convertStyle(
        content: String,
        targetStyle: String,
    ): String {
        val systemPrompt = buildSystemPrompt(Role.STYLE_CONVERTER)
        val userPrompt = buildString {
            appendLine("请将以下文本转换为\"$targetStyle\"风格：")
            appendLine()
            appendLine("原文：")
            appendLine(content)
            appendLine()
            appendLine("目标风格特点：${styleDescription(targetStyle)}")
            appendLine()
            appendLine("请保持原文内容不变，仅改变表达方式和语言风格。")
        }
        return callApi(systemPrompt, userPrompt)
    }

    /** 主题分析。 */
    suspend fun analyzeTopic(
        content: String,
        includeSentiment: Boolean = true,
        includeKeywords: Boolean = true,
        includeSuggestions: Boolean = true,
    ): String {
        val systemPrompt = buildSystemPrompt(Role.TOPIC_ANALYZER)
        val userPrompt = buildString {
            appendLine("请对以下内容进行主题分析：")
            appendLine()
            appendLine("内容：")
            appendLine(content)
            appendLine()
            appendLine("分析要求：")
            if (includeSentiment) appendLine("- 情感分析：识别文本的情感倾向")
            if (includeKeywords) appendLine("- 关键词提取：列出核心关键词")
            if (includeSuggestions) appendLine("- 改进建议：针对内容提出优化建议")
            appendLine()
            appendLine("请以结构化方式输出分析结果。")
        }
        return callApi(systemPrompt, userPrompt)
    }

    private suspend fun callApi(systemPrompt: String, userPrompt: String): String {
        require(apiKey.isNotEmpty()) { "API密钥未配置，请先设置API Key" }

        return try {
            when (currentProvider) {
                Provider.ZHIPU -> callZhipu(systemPrompt, userPrompt)
                Provider.SILICONFLOW -> callSiliconFlow(systemPrompt, userPrompt)
            }
        } catch (e: Exception) {
            // 主供应商失败，尝试切换到备用供应商
            if (currentProvider == Provider.ZHIPU) {
                currentProvider = Provider.SILICONFLOW
                callSiliconFlow(systemPrompt, userPrompt)
            } else {
                throw e
            }
        }
    }

    private suspend fun callZhipu(systemPrompt: String, userPrompt: String): String {
        val body = ChatCompletionRequest(
            model = ZHIPU_MODEL,
            messages = listOf(
                ChatMessageDto(role = "system", content = systemPrompt),
                ChatMessageDto(role = "user", content = userPrompt),
            ),
        )
        val resp = zhipuApi.chatCompletions(authHeader(), body)
        return resp.choices?.firstOrNull()?.message?.content?.trim() ?: "生成失败"
    }

    private suspend fun callSiliconFlow(systemPrompt: String, userPrompt: String): String {
        val body = ChatCompletionRequest(
            model = SILICONFLOW_MODEL,
            messages = listOf(
                ChatMessageDto(role = "system", content = systemPrompt),
                ChatMessageDto(role = "user", content = userPrompt),
            ),
        )
        val resp = siliconFlowApi.chatCompletions(authHeader(), body)
        return resp.choices?.firstOrNull()?.message?.content?.trim() ?: "生成失败"
    }

    private fun authHeader(): String = "Bearer $apiKey"

    /** 根据角色构建系统提示词。 */
    private fun buildSystemPrompt(role: Role): String = when (role) {
        Role.ARTICLE_WRITER -> ARTICLE_WRITER_PROMPT
        Role.SUMMARIZER -> SUMMARIZER_PROMPT
        Role.STYLE_CONVERTER -> STYLE_CONVERTER_PROMPT
        Role.TOPIC_ANALYZER -> TOPIC_ANALYZER_PROMPT
    }

    /** 文风描述。 */
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

    enum class Provider { ZHIPU, SILICONFLOW }

    private enum class Role { ARTICLE_WRITER, SUMMARIZER, STYLE_CONVERTER, TOPIC_ANALYZER }

    private companion object {
        const val ZHIPU_MODEL = "glm-4-flash"
        const val SILICONFLOW_MODEL = "Qwen/Qwen2-7B-Instruct"

        const val ARTICLE_WRITER_PROMPT = """
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

写作要求：
- 结构清晰，层次分明
- 观点明确，论据充分
- 语言流畅，易于理解
- 符合教育目的，传递积极价值观
"""

        const val SUMMARIZER_PROMPT = """
你是一名专业的内容摘要专家，擅长提炼文本核心信息。

角色背景：
- 拥有信息学和心理学双专业背景
- 熟悉教育领域文本的特点和重点
- 擅长在保持信息完整性的前提下进行精准概括

摘要要求：
- 保留关键数据和结论
- 不遗漏重要观点
- 语言精炼，避免冗余
- 符合原文风格和语境
"""

        const val STYLE_CONVERTER_PROMPT = """
你是一名精通多种写作风格的语言转换专家。

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
"""

        const val TOPIC_ANALYZER_PROMPT = """
你是一名专业的文本分析专家，擅长主题挖掘和内容评估。

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
"""
    }
}
