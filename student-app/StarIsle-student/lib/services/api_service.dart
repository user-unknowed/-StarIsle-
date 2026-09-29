import 'dart:convert';
import 'package:http/http.dart' as http;

/// API 服务层 - 封装对 Python AI 引擎后端的所有 HTTP 调用
///
/// 负责所有与后端的通信：AI 对话、情绪打卡、知识库检索、量表、社区、用户等。
/// 所有 API key 与模型调用均在后端完成，客户端不直接接触密钥。
class ApiService {
  static const String _baseUrl = 'http://10.0.2.2:8000'; // Android 模拟器访问本机

  // ==================== AI 对话 ====================

  /// 发送消息并获取 AI 回复（流式/非流式）
  static Future<Map<String, dynamic>> sendMessage({
    required String message,
    required List<Map<String, dynamic>> history,
    String? userId,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/chat'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'message': message,
        'context': history,
        'user_id': userId,
      }),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('对话请求失败: ${response.statusCode}');
  }

  /// 提交情绪打卡
  static Future<Map<String, dynamic>> checkInMood({
    required String userId,
    required String mood,
    required int intensity,
    String? note,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/mood/checkin'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'user_id': userId,
        'mood': mood,
        'intensity': intensity,
        'note': note,
      }),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('打卡失败: ${response.statusCode}');
  }

  /// 获取情绪打卡历史
  static Future<List<dynamic>> getMoodHistory(String userId) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/mood/history/$userId'),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body)['history'] ?? [];
    }
    return [];
  }

  // ==================== 知识库 ====================

  /// 搜索知识库文章
  static Future<List<dynamic>> searchKnowledge(String query, {int topK = 5}) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/knowledge/search'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'query': query, 'top_k': topK}),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body)['results'] ?? [];
    }
    return [];
  }

  /// 获取文章详情
  static Future<Map<String, dynamic>?> getKnowledgeDetail(String docId) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/knowledge/$docId'),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    return null;
  }

  /// 获取个性化推荐文章（RAG）
  static Future<List<dynamic>> getRecommendations(String userId, {String contextHint = ''}) async {
    final url = contextHint.isNotEmpty
        ? '$_baseUrl/knowledge/recommend/$userId?context_hint=${Uri.encodeComponent(contextHint)}'
        : '$_baseUrl/knowledge/recommend/$userId';
    final response = await http.get(Uri.parse(url));
    if (response.statusCode == 200) {
      return jsonDecode(response.body)['recommendations'] ?? [];
    }
    return [];
  }

  // ==================== 量表 ====================

  /// 获取量表列表
  static Future<List<dynamic>> listAssessments() async {
    final response = await http.get(Uri.parse('$_baseUrl/assessments'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body)['assessments'] ?? [];
    }
    return [];
  }

  /// 获取量表详情
  static Future<Map<String, dynamic>?> getAssessment(String id) async {
    final response = await http.get(Uri.parse('$_baseUrl/assessments/$id'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    return null;
  }

  /// 提交量表答案
  static Future<Map<String, dynamic>> submitAssessment({
    required String userId,
    required String assessmentId,
    required List<Map<String, dynamic>> answers,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/assessments/submit'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'user_id': userId,
        'assessment_id': assessmentId,
        'answers': answers,
      }),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('提交失败: ${response.statusCode}');
  }

  // ==================== 社区 ====================

  /// 获取求助帖列表
  static Future<Map<String, dynamic>> getPosts({int page = 1, int pageSize = 20}) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/community/posts?page=$page&page_size=$pageSize'),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    return {'posts': [], 'total': 0};
  }

  /// 创建求助帖
  static Future<Map<String, dynamic>> createPost({
    required String userId,
    required String title,
    required String content,
    required List<String> tags,
    int urgencyLevel = 2,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/community/posts'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'user_id': userId,
        'title': title,
        'content': content,
        'tags': tags,
        'urgency_level': urgencyLevel,
      }),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('发帖失败: ${response.statusCode}');
  }

  /// 获取帖子详情
  static Future<Map<String, dynamic>?> getPost(String postId) async {
    final response = await http.get(Uri.parse('$_baseUrl/community/posts/$postId'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    return null;
  }

  /// 回复帖子
  static Future<Map<String, dynamic>> replyPost({
    required String postId,
    required String userId,
    required String content,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/community/posts/$postId/reply'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'user_id': userId, 'content': content}),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('回复失败: ${response.statusCode}');
  }

  // ==================== 用户 ====================

  /// 注册
  static Future<Map<String, dynamic>> register({
    required String username,
    required String nickname,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/user/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'nickname': nickname,
        'password': password,
      }),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('注册失败: ${response.body}');
  }

  /// 登录
  static Future<Map<String, dynamic>> login({
    required String username,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/user/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('登录失败: ${response.body}');
  }

  /// 获取资料
  static Future<Map<String, dynamic>?> getProfile(String userId) async {
    final response = await http.get(Uri.parse('$_baseUrl/user/profile/$userId'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    return null;
  }

  /// 更新资料
  static Future<Map<String, dynamic>> updateProfile({
    required String userId,
    String? nickname,
  }) async {
    final response = await http.put(
      Uri.parse('$_baseUrl/user/profile/$userId'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'nickname': nickname}),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('更新失败');
  }

  /// 申请帮帮者
  static Future<Map<String, dynamic>> applyHelper({
    required String userId,
    required String realName,
    required String qualification,
    required String description,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/user/helper/apply/$userId'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'real_name': realName,
        'qualification': qualification,
        'description': description,
      }),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('申请失败');
  }

  /// 帮帮者状态
  static Future<Map<String, dynamic>> getHelperStatus(String userId) async {
    final response = await http.get(Uri.parse('$_baseUrl/user/helper/status/$userId'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    return {'helper_status': 'none'};
  }

  // ==================== 紧急求助 ====================

  /// 获取紧急资源
  static Future<List<dynamic>> getEmergencyResources() async {
    final response = await http.get(Uri.parse('$_baseUrl/emergency/resources'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body)['resources'] ?? [];
    }
    return [];
  }

  /// 一键求助
  static Future<Map<String, dynamic>> requestHelp({
    required String userId,
    String reason = '',
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/emergency/help'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'user_id': userId, 'reason': reason}),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('求助失败');
  }

  // ==================== 投稿 ====================

  /// 创建投稿
  static Future<Map<String, dynamic>> createSubmission({
    required String userId,
    required String title,
    required String content,
    String type = 'article',
    String category = '',
    List<String> tags = const [],
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/submissions'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'user_id': userId,
        'title': title,
        'content': content,
        'submission_type': type,
        'category': category,
        'tags': tags,
      }),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('投稿失败');
  }

  /// 获取我的投稿列表
  static Future<List<dynamic>> getMySubmissions(String userId) async {
    final response = await http.get(Uri.parse('$_baseUrl/submissions/mine/$userId'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body)['submissions'] ?? [];
    }
    return [];
  }

  // ==================== 管理员 ====================

  /// 获取待审核的帮帮者申请列表
  static Future<List<dynamic>> getHelperApplications() async {
    final response = await http.get(Uri.parse('$_baseUrl/admin/helper/applications'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body)['applications'] ?? [];
    }
    return [];
  }

  /// 审核帮帮者申请
  static Future<Map<String, dynamic>> reviewHelper({
    required String userId,
    required bool approved,
    String note = '',
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/admin/helper/review/$userId'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'approved': approved, 'note': note}),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('审核失败');
  }

  /// 获取待审核投稿列表
  static Future<List<dynamic>> getPendingSubmissions() async {
    final response = await http.get(Uri.parse('$_baseUrl/submissions/pending'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body)['submissions'] ?? [];
    }
    return [];
  }

  /// 审核投稿
  static Future<Map<String, dynamic>> reviewSubmission({
    required String submissionId,
    required bool approved,
    String note = '',
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/submissions/$submissionId/review'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'approved': approved, 'note': note}),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('审核失败');
  }
}
