import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useParentStore } from '../../store/parentStore';
import { Heart, MessageCircle, Send, ArrowLeft, Sparkles, AlertTriangle, ChevronRight } from 'lucide-react';

const chatTopics = [
  '孩子不愿意跟我说话怎么办',
  '怎么判断孩子是否需要专业帮助',
  '青春期孩子情绪波动正常吗',
  '发现孩子自伤怎么办',
  '如何跟孩子聊心理话题',
  '家长自己压力大怎么调节',
];

export default function ParentChat() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { chatMessages, sendChatMessage, fetchChatHistory, isLoading } = useParentStore();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) {
      fetchChatHistory(user.id);
    }
  }, [user?.id, fetchChatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !user?.id) return;
    
    await sendChatMessage(user.id, inputValue.trim());
    setInputValue('');
  };

  const handleTopicClick = async (topic: string) => {
    if (!user?.id) return;
    
    setInputValue(topic);
    await sendChatMessage(user.id, topic);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/parent')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-xl">
                大
              </div>
              <div>
                <p className="font-bold text-gray-800">大星 · AI心理顾问</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-500" />
                  大星在这里陪着你
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-6">
        <div className="space-y-4">
          {chatMessages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4">
                大
              </div>
              <h3 className="font-bold text-gray-800 mb-2">你好，我是大星</h3>
              <p className="text-gray-500 text-sm mb-6">慢慢来，一切都会好起来的。<br />大星很愿意听听你的想法。</p>
              
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-3">你可以试试这些话题：</p>
                <div className="grid grid-cols-2 gap-2">
                  {chatTopics.slice(0, 4).map((topic) => (
                    <button
                      key={topic}
                      onClick={() => handleTopicClick(topic)}
                      className="p-3 bg-gray-50 rounded-xl text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                }`}>
                  {message.role === 'user' ? user?.nickname?.[0] || 'P' : '大'}
                </div>
                <div className={`max-w-[75%] ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block px-4 py-2 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-white text-gray-800 rounded-tl-sm shadow-sm'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex-shrink-0 flex items-center justify-center text-white">
                大
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef}></div>
        </div>

        {chatMessages.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-3">更多话题：</p>
            <div className="flex flex-wrap gap-2">
              {chatTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleTopicClick(topic)}
                  className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                >
                  {topic}
                  <ChevronRight className="w-3 h-3 inline ml-1" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="和大星说说你的想法..."
                rows={1}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm max-h-32"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          <button 
            onClick={() => navigate('/parent')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <Heart className="w-6 h-6" />
            <span className="text-xs font-medium">首页</span>
          </button>
          <button 
            onClick={() => navigate('/parent/chat')}
            className="flex flex-col items-center gap-1 p-2 text-indigo-600"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-xs font-medium">聊一聊</span>
          </button>
          <button 
            onClick={() => navigate('/parent/profile')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <Heart className="w-6 h-6" />
            <span className="text-xs font-medium">我的</span>
          </button>
        </div>
      </nav>

      <div className="h-20"></div>
    </div>
  );
}