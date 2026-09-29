import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// 知识库 Tab - 心理科普文章 + 标准心理量表
///
/// 通过 RAG 检索，结合用户状态推荐适合的文章。
/// 内置 PHQ-9、GAD-7、CD-RISC 等量表，结果以"关注方向"呈现（不贴标签）。
class KnowledgeTabScreen extends StatefulWidget {
  final String userId;

  const KnowledgeTabScreen({super.key, required this.userId});

  @override
  State<KnowledgeTabScreen> createState() => _KnowledgeTabScreenState();
}

class _KnowledgeTabScreenState extends State<KnowledgeTabScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('心理知识库'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [Tab(text: '文章'), Tab(text: '心理小测')],
          labelColor: const Color(0xFF6C8CD5),
          unselectedLabelColor: Colors.grey,
          indicatorColor: const Color(0xFF6C8CD5),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          ArticlesScreen(userId: widget.userId),
          AssessmentsScreen(userId: widget.userId),
        ],
      ),
    );
  }
}

// ==================== 文章列表 ====================

class ArticlesScreen extends StatefulWidget {
  final String userId;

  const ArticlesScreen({super.key, required this.userId});

  @override
  State<ArticlesScreen> createState() => _ArticlesScreenState();
}

class _ArticlesScreenState extends State<ArticlesScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<dynamic> _articles = [];
  bool _loading = true;
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    _loadRecommendations();
  }

  Future<void> _loadRecommendations() async {
    setState(() => _loading = true);
    try {
      final recs = await ApiService.getRecommendations(widget.userId);
      setState(() => _articles = recs);
    } catch (_) {
      setState(() => _articles = []);
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _search() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      _loadRecommendations();
      return;
    }
    setState(() {
      _loading = true;
      _isSearching = true;
    });
    try {
      final results = await ApiService.searchKnowledge(query);
      setState(() => _articles = results);
    } catch (_) {
      setState(() => _articles = []);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: '搜索心理知识…',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none,
                    ),
                    filled: true,
                    fillColor: Colors.grey[100],
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onSubmitted: (_) => _search(),
                ),
              ),
              if (_isSearching)
                TextButton(
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _isSearching = false);
                    _loadRecommendations();
                  },
                  child: const Text('取消'),
                ),
            ],
          ),
        ),
        if (_isSearching)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                '搜索结果',
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                '✨ 为你推荐',
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
            ),
          ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _articles.isEmpty
                  ? const Center(child: Text('暂无内容，试试搜索其他关键词～'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _articles.length,
                      itemBuilder: (context, index) {
                        final article = _articles[index];
                        return _ArticleCard(article: article, userId: widget.userId);
                      },
                    ),
        ),
      ],
    );
  }
}

class _ArticleCard extends StatelessWidget {
  final dynamic article;
  final String userId;

  const _ArticleCard({required this.article, required this.userId});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ArticleDetailScreen(
              articleId: article['id'] ?? '',
              title: article['title'] ?? '',
            ),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                article['title'] ?? '无题',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                article['content_preview'] ?? article['content'] ?? '',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                children: [
                  if (article['category'] != null)
                    _tag(article['category'], const Color(0xFF6C8CD5)),
                  ...(article['tags'] ?? []).take(2).map<Widget>(
                        (t) => _tag(t.toString(), Colors.grey),
                      ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _tag(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity( 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(text, style: TextStyle(color: color, fontSize: 11)),
    );
  }
}

class ArticleDetailScreen extends StatefulWidget {
  final String articleId;
  final String title;

  const ArticleDetailScreen({super.key, required this.articleId, required this.title});

  @override
  State<ArticleDetailScreen> createState() => _ArticleDetailScreenState();
}

class _ArticleDetailScreenState extends State<ArticleDetailScreen> {
  Map<String, dynamic>? _article;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final detail = await ApiService.getKnowledgeDetail(widget.articleId);
      setState(() => _article = detail);
    } catch (_) {}
    finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('文章详情')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.title,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  if (_article != null && _article!['source'] != null)
                    Text('来源：${_article!['source']}', style: TextStyle(color: Colors.grey, fontSize: 13)),
                  const SizedBox(height: 20),
                  Text(
                    _article?['content'] ?? '内容加载中…',
                    style: const TextStyle(fontSize: 15, height: 1.8),
                  ),
                ],
              ),
            ),
    );
  }
}

