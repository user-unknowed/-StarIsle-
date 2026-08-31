/// @file ai_tools_screen.dart
/// @description 教师端 AI 辅助工具页面，提供文章生成、内容摘要、风格转换与主题分析四项能力的可视化入口，
///              通过 [aiProviderState] 触发 AI 调用并展示加载/结果/错误状态。
/// @module teacher-app/screens/ai_tools_screen

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/ai_provider.dart';

/// AI 辅助工具页面 Widget。
///
/// 继承自 [ConsumerStatefulWidget]，监听 [aiProviderState] 状态变化，
/// 渲染四类 AI 工具卡片并处理结果与错误的展示。
class AiToolsScreen extends ConsumerStatefulWidget {
  /// 构造函数。
  const AiToolsScreen({super.key});

  /// 创建状态对象。
  @override
  ConsumerState<AiToolsScreen> createState() => _AiToolsScreenState();
}

/// AI 工具页面状态类。
///
/// 维护 API Key、主题、内容输入控制器与风格/字数等表单状态。
class _AiToolsScreenState extends ConsumerState<AiToolsScreen> {
  /// API Key 输入控制器。
  final _apiKeyController = TextEditingController();

  /// 文章主题输入控制器。
  final _topicController = TextEditingController();

  /// 通用文本内容输入控制器。
  final _contentController = TextEditingController();

  /// 当前选定的写作风格标识。
  String _selectedStyle = 'professional';

  /// 目标文章字数。
  int _wordCount = 800;

  /// 风格转换的目标风格标识。
  String _targetStyle = 'warm';

  /// 可选风格列表。
  final List<String> _styleOptions = [
    'professional',
    'casual',
    'warm',
    'humorous',
    'inspirational',
    'academic',
    'simple',
  ];

