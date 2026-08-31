/// @file ai_provider.dart
/// @description 教师端 AI 功能的 Riverpod 状态管理层，包含 [AIService] 注入、API Key 管理，
///              以及基于 [AiStateNotifier] 的文章生成、内容摘要、风格转换与话题分析等异步状态流转。
/// @module teacher-app/providers/ai

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/ai_service.dart';

/// AI 服务 Provider，全局单例注入 [AIService] 实例。
final aiServiceProvider = Provider<AIService>((ref) {
  return AIService();
});

/// AI API Key 状态 Provider，默认为空字符串。
final aiApiKeyProvider = StateProvider<String>((ref) => '');

/// AI 状态 Provider，对外暴露 [AiState]，由 [AiStateNotifier] 维护。
final aiProviderState = StateNotifierProvider<AiStateNotifier, AiState>((ref) {
  return AiStateNotifier(ref.read(aiServiceProvider));
});

/// AI 功能状态数据类。
///
/// 描述当前 AI 操作的加载态、结果、错误信息与正在执行的动作名称。
class AiState {
  /// 是否正在加载。
  final bool isLoading;

  /// 操作结果文本，可为空。
  final String? result;

  /// 错误信息，可为空。
  final String? error;

  /// 当前正在执行的动作标识（如 generateArticle、summarizeContent 等）。
  final String currentAction;

  /// 构造 AI 状态实例。
  ///
  /// 参数：
  /// - [isLoading]：是否加载中，默认 false；
  /// - [result]：结果文本，可空；
  /// - [error]：错误信息，可空；
  /// - [currentAction]：当前动作名，默认空字符串。
  AiState({
    this.isLoading = false,
    this.result,
    this.error,
    this.currentAction = '',
  });

  /// 复制并部分更新状态。
  ///
  /// 参数：
  /// - [isLoading]、[result]、[error]、[currentAction]：需更新的字段，未传入则保留原值。
  ///
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

/// AI 状态管理器，基于 [StateNotifier] 维护 [AiState]。
///
/// 封装文章生成、内容摘要、风格转换、话题分析等异步操作的加载/成功/失败状态流转。
class AiStateNotifier extends StateNotifier<AiState> {
  /// 注入的 AI 服务实例。
  final AIService _aiService;

  /// 构造状态管理器。
  ///
  /// 参数：
  /// - [_aiService]：负责实际 AI 调用的服务实例。
  AiStateNotifier(this._aiService) : super(AiState());

  /// 设置 AI API Key。
  ///
  /// 参数：
  /// - [apiKey]：API Key 字符串。
  void setApiKey(String apiKey) {
    _aiService.setApiKey(apiKey);
  }

  /// 生成文章。
  ///
  /// 参数：
  /// - [topic]：文章主题；
  /// - [style]：可选文风；
  /// - [wordCount]：可选字数；
  /// - [additionalRequirements]：可选附加要求。
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
  /// - [content]：原文内容；
  /// - [summaryLength]：可选摘要长度；
  /// - [summaryType]：可选摘要类型。
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

  /// 转换文风。
  ///
  /// 参数：
  /// - [content]：原文内容；
  /// - [targetStyle]：目标文风。
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

  /// 话题分析。
  ///
  /// 参数：
  /// - [content]：待分析内容；
  /// - [includeSentiment]：是否包含情感分析，默认 true；
  /// - [includeKeywords]：是否包含关键词提取，默认 true；
  /// - [includeSuggestions]：是否包含建议，默认 true。
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

  /// 清空当前结果，重置为初始状态。
  void clearResult() {
    state = AiState();
  }
}
