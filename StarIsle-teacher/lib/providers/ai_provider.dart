import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/ai_service.dart';

final aiServiceProvider = Provider<AIService>((ref) {
  return AIService();
});

final aiApiKeyProvider = StateProvider<String>((ref) => '');

final aiProviderState = StateNotifierProvider<AiStateNotifier, AiState>((ref) {
  return AiStateNotifier(ref.read(aiServiceProvider));
});

class AiState {
  final bool isLoading;
  final String? result;
  final String? error;
  final String currentAction;

  AiState({
    this.isLoading = false,
    this.result,
    this.error,
    this.currentAction = '',
  });

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

class AiStateNotifier extends StateNotifier<AiState> {
  final AIService _aiService;

  AiStateNotifier(this._aiService) : super(AiState());

  void setApiKey(String apiKey) {
    _aiService.setApiKey(apiKey);
  }

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

  void clearResult() {
    state = AiState();
  }
}