  /// 弹出 API Key 配置对话框。
  ///
  /// 参数：
  /// - [context]：构建上下文。
  void _showApiKeyDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('配置API密钥'),
        content: TextField(
          controller: _apiKeyController,
          decoration: const InputDecoration(
            labelText: 'API Key',
            hintText: '请输入智谱AI或硅基流动的API密钥',
          ),
          obscureText: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              ref.read(aiProviderState.notifier).setApiKey(_apiKeyController.text);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('API密钥已配置')),
              );
            },
            child: const Text('保存'),
          ),
        ],
      ),
    );
  }

  /// 构建页面主体。
  ///
  /// 参数：
  /// - [context]：构建上下文。
  ///
  /// 返回：包含 AppBar 与四个工具卡片的 [Scaffold]。
  @override
  Widget build(BuildContext context) {
    final aiState = ref.watch(aiProviderState);

    return Scaffold(
      // 顶部栏：标题与 API Key 配置入口
      appBar: AppBar(
        title: const Text('AI辅助工具'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => _showApiKeyDialog(context),
          ),
        ],
      ),
      // 主体：纵向滚动的工具卡片列表
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionTitle('文章生成'),
            _buildArticleGenerator(),
            const SizedBox(height: 24),

            _buildSectionTitle('内容摘要'),
            _buildSummarizer(),
            const SizedBox(height: 24),

            _buildSectionTitle('风格转换'),
            _buildStyleConverter(),
            const SizedBox(height: 24),

            _buildSectionTitle('主题分析'),
            _buildTopicAnalyzer(),
            const SizedBox(height: 24),

            // 加载中提示
            if (aiState.isLoading)
              const Center(child: CircularProgressIndicator()),
            // 结果展示卡片
            if (aiState.result != null)
              _buildResultCard(aiState.result!),
            // 错误展示卡片
            if (aiState.error != null)
              _buildErrorCard(aiState.error!),
          ],
        ),
      ),
    );
  }

  /// 构建小节标题。
  ///
  /// 参数：
  /// - [title]：标题文本。
  ///
  /// 返回：标题 [Text] Widget。
  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
    );
  }

  /// 构建文章生成卡片，包含主题输入、风格选择、字数滑块与生成按钮。
  ///
  /// 返回：文章生成 [Card] Widget。
  Widget _buildArticleGenerator() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 主题输入
            TextField(
              controller: _topicController,
              decoration: const InputDecoration(
                labelText: '文章主题',
                hintText: '请输入文章主题或关键词',
              ),
            ),
            const SizedBox(height: 12),
            // 写作风格下拉选择
            Row(
              children: [
                const Text('写作风格：'),
                const SizedBox(width: 8),
                DropdownButton<String>(
                  value: _selectedStyle,
                  items: _styleOptions.map((style) => DropdownMenuItem(
                    value: style,
                    child: Text(_styleLabel(style)),
                  )).toList(),
                  onChanged: (value) => setState(() => _selectedStyle = value!),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // 字数滑块
            Row(
              children: [
                const Text('字数：'),
                const SizedBox(width: 8),
                Expanded(
                  child: Slider(
                    value: _wordCount.toDouble(),
                    min: 200,
                    max: 2000,
                    divisions: 9,
                    label: '$_wordCount字',
                    onChanged: (value) => setState(() => _wordCount = value.toInt()),
                  ),
                ),
                Text('$_wordCount字'),
              ],
            ),
            const SizedBox(height: 12),
            // 生成按钮，校验主题后触发 AI 调用
            ElevatedButton(
              onPressed: () {
                if (_topicController.text.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('请输入文章主题')),
                  );
                  return;
                }
                ref.read(aiProviderState.notifier).generateArticle(
                  topic: _topicController.text,
                  style: _selectedStyle,
                  wordCount: _wordCount,
                );
              },
              child: const Text('生成文章'),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建内容摘要卡片，包含多行文本输入与生成按钮。
  ///
  /// 返回：摘要生成 [Card] Widget。
  Widget _buildSummarizer() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 多行原文输入
            TextField(
              controller: _contentController,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: '输入内容',
                hintText: '请输入需要摘要的文本内容',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 12),
            // 生成摘要按钮
            ElevatedButton(
              onPressed: () {
                if (_contentController.text.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('请输入内容')),
                  );
                  return;
                }
                ref.read(aiProviderState.notifier).summarizeContent(
                  content: _contentController.text,
                );
              },
              child: const Text('生成摘要'),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建风格转换卡片，包含文本输入、目标风格选择与转换按钮。
  ///
  /// 返回：风格转换 [Card] Widget。
  Widget _buildStyleConverter() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 待转换文本输入
            TextField(
              controller: _contentController,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: '输入文本',
                hintText: '请输入需要转换风格的文本',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 12),
            // 目标风格选择
            Row(
              children: [
                const Text('目标风格：'),
                const SizedBox(width: 8),
                DropdownButton<String>(
                  value: _targetStyle,
                  items: _styleOptions.map((style) => DropdownMenuItem(
                    value: style,
                    child: Text(_styleLabel(style)),
                  )).toList(),
                  onChanged: (value) => setState(() => _targetStyle = value!),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // 转换按钮
            ElevatedButton(
              onPressed: () {
                if (_contentController.text.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('请输入文本')),
                  );
                  return;
                }
                ref.read(aiProviderState.notifier).convertStyle(
                  content: _contentController.text,
                  targetStyle: _targetStyle,
                );
              },
              child: const Text('转换风格'),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建主题分析卡片，包含文本输入与分析按钮。
  ///
  /// 返回：主题分析 [Card] Widget。
  Widget _buildTopicAnalyzer() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 待分析内容输入
            TextField(
              controller: _contentController,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: '输入内容',
                hintText: '请输入需要分析的文本内容',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 12),
            // 分析按钮
            ElevatedButton(
              onPressed: () {
                if (_contentController.text.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('请输入内容')),
                  );
                  return;
                }
                ref.read(aiProviderState.notifier).analyzeTopic(
                  content: _contentController.text,
                );
              },
              child: const Text('分析主题'),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建结果展示卡片，支持复制与清空。
  ///
  /// 参数：
  /// - [result]：AI 生成的结果文本。
  ///
  /// 返回：绿色背景的 [Card] Widget。
  Widget _buildResultCard(String result) {
    return Card(
      color: Colors.green[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '生成结果',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            // 结果文本（可滚动）
            SingleChildScrollView(
              child: Text(result),
            ),
            const SizedBox(height: 12),
            // 操作按钮：复制 / 清空
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () {
                    Navigator.of(context).clipboard.writeText(result);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('已复制到剪贴板')),
                    );
                  },
                  child: const Text('复制'),
                ),
                TextButton(
                  onPressed: () => ref.read(aiProviderState.notifier).clearResult(),
                  child: const Text('清空'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// 构建错误展示卡片，支持关闭。
  ///
  /// 参数：
  /// - [error]：错误信息文本。
  ///
  /// 返回：红色背景的 [Card] Widget。
  Widget _buildErrorCard(String error) {
    return Card(
      color: Colors.red[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '错误',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.red),
            ),
            const SizedBox(height: 8),
            Text(error),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => ref.read(aiProviderState.notifier).clearResult(),
              child: const Text('关闭'),
            ),
          ],
        ),
      ),
    );
  }

  /// 风格标识转中文标签。
  ///
  /// 参数：
  /// - [style]：风格标识。
  ///
  /// 返回：中文标签，未知标识回退到原值。
  String _styleLabel(String style) {
    final labels = {
      'professional': '专业严谨',
      'casual': '轻松随意',
      'warm': '温暖亲切',
      'humorous': '幽默风趣',
      'inspirational': '激励鼓舞',
      'academic': '学术规范',
      'simple': '通俗易懂',
    };
    return labels[style] ?? style;
  }
}
