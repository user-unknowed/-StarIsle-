/// @file ai_tools_screen.dart
/// @description 学生端 AI 辅助工具页面，提供文章生成、内容摘要、风格转换、主题分析
///              四大功能的表单交互，并通过 [aiProviderState] 驱动结果与错误展示。
/// @module student-app/screens

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/ai_provider.dart';

/// AI 辅助工具页面，承载多种 AI 文本处理功能的交互表单。
class AiToolsScreen extends ConsumerStatefulWidget {
  /// 构造函数。
  const AiToolsScreen({super.key});

  /// 创建 State 对象。
  @override
  ConsumerState<AiToolsScreen> createState() => _AiToolsScreenState();
}

/// [AiToolsScreen] 的 State，持有各表单控制器与选项。
class _AiToolsScreenState extends ConsumerState<AiToolsScreen> {
  // API Key 输入控制器
  final _apiKeyController = TextEditingController();
  // 文章主题输入控制器
  final _topicController = TextEditingController();
  // 通用内容输入控制器（摘要/风格转换/主题分析共用）
  final _contentController = TextEditingController();

  // 当前选中的写作风格
  String _selectedStyle = 'professional';
  // 文章目标字数
  int _wordCount = 800;
  // 风格转换目标风格
  String _targetStyle = 'warm';

  // 可选风格列表
  final List<String> _styleOptions = [
    'professional',
    'casual',
    'warm',
    'humorous',
    'inspirational',
    'academic',
    'simple',
  ];

  /// 弹出 API 密钥配置对话框，保存时写入 Provider。
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
          // 取消按钮
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          // 保存按钮：写入 Provider 并提示
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
  /// 监听 [aiProviderState]，依次渲染文章生成、内容摘要、风格转换、主题分析模块，
  /// 以及加载指示器、结果卡片与错误卡片。
  @override
  Widget build(BuildContext context) {
    final aiState = ref.watch(aiProviderState);

    return Scaffold(
      // 顶部 AppBar：标题 + 设置入口
      appBar: AppBar(
        title: const Text('AI辅助工具'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => _showApiKeyDialog(context),
          ),
        ],
      ),
      // 主体：可滚动表单区
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

            // 加载中指示器
            if (aiState.isLoading)
              const Center(child: CircularProgressIndicator()),
            // 结果卡片
            if (aiState.result != null)
              _buildResultCard(aiState.result!),
            // 错误卡片
            if (aiState.error != null)
              _buildErrorCard(aiState.error!),
          ],
        ),
      ),
    );
  }

  /// 构建区块标题。
  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
    );
  }

  /// 构建文章生成模块（主题、风格、字数、生成按钮）。
  Widget _buildArticleGenerator() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 文章主题输入
            TextField(
              controller: _topicController,
              decoration: const InputDecoration(
                labelText: '文章主题',
                hintText: '请输入文章主题或关键词',
              ),
            ),
            const SizedBox(height: 12),
            // 写作风格选择
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
            // 生成按钮：触发 Provider 调用
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

  /// 构建内容摘要模块。
  Widget _buildSummarizer() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 原文输入
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
            // 触发摘要生成
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

  /// 构建风格转换模块。
  Widget _buildStyleConverter() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 原文输入
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
            // 触发风格转换
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

  /// 构建主题分析模块。
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
            // 触发主题分析
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

  /// 构建结果卡片，支持复制与清空。
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
            // 操作按钮区
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                // 复制结果到剪贴板
                TextButton(
                  onPressed: () {
                    Navigator.of(context).clipboard.writeText(result);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('已复制到剪贴板')),
                    );
                  },
                  child: const Text('复制'),
                ),
                // 清空当前结果
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

  /// 构建错误卡片，可关闭清空状态。
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
            // 关闭并清空错误状态
            TextButton(
              onPressed: () => ref.read(aiProviderState.notifier).clearResult(),
              child: const Text('关闭'),
            ),
          ],
        ),
      ),
    );
  }

  /// 将风格标识映射为中文标签。
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