// ==================== 心理量表 ====================

class AssessmentsScreen extends StatefulWidget {
  final String userId;

  const AssessmentsScreen({super.key, required this.userId});

  @override
  State<AssessmentsScreen> createState() => _AssessmentsScreenState();
}

class _AssessmentsScreenState extends State<AssessmentsScreen> {
  List<dynamic> _assessments = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = await ApiService.listAssessments();
      setState(() => _assessments = list);
    } catch (_) {}
    finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _loading
        ? const Center(child: CircularProgressIndicator())
        : ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: _assessments.length,
            itemBuilder: (context, index) {
              final asm = _assessments[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  title: Text(asm['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(asm['description'] ?? '', style: TextStyle(color: Colors.grey[600])),
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => AssessmentDetailScreen(
                        assessmentId: asm['id'],
                        userId: widget.userId,
                      ),
                    ),
                  ),
                ),
              );
            },
          );
  }
}

class AssessmentDetailScreen extends StatefulWidget {
  final String assessmentId;
  final String userId;

  const AssessmentDetailScreen({super.key, required this.assessmentId, required this.userId});

  @override
  State<AssessmentDetailScreen> createState() => _AssessmentDetailScreenState();
}

class _AssessmentDetailScreenState extends State<AssessmentDetailScreen> {
  Map<String, dynamic>? _assessment;
  final Map<int, int> _answers = {};
  bool _loading = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final detail = await ApiService.getAssessment(widget.assessmentId);
      setState(() => _assessment = detail);
    } catch (_) {}
    finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    if (_assessment == null) return;
    final questions = _assessment!['questions'] as List;
    if (_answers.length != questions.length) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请完成所有题目再提交哦～')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      final answers = questions.map((q) {
        return {'question_id': q['id'], 'value': _answers[q['id']]};
      }).toList();
      final result = await ApiService.submitAssessment(
        userId: widget.userId,
        assessmentId: widget.assessmentId,
        answers: answers,
      );
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => AssessmentResultScreen(result: result),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('提交失败，请稍后再试')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('心理小测')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final questions = _assessment!['questions'] as List;
    final options = _assessment!['options'] as List;

    return Scaffold(
      appBar: AppBar(title: Text(_assessment!['name'] ?? '心理小测')),
      body: Column(
        children: [
          if (_assessment!['instructions'] != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              color: const Color(0xFF6C8CD5).withOpacity( 0.05),
              child: Text(_assessment!['instructions'], style: TextStyle(color: Colors.grey[700])),
            ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: questions.length,
              itemBuilder: (context, index) {
                final q = questions[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${index + 1}. ${q['text']}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 12),
                      ...options.map<Widget>((opt) {
                        final selected = _answers[q['id']] == opt['value'];
                        return RadioListTile<int>(
                          value: opt['value'],
                          groupValue: _answers[q['id']],
                          title: Text(opt['label']),
                          activeColor: const Color(0xFF6C8CD5),
                          onChanged: (v) => setState(() => _answers[q['id']] = v!),
                        );
                      }),
                    ],
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6C8CD5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _submitting
                    ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                    : const Text('提交', style: TextStyle(fontSize: 16)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class AssessmentResultScreen extends StatelessWidget {
  final Map<String, dynamic> result;

  const AssessmentResultScreen({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    final needsCrisis = result['needs_crisis_intervention'] ?? false;
    return Scaffold(
      appBar: AppBar(title: const Text('测评结果')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('你的结果', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: needsCrisis
                    ? Colors.red.withOpacity( 0.08)
                    : const Color(0xFF6C8CD5).withOpacity( 0.08),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    result['focus'] ?? '',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, height: 1.6),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    result['suggestion'] ?? '',
                    style: TextStyle(color: Colors.grey[700], height: 1.6),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Text('得分：${result['total_score']} / ${result['max_score']}',
                style: TextStyle(color: Colors.grey[600])),
            if (needsCrisis) ...[
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('如果你现在很难受，请记得：', style: TextStyle(fontWeight: FontWeight.bold)),
                    SizedBox(height: 8),
                    Text('• 拨打 12355 青少年服务热线'),
                    Text('• 拨打 400-161-9995 希望24热线'),
                    Text('• 告诉一个你信任的人'),
                    Text('你值得被好好对待，有人可以帮到你。'),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6C8CD5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('返回'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
