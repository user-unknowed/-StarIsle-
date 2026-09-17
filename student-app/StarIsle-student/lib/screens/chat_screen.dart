/// @file chat_screen.dart
/// @description 学生端聊天页面，与 AI 伙伴"小星"对话，展示消息气泡列表、话题引导卡片与输入区，
///              并集成紧急帮助入口。消息状态通过 [chatProvider] 异步加载。
/// @module student-app/screens

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/chat_provider.dart';
import '../widgets/message_bubble_widget.dart';
import '../widgets/topic_card_widget.dart';
import '../widgets/emergency_help_widget.dart';

/// 学生端聊天页面 Widget，与 AI 伙伴"小星"进行对话。
class ChatScreen extends ConsumerStatefulWidget {
  /// 构造函数。
  const ChatScreen({super.key});

  /// 创建 State 对象。
  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

/// [ChatScreen] 的 State，管理消息输入与列表滚动控制器。
class _ChatScreenState extends ConsumerState<ChatScreen> {
  // 消息输入框控制器
  final TextEditingController _messageController = TextEditingController();
  // 消息列表滚动控制器，用于发送后自动滚到底部
  final ScrollController _scrollController = ScrollController();

  /// 释放控制器资源。
  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  /// 发送当前输入框中的消息，并清空输入框、滚动到底部。
  void _sendMessage() {
    if (_messageController.text.trim().isEmpty) return;

    final message = _messageController.text.trim();
    // 通过 Provider 提交消息
    ref.read(chatProvider.notifier).sendMessage(message);
    _messageController.clear();

    // 滚动到列表底部，展示最新消息
    _scrollController.animateTo(
      _scrollController.position.maxScrollExtent,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    );
  }

  /// 构建页面主体。
  ///
  /// 监听 [chatProvider]，根据状态渲染消息列表、加载指示器或错误提示；
  /// 消息为空时显示话题引导卡片；底部为输入区与紧急帮助入口。
  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(chatProvider);

    return Scaffold(
      // 顶部 AppBar：标题"小星" + 更多入口
      appBar: AppBar(
        title: const Text('小星'),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert),
            onPressed: () {
              // TODO: 打开更多选项
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // 对话区域：依据 AsyncValue 状态渲染
          Expanded(
            child: chatState.when(
              // 数据就绪：渲染消息气泡列表
              data: (messages) => ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: messages.length,
                itemBuilder: (context, index) {
                  final message = messages[index];
                  return MessageBubbleWidget(message: message);
                },
              ),
              // 加载中
              loading: () => const Center(
                child: CircularProgressIndicator(),
              ),
              // 加载失败
              error: (error, stack) => Center(
                child: Text('加载失败: $error'),
              ),
            ),
          ),

          // 话题引导卡片（仅在无消息时显示）
          if (!chatState.hasValue || chatState.value!.isEmpty)
            const TopicCardWidget(),

          // 输入区域：紧急帮助 + 输入框 + 发送按钮
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              border: Border(
                top: BorderSide(
                  color: Theme.of(context).dividerColor,
                ),
              ),
            ),
            child: Row(
              children: [
                // 紧急帮助按钮
                const EmergencyHelpWidget(),

                const SizedBox(width: 8),

                // 消息输入框，回车即发送
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: '想跟小星说什么...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                    ),
                    maxLines: null,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),

                const SizedBox(width: 8),

                // 发送按钮
                IconButton(
                  icon: const Icon(Icons.send),
                  onPressed: _sendMessage,
                  style: IconButton.styleFrom(
                    backgroundColor: Theme.of(context).primaryColor,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}