/// @file ai_service.dart
/// @description 学生端 AI 服务层，封装智谱 GLM 与 SiliconFlow 两大模型供应商的调用，
///              提供文章生成、内容摘要、风格转换、主题分析等能力，并支持主备供应商自动容错切换。
/// @module student-app/services

import 'dart:convert';
import 'package:http/http.dart' as http;

/// AI 服务，统一封装大模型 API 调用。
///
/// 内部维护当前供应商 [_currentProvider]（默认 'zhipu'），主供应商调用失败时
/// 自动回退到备用供应商 'siliconflow'。
class AIService {
  // 智谱 API 基础地址
  static const String _zhipuBaseUrl = 'https://open.bigmodel.cn/api/paas/v4';
  // SiliconFlow API 基础地址
  static const String _siliconFlowBaseUrl = 'https://api.siliconflow.cn/v1';

  // 当前配置的 API Key
  String? _apiKey;
  // 当前使用的供应商标识：'zhipu' 或 'siliconflow'
  String _currentProvider = 'zhipu';

  /// 构造函数，可传入初始 [apiKey]。
  AIService({String? apiKey}) {
    _apiKey = apiKey;
  }

  /// 设置 API Key。
  ///
  /// 参数：
  /// - [key]：待配置的 API 密钥。
  void setApiKey(String key) {
    _apiKey = key;
  }

  /// 切换当前供应商。
  ///
  /// 参数：
  /// - [provider]：供应商标识（如 'zhipu' 或 'siliconflow'）。
  void switchProvider(String provider) {
    _currentProvider = provider;
  }

  /// 生成文章。
  ///
  /// 参数：
  /// - [topic]：文章主题（必填）；
  /// - [style]：写作风格，默认 'professional'；
  /// - [wordCount]：字数目标，默认 800；
  /// - [additionalRequirements]：可选的附加要求。
  ///
  /// 返回：模型生成的文章文本。
  Future<String> generateArticle({
    required String topic,
    String? style = 'professional',
    int? wordCount = 800,
    String? additionalRequirements,
  }) async {
    final systemPrompt = _buildSystemPrompt('article_writer');
    final userPrompt = '''
请根据以下主题撰写一篇${wordCount}字左右的文章：

主题：${topic}

风格要求：${_styleDescription(style)}

${additionalRequirements != null ? '附加要求：${additionalRequirements}' : ''}

请确保文章结构清晰、内容专业、语言流畅，符合青少年心理健康教育领域的特点。
''';

    return await _callAPI(systemPrompt, userPrompt);
  }

  /// 摘要内容。
  ///
  /// 参数：
  /// - [content]：原文内容（必填）；
  /// - [summaryLength]：摘要字数，默认 200；
  /// - [summaryType]：摘要类型，默认 'general'（可为 'academic'）。
  ///
  /// 返回：模型生成的摘要文本。
  Future<String> summarizeContent({
    required String content,
    int? summaryLength = 200,
    String? summaryType = 'general',
  }) async {
    final systemPrompt = _buildSystemPrompt('summarizer');
    final userPrompt = '''
请对以下内容进行${summaryType == 'academic' ? '学术性' : '一般性'}摘要，控制在${summaryLength}字左右：

原文内容：
${content}

要求：提取核心要点，保持逻辑清晰，准确传达原文主旨。
''';

    return await _callAPI(systemPrompt, userPrompt);
  }

  /// 风格转换。
  ///
  /// 参数：
  /// - [content]：原文内容（必填）；
  /// - [targetStyle]：目标风格标识（必填）。
  ///
  /// 返回：转换为目标风格后的文本。
  Future<String> convertStyle({
    required String content,
    required String targetStyle,
  }) async {
    final systemPrompt = _buildSystemPrompt('style_converter');
    final userPrompt = '''
请将以下文本转换为"${targetStyle}"风格：

原文：
${content}

目标风格特点：${_styleDescription(targetStyle)}

请保持原文内容不变，仅改变表达方式和语言风格。
''';

    return await _callAPI(systemPrompt, userPrompt);
  }

  /// 主题分析。
  ///
  /// 参数：
  /// - [content]：待分析内容（必填）；
  /// - [includeSentiment]：是否包含情感分析；
  /// - [includeKeywords]：是否包含关键词提取；
  /// - [includeSuggestions]：是否包含改进建议。
  ///
  /// 返回：结构化的主题分析结果文本。
  Future<String> analyzeTopic({
    required String content,
    bool includeSentiment = true,
    bool includeKeywords = true,
    bool includeSuggestions = true,
  }) async {
    final systemPrompt = _buildSystemPrompt('topic_analyzer');
    final userPrompt = '''
请对以下内容进行主题分析：

内容：
${content}

分析要求：
${includeSentiment ? '- 情感分析：识别文本的情感倾向' : ''}
${includeKeywords ? '- 关键词提取：列出核心关键词' : ''}
${includeSuggestions ? '- 改进建议：针对内容提出优化建议' : ''}

请以结构化方式输出分析结果。
''';

    return await _callAPI(systemPrompt, userPrompt);
  }

