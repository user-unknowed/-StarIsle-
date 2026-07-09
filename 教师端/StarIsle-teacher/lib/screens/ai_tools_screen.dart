import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/ai_provider.dart';

class AiToolsScreen extends ConsumerStatefulWidget {
  const AiToolsScreen({super.key});

  @override
  ConsumerState<AiToolsScreen> createState() => _AiToolsScreenState();
}

class _AiToolsScreenState extends ConsumerState<AiToolsScreen> {
  final _apiKeyController = TextEditingController();
  final _topicController = TextEditingController();
  final _contentController = TextEditingController();
  
  String _selectedStyle = 'professional';
  int _wordCount = 800;
  String _targetStyle = 'warm';
  
  final List<String> _styleOptions = [
    'professional',
    'casual',
    'warm',
    'humorous',
    'inspirational',
    'academic',
    'simple',
  ];

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

  @override
  Widget build(BuildContext context) {
    final aiState = ref.watch(aiProviderState);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI辅助工具'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => _showApiKeyDialog(context),
          ),
        ],
      ),
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
            
            if (aiState.isLoading)
              const Center(child: CircularProgressIndicator()),
            if (aiState.result != null)
              _buildResultCard(aiState.result!),
            if (aiState.error != null)
              _buildErrorCard(aiState.error!),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
    );
  }

  Widget _buildArticleGenerator() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _topicController,
              decoration: const InputDecoration(
                labelText: '文章主题',
                hintText: '请输入文章主题或关键词',
              ),
            ),
            const SizedBox(height: 12),
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

  Widget _buildSummarizer() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
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

  Widget _buildStyleConverter() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
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

  Widget _buildTopicAnalyzer() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
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
            SingleChildScrollView(
              child: Text(result),
            ),
            const SizedBox(height: 12),
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