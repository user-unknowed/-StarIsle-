import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { Header } from '../../components/common/Header';
import { Send, Sparkles, Shield, BookOpen } from 'lucide-react';

const professionalTopics = [
  { id: 'pt1', title: '学生情绪波动分析', category: '分析' },
  { id: 'pt2', title: '班级心理状态评估', category: '评估' },
  { id: 'pt3', title: '如何与学生沟通', category: '技巧' },
  { id: 'pt4', title: '常见心理问题识别', category: '知识' },
  { id: 'pt5', title: '危机干预建议', category: '干预' },
];

export default function TeacherChat() {
  const user = useAuthStore((state) => state.user);
  const {
    messages,
    isTyping,
    inputValue,
    fetchMessages,
    sendMessage,
    selectTopic,
    setInputValue,
  } = useChatStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchMessages(user.id);
    }
  }, [user, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (inputValue.trim() && user) {
      await sendMessage(user.id, inputValue.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <Header role="teacher" />
      
      <main className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden h-[calc(100vh-8rem)] flex flex-col">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold">专业心理咨询助手</h2>
                <p className="text-sm text-indigo-200">教师专用 - 提供专业的心理辅导建议</p>
              </div>
            </div>
          </div>

          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                <Shield className="w-12 h-12 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">你好，{user?.nickname}</h3>
              <p className="text-gray-500 text-center mb-8">作为专业心理咨询助手，我可以帮助您分析学生的心理状态，提供专业的辅导建议。</p>
              
              <div className="w-full max-w-md">
                <p className="text-sm text-gray-600 mb-3">试试这些专业话题：</p>
                <div className="grid grid-cols-2 gap-3">
                  {professionalTopics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => selectTopic({ id: topic.id, title: topic.title, category: topic.category })}
                      className="text-left p-3 bg-gray-50 hover:bg-purple-50 rounded-xl transition-colors border border-gray-100"
                    >
                      <span className="text-xs text-purple-500 mb-1 block">{topic.category}</span>
                      <span className="text-sm text-gray-700 font-medium">{topic.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {message.role === 'assistant' && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          专业助手
                        </span>
                      )}
                      {message.role === 'user' && (
                        <span className="text-xs text-gray-500">{user?.nickname}</span>
                      )}
                    </div>
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${message.role === 'user' ? 'order-1 ml-2' : 'order-2 mr-2'}`}>
                    {message.role === 'user' ? (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">{user?.nickname?.[0]}</span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入您的问题，获取专业的心理咨询建议..."
                  rows={1}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  inputValue.trim()
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg'
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