  /// 根据角色标识构建系统提示词。
  ///
  /// 参数：
  /// - [role]：角色标识，支持 article_writer / summarizer / style_converter / topic_analyzer。
  ///
  /// 返回：对应的系统提示词文本，未知角色回退到 article_writer。
  String _buildSystemPrompt(String role) {
    final rolePrompts = {
      'article_writer': '''
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
''',
      'summarizer': '''
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
''',
      'style_converter': '''
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
''',
      'topic_analyzer': '''
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
''',
    };

    return rolePrompts[role] ?? rolePrompts['article_writer']!;
  }

  /// 根据风格标识获取风格描述文本。
  ///
  /// 参数：
  /// - [style]：风格标识（如 'professional' / 'warm' 等）。
  ///
  /// 返回：对应的风格描述，未知风格回退到 'professional'。
  String _styleDescription(String? style) {
    final descriptions = {
      'professional': '专业严谨，适合学术或正式场合',
      'casual': '轻松随意，适合日常交流',
      'warm': '温暖亲切，富有同理心',
      'humorous': '幽默风趣，轻松愉快',
      'inspirational': '激励鼓舞，充满正能量',
      'academic': '学术规范，严谨专业',
      'simple': '通俗易懂，适合大众阅读',
    };
    return descriptions[style] ?? descriptions['professional']!;
  }

  /// 统一 API 调用入口，依据当前供应商分发请求，并在主供应商失败时自动回退。
  ///
  /// 参数：
  /// - [systemPrompt]：系统提示词；
  /// - [userPrompt]：用户提示词。
  ///
  /// 返回：模型回复内容。
  Future<String> _callAPI(String systemPrompt, String userPrompt) async {
    // 校验 API Key 是否已配置
    if (_apiKey == null || _apiKey!.isEmpty) {
      throw Exception('API密钥未配置，请先设置API Key');
    }

    try {
      if (_currentProvider == 'zhipu') {
        return await _callZhipuAPI(systemPrompt, userPrompt);
      } else {
        return await _callSiliconFlowAPI(systemPrompt, userPrompt);
      }
    } catch (e) {
      // 主供应商（智谱）失败时切换到备用供应商重试
      if (_currentProvider == 'zhipu') {
        _currentProvider = 'siliconflow';
        return await _callSiliconFlowAPI(systemPrompt, userPrompt);
      }
      rethrow;
    }
  }

  /// 调用智谱 GLM API（模型 glm-4-flash）。
  ///
  /// 参数：
  /// - [systemPrompt]：系统提示词；
  /// - [userPrompt]：用户提示词。
  ///
  /// 返回：模型回复内容；HTTP 非 200 时抛出异常。
  Future<String> _callZhipuAPI(String systemPrompt, String userPrompt) async {
    final url = Uri.parse('$_zhipuBaseUrl/chat/completions');

    // 构造请求体：模型名、消息列表、采样参数
    final body = jsonEncode({
      'model': 'glm-4-flash',
      'messages': [
        {'role': 'system', 'content': systemPrompt},
        {'role': 'user', 'content': userPrompt},
      ],
      'temperature': 0.7,
      'max_tokens': 2048,
    });

    // 发起 POST 请求，使用 Bearer Token 鉴权
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_apiKey',
      },
      body: body,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['choices'][0]['message']['content']?.trim() ?? '生成失败';
    } else {
      throw Exception('API调用失败: ${response.statusCode} - ${response.body}');
    }
  }

  /// 调用 SiliconFlow API（模型 Qwen/Qwen2-7B-Instruct）。
  ///
  /// 参数：
  /// - [systemPrompt]：系统提示词；
  /// - [userPrompt]：用户提示词。
  ///
  /// 返回：模型回复内容；HTTP 非 200 时抛出异常。
  Future<String> _callSiliconFlowAPI(String systemPrompt, String userPrompt) async {
    final url = Uri.parse('$_siliconFlowBaseUrl/chat/completions');

    // 构造请求体
    final body = jsonEncode({
      'model': 'Qwen/Qwen2-7B-Instruct',
      'messages': [
        {'role': 'system', 'content': systemPrompt},
        {'role': 'user', 'content': userPrompt},
      ],
      'temperature': 0.7,
      'max_tokens': 2048,
    });

    // 发起 POST 请求
    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_apiKey',
      },
      body: body,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['choices'][0]['message']['content']?.trim() ?? '生成失败';
    } else {
      throw Exception('API调用失败: ${response.statusCode} - ${response.body}');
    }
  }
}