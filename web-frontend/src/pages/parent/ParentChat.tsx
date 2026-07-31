import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Header } from '../../components/common/Header';
import { post } from '../../services/http';
import { ApiError } from '../../services/http';
import { Send, Sparkles, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '../../types';

const parentTopics = [
  { id: 't1', title: '孩子最近情绪低落怎么办？', category: '情绪' },
  { id: 't2', title: '如何与青春期孩子沟通', category: '沟通' },
  { id: 't3', title: '孩子不愿意上学', category: '学业' },
  { id: 't4', title: '发现孩子有自伤倾向', category: '危机' },
];

const mockReplies = [
  '大星理解您的担心。青春期的孩子情绪波动较大，建议先冷静倾听孩子的想法，避免说教。可以尝试在孩子情绪平稳时，一起做一些轻松的活动。',
  '您能注意到孩子的变化，说明您是很用心的家长。建议多给孩子安全感，表达「无论发生什么，我都支持你」。如情况持续，可寻求专业心理帮助。',
  '听到您的描述，大星建议：1) 保持稳定的家庭氛围；2) 不过度追问，给孩子空间；3) 若出现持续低落、失眠等情况，及时联系学校心理老师或专业机构。',
  '这种情况下，请先确保孩子的安全。您可以拨打 12355 青少年服务热线获取专业指导，必要时带孩子到精神卫生中心评估。您不是一个人在面对。',
];

interface ChatApiData {
  response?: string;
  data?: { response?: string };
  [key: string]: unknown;
}

export default function ParentChat() {
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || !user || isTyping) return;

    setError(null);
    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      userId: user.id,
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // 对接后端 /api/v1/chat/message（role=parent）
      const data = await post<ChatApiData>('/v1/chat/message', {
        userId: user.id,
        message: content,
        messageType: 'parent',
      });
      const reply =
        (data && (data.response || data.data?.response)) as string | undefined;

      if (reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            userId: user.id,
            content: reply,
            role: 'assistant',
            timestamp: new Date().toISOString(),
          },
        ]);
        setIsUsingMock(false);
      } else {
        throw new Error('响应缺少回复内容');
      }
    } catch (err) {
      // 降级到 mock 回复
      const isNetError =
        err instanceof ApiError && (err.status === 0 || err.status >= 500);
      if (isNetError || err instanceof Error) {
        setIsUsingMock(true);
        await new Promise((r) => setTimeout(r, 1200));
        const reply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            userId: user.id,
            content: reply,
            role: 'assistant',
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setError('发送失败，请稍后重试');
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <Header role="parent" />

      <main className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden h-[calc(100vh-8rem)] flex flex-col">
          {/* 顶部 */}
          <div className="bg-gradient-to-r from-[#F4A261] to-[#E76F51] p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">大星</h2>
                <p className="text-sm text-orange-100">AI心理顾问 · 专注家长咨询</p>
              </div>
            </div>
          </div>

          {isUsingMock && (
            <div className="px-5 py-2 bg-amber-50 text-amber-700 text-xs flex items-center gap-2 border-b border-amber-100">
              <AlertCircle className="w-4 h-4" />
              后端未连接，当前为示例回复
            </div>
          )}

          {/* 消息区 */}
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center mb-6">
                <Sparkles className="w-12 h-12 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">您好，我是大星</h3>
              <p className="text-gray-500 text-center mb-8">
                专注为您解答孩子心理与亲子沟通的困惑，有什么想聊的吗？
              </p>
              <div className="w-full max-w-md">
                <p className="text-sm text-gray-600 mb-3">常见话题：</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {parentTopics.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setInputValue(t.title)}
                      className="text-left p-3 bg-gray-50 hover:bg-orange-50 rounded-xl transition-colors border border-gray-100"
                    >
                      <span className="text-xs text-orange-500 mb-1 block">{t.category}</span>
                      <span className="text-sm text-gray-700 font-medium">{t.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {message.role === 'assistant' && (
                        <span className="text-xs text-gray-500">大星</span>
                      )}
                      {message.role === 'user' && (
                        <span className="text-xs text-gray-500">{user?.nickname}</span>
                      )}
                    </div>
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-[#F4A261] to-[#E76F51] text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                      message.role === 'user' ? 'order-1 ml-2' : 'order-2 mr-2'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">{user?.nickname?.[0]}</span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-[#F4A261] to-[#E76F51] rounded-full flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {error && (
            <div className="mx-4 mb-2 p-3 bg-danger-50 border border-danger-200 rounded-xl text-danger-600 text-sm">
              {error}
            </div>
          )}

          {/* 输入区 */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-end gap-3">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入您想咨询的内容..."
                rows={1}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  inputValue.trim() && !isTyping
                    ? 'bg-gradient-to-r from-[#F4A261] to-[#E76F51] text-white hover:shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
