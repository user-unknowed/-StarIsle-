import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Header } from '../../components/common/Header';
import { post } from '../../services/http';
import { ApiError } from '../../services/http';
import { Send, Sparkles, AlertCircle, AlertTriangle } from 'lucide-react';
import { EmergencyHelpButton } from '../../components/common/EmergencyHelpButton';
import { riskApi } from '../../services/api';
import type { ChatMessage } from '../../types';

const parentTopics = [
  { id: 't1', title: '孩子不愿意跟我说话怎么办', category: '沟通' },
  { id: 't2', title: '怎么判断孩子是否需要专业帮助', category: '评估' },
  { id: 't3', title: '青春期孩子情绪波动正常吗', category: '情绪' },
  { id: 't4', title: '发现孩子自伤怎么办', category: '危机' },
  { id: 't5', title: '如何跟孩子聊心理话题', category: '沟通' },
  { id: 't6', title: '家长自己压力大怎么调节', category: '自助' },
];

const mockReplies = [
  '大星理解您的担心。咱们慢慢来，先听听孩子的想法呢。',
  '您是很用心的家长。慢慢来，多给孩子安全感就好。',
  '保持稳定的家庭氛围。若您感觉孩子状态让您担忧，可寻求专业心理支持。',
  '请先确保孩子安全。可拨打 12355 或 400-161-9995 获取专业指导。咱们一起面对，慢慢来。',
];

const CRISIS_HOTLINES = [
  { name: '12355 青少年服务热线', number: '12355' },
  { name: '希望24热线', number: '400-161-9995' },
  { name: '北京心理危机干预中心', number: '010-82951332' },
];

interface ChatApiData {
  response?: string;
  riskLevel?: string;
  data?: { response?: string; riskLevel?: string };
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

    // 前端危机关键词检测
    const crisisKeywords = ['自伤', '自杀', '不想活', '想死', '结束生命'];
    if (crisisKeywords.some(kw => content.includes(kw))) {
      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        userId: user.id,
        content: '听到您的描述，大星非常关心您和孩子的安全。请立即拨打危机热线获取专业指导。',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        riskLevel: 'red',
      }]);
      return;
    }

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
        const riskLevel = (data && (data.riskLevel || data.data?.riskLevel)) as string | undefined;
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            userId: user.id,
            content: reply,
            role: 'assistant',
            timestamp: new Date().toISOString(),
            riskLevel,
          },
        ]);
        setIsUsingMock(false);

        // 如果检测到高风险，展示风险提示
        if (riskLevel === 'red' || riskLevel === 'orange') {
          try {
            await riskApi.reportCrisis({ userId: user.id, riskLevel, triggerType: 'chat' });
          } catch {
            // 上报失败不影响主流程
          }
        }
      } else {
        throw new Error('响应缺少回复内容');
      }
    } catch (err) {
      // 降级到 mock 回复
      const isNetError =
        err instanceof ApiError && (err.status === 0 || err.status >= 500);
      if (isNetError) {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <Header role="parent" />
      <EmergencyHelpButton />

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
                      onClick={() => {
                        if (t.id === 't4') {
                          // 危机话题：弹出提示而非直接填入
                          setMessages((prev) => [...prev, {
                            id: `system-${Date.now()}`,
                            userId: user?.id || '',
                            content: '如果您发现孩子有自伤倾向，请立即拨打危机热线：12355 / 400-161-9995 / 010-82951332。您不是一个人在面对，大星在这里陪您。',
                            role: 'assistant',
                            timestamp: new Date().toISOString(),
                            riskLevel: 'red',
                          }]);
                        } else {
                          setInputValue(t.title);
                        }
                      }}
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
                      {message.role === 'assistant' && (message.riskLevel === 'red' || message.riskLevel === 'orange') && (
                        <div className={`mt-2 p-2 rounded-xl flex items-center gap-2 ${message.riskLevel === 'red' ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
                          <p className="text-xs text-red-600 font-medium">
                            检测到风险信号，请点击右下角紧急帮助按钮获取支持
                          </p>
                        </div>
                      )}
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
                onKeyDown={handleKeyDown}
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
