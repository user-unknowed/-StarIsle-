/// @file ai_provider.dart
/// @description 学生端 AI 能力的 Riverpod 状态管理层，提供 AIService 实例、API Key 与
///              AI 状态管理（[AiState] / [AiStateNotifier]），覆盖文章生成、内容摘要、风格转换、主题分析等操作。
/// @module student-app/providers

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/ai_service.dart';

/// AI 服务实例 Provider，全局共享单个 [AIService]。
final aiServiceProvider = Provider<AIService>((ref) {
  return AIService();
});

/// AI API Key 状态 Provider，存储当前用户配置的密钥。
final aiApiKeyProvider = StateProvider<String>((ref) => '');

/// AI 状态管理 Provider，绑定 [AiStateNotifier] 与 [AiState]。
final aiProviderState = StateNotifierProvider<AiStateNotifier, AiState>((ref) {
  return AiStateNotifier(ref.read(aiServiceProvider));
});

/// AI 状态的不可变数据模型。
///
/// 字段说明：
/// - [isLoading]：是否正在执行异步 AI 操作；
/// - [result]：最近一次操作的结果文本（可为空）；
/// - [error]：最近一次操作的错误信息（可为空）；
/// - [currentAction]：当前操作类型标识（如 generateArticle）。
class AiState {
  final bool isLoading; // 是否加载中
  final String? result; // 操作结果
  final String? error; // 错误信息
  final String currentAction; // 当前操作类型

  /// 构造函数，提供默认值。
  AiState({
    this.isLoading = false,
    this.result,
    this.error,
    this.currentAction = '',
  });

  /// 复制并部分更新状态字段。
  ///
  /// 参数：任意可选字段的新值，未传入则保留原值。
  /// 返回：更新后的新 [AiState] 实例。
  AiState copyWith({
    bool? isLoading,
    String? result,
    String? error,
    String? currentAction,
  }) {
    return AiState(
      isLoading: isLoading ?? this.isLoading,
      result: result ?? this.result,
      error: error ?? this.error,
      currentAction: currentAction ?? this.currentAction,
    );
  }
}

/// AI 状态通知器，封装对 [AIService] 的调用并维护 [AiState]。
///
/// 通过 [StateNotifier] 暴露给 UI，统一处理加载态、结果与错误。
class AiStateNotifier extends StateNotifier<AiState> {
  // 底层 AI 服务实例
  final AIService _aiService;

  /// 构造函数，注入 [AIService] 并初始化空状态。
  AiStateNotifier(this._aiService) : super(AiState());

  /// 设置 API Key 到底层服务。
  ///
  /// 参数：
  /// - [apiKey]：用户输入的 API 密钥。
  void setApiKey(String apiKey) {
    _aiService.setApiKey(apiKey);
  }

  /// 生成文章。
  ///
  /// 参数：
  /// - [topic]：文章主题（必填）；
  /// - [style]：可选的写作风格；
  /// - [wordCount]：可选的字数要求；
  /// - [additionalRequirements]：可选的额外要求。
  ///
  /// 操作完成后更新 [state] 的 result 或 error。
  Future<void> generateArticle({
    required String topic,
    String? style,
    int? wordCount,
    String? additionalRequirements,
  }) async {
    state = state.copyWith(isLoading: true, currentAction: 'generateArticle', error: null);
    try {
      final result = await _aiService.generateArticle(
        topic: topic,
        style: style,
        wordCount: wordCount,
        additionalRequirements: additionalRequirements,
      );
      state = state.copyWith(isLoading: false, result: result);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// 摘要内容。
  ///
  /// 参数：
  /// - [content]：待摘要的原文（必填）；
  /// - [summaryLength]：可选的摘要长度；
  /// - [summaryType]：可选的摘要类型。
  Future<void> summarizeContent({
    required String content,
    int? summaryLength,
    String? summaryType,
  }) async {
    state = state.copyWith(isLoading: true, currentAction: 'summarizeContent', error: null);
    try {
      final result = await _aiService.summarizeContent(
        content: content,
        summaryLength: summaryLength,
        summaryType: summaryType,
      );
      state = state.copyWith(isLoading: false, result: result);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// 风格转换。
  ///
  /// 参数：
  /// - [content]：原文内容（必填）；
  /// - [targetStyle]：目标风格（必填）。
  Future<void> convertStyle({
    required String content,
    required String targetStyle,
  }) async {
    state = state.copyWith(isLoading: true, currentAction: 'convertStyle', error: null);
    try {
      final result = await _aiService.convertStyle(
        content: content,
        targetStyle: targetStyle,
      );
      state = state.copyWith(isLoading: false, result: result);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// 主题分析。
  ///
  /// 参数：
  /// - [content]：待分析内容（必填）；
  /// - [includeSentiment]：是否包含情感分析；
  /// - [includeKeywords]：是否包含关键词提取；
  /// - [includeSuggestions]：是否包含建议。
  Future<void> analyzeTopic({
    required String content,
    bool includeSentiment = true,
    bool includeKeywords = true,
    bool includeSuggestions = true,
  }) async {
    state = state.copyWith(isLoading: true, currentAction: 'analyzeTopic', error: null);
    try {
      final result = await _aiService.analyzeTopic(
        content: content,
        includeSentiment: includeSentiment,
        includeKeywords: includeKeywords,
        includeSuggestions: includeSuggestions,
      );
      state = state.copyWith(isLoading: false, result: result);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// 清空当前结果，将状态重置为初始空状态。
  void clearResult() {
    state = AiState();
  }
}
