/**
 * @file StudentCommunity.tsx
 * @description 学生端树人互助页：求助帖列表、发帖、帖子详情与回复，与 App 端树人互助功能对齐
 * @module web-frontend/pages/student
 */
import { useEffect, useState } from 'react';
import { Header } from '../../components/common/Header';
import { communityApi, type CommunityPost, type CommunityReply } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Users, Plus, MessageCircle, Clock, Send, Loader2, X, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui';
import { Modal } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

/** 帖子标签选项 */
const tagOptions = ['学习压力', '考试焦虑', '人际关系', '家庭关系', '情绪低落', '自我成长', '其他'];

/** 紧急程度配置 */
const urgencyConfig = [
  { level: 1, label: '一般', color: 'bg-green-100 text-green-600' },
  { level: 2, label: '较急', color: 'bg-yellow-100 text-yellow-600' },
  { level: 3, label: '紧急', color: 'bg-red-100 text-red-600' },
];

/** Mock 帖子数据（API 不可用时降级） */
const mockPosts: CommunityPost[] = [
  {
    id: 'p1', userId: 'u1', nickname: '小明', title: '期中考试压力好大，怎么办？',
    content: '马上要期中考试了，感觉复习不完，每天都很焦虑，晚上也睡不好。大家有什么好的方法吗？',
    tags: ['考试焦虑', '学习压力'], urgencyLevel: 2, replyCount: 5,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'p2', userId: 'u2', nickname: '阳光', title: '和室友闹矛盾了，很苦恼',
    content: '因为一些小事和室友吵架了，现在关系很僵，不知道该怎么开口和解。',
    tags: ['人际关系'], urgencyLevel: 1, replyCount: 3,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'p3', userId: 'u3', nickname: '夜行者', title: '最近总是情绪低落，提不起劲',
    content: '不知道为什么，最近对什么都没兴趣，也不想和人说话，感觉很累。',
    tags: ['情绪低落'], urgencyLevel: 2, replyCount: 8,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

/**
 * 学生端树人互助组件
 * @returns JSX 元素
 */
export default function StudentCommunity() {
  const user = useAuthStore((state) => state.user);
  const toast = useToast();

  // 帖子列表
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'api' | 'mock'>('mock');

  // 发帖弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newUrgency, setNewUrgency] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  // 帖子详情弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPost, setDetailPost] = useState<CommunityPost | null>(null);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  /** 加载帖子列表 */
  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await communityApi.getPosts(1, 20);
      const list = data.posts || [];
      if (list.length > 0) {
        setPosts(list);
        setSource('api');
      } else {
        setPosts(mockPosts);
        setSource('mock');
      }
    } catch {
      setPosts(mockPosts);
      setSource('mock');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  /** 格式化相对时间 */
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return `${min} 分钟前`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} 小时前`;
    const day = Math.floor(hr / 24);
    return `${day} 天前`;
  };

  /** 打开帖子详情 */
  const openDetail = async (post: CommunityPost) => {
    setDetailPost(post);
    setDetailOpen(true);
    setDetailLoading(true);
    setReplies([]);
    try {
      const data = await communityApi.getPost(post.id);
      setReplies(data.replies || []);
    } catch {
      // 降级 mock 回复
      setReplies([
        { id: 'r1', postId: post.id, userId: 'h1', nickname: '暖心帮帮者', content: '你好，我理解你的感受。这种时候可以试试深呼吸，把大任务拆成小步骤，一步一步来。你不是一个人在面对！', createdAt: new Date(Date.now() - 1800000).toISOString() },
        { id: 'r2', postId: post.id, userId: 'h2', nickname: '倾听者', content: '我之前也有类似的经历，后来发现保持规律作息很重要。如果压力持续很大，不妨找学校心理老师聊聊。', createdAt: new Date(Date.now() - 900000).toISOString() },
      ]);
    } finally {
      setDetailLoading(false);
    }
  };

  /** 提交新帖 */
  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('标题和内容不能为空');
      return;
    }
    setSubmitting(true);
    try {
      const post = await communityApi.createPost({
        userId: user?.id || 'student',
        title: newTitle,
        content: newContent,
        tags: newTags,
        urgencyLevel: newUrgency,
      });
      setPosts((prev) => [post, ...prev]);
      toast.success('发帖成功');
      setCreateOpen(false);
      setNewTitle(''); setNewContent(''); setNewTags([]); setNewUrgency(2);
    } catch {
      // 降级：本地添加 mock 帖子
      const mockPost: CommunityPost = {
        id: `p_${Date.now()}`, userId: user?.id || 'student', nickname: user?.nickname || '我',
        title: newTitle, content: newContent, tags: newTags, urgencyLevel: newUrgency,
        replyCount: 0, createdAt: new Date().toISOString(),
      };
      setPosts((prev) => [mockPost, ...prev]);
      toast.success('发帖成功');
      setCreateOpen(false);
      setNewTitle(''); setNewContent(''); setNewTags([]); setNewUrgency(2);
    } finally {
      setSubmitting(false);
    }
  };

  /** 提交回复 */
  const handleReply = async () => {
    if (!replyContent.trim() || !detailPost) return;
    setReplying(true);
    try {
      const reply = await communityApi.replyPost(detailPost.id, {
        userId: user?.id || 'student',
        content: replyContent,
      });
      setReplies((prev) => [...prev, reply]);
      setReplyContent('');
      toast.success('回复成功');
    } catch {
      // 降级：本地添加 mock 回复
      const mockReply: CommunityReply = {
        id: `r_${Date.now()}`, postId: detailPost.id,
        userId: user?.id || 'student', nickname: user?.nickname || '我',
        content: replyContent, createdAt: new Date().toISOString(),
      };
      setReplies((prev) => [...prev, mockReply]);
      setReplyContent('');
      toast.success('回复成功');
    } finally {
      setReplying(false);
    }
  };

  /** 切换标签 */
  const toggleTag = (tag: string) => {
    setNewTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <Header role="student" />

      <main id="main" className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* 标题与发帖按钮 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Users className="w-8 h-8 text-primary-600" />
              树人互助
            </h1>
            <p className="text-gray-500 mt-2">说出你的困扰，获得温暖的回应</p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-gradient-to-r from-primary-500 to-secondary-600"
          >
            <Plus className="w-5 h-5 mr-1" /> 发帖
          </Button>
        </div>

        {/* 数据来源标识 */}
        <div className="mb-4 flex items-center justify-end">
          <span className={`text-xs px-2 py-0.5 rounded-full ${source === 'api' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
            {source === 'api' ? 'API 数据' : '示例数据'}
          </span>
        </div>

        {/* 帖子列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> 加载中...
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const urgency = urgencyConfig.find((u) => u.level === post.urgencyLevel) || urgencyConfig[1];
              return (
                <div
                  key={post.id}
                  onClick={() => openDetail(post)}
                  className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all cursor-pointer border border-transparent hover:border-primary-200"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-bold text-gray-800 text-lg flex-1">{post.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${urgency.color}`}>
                      {urgency.label}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">{post.content}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded text-xs">{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center gap-4">
                      <span>{post.nickname}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{timeAgo(post.createdAt)}</span>
                    </div>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{post.replyCount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 发帖弹窗 */}
      <Modal isOpen={createOpen} onClose={() => !submitting && setCreateOpen(false)} title="发布求助帖" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="一句话描述你的困扰"
              maxLength={50}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="详细说说你的情况，大家会更好地帮助你"
              rows={5}
              maxLength={500}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
            />
            <p className="text-right text-xs text-gray-400 mt-1">{newContent.length}/500</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标签（可多选）</label>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    newTags.includes(t) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">紧急程度</label>
            <div className="flex gap-3">
              {urgencyConfig.map((u) => (
                <button
                  key={u.level}
                  onClick={() => setNewUrgency(u.level)}
                  className={`flex-1 py-2 rounded-xl border-2 transition-all ${
                    newUrgency === u.level ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200'
                  }`}
                >
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.color}`}>{u.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-xl text-sm text-yellow-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>如遇紧急心理危机，请立即拨打心理援助热线或联系学校心理老师。</span>
          </div>
          <Button
            onClick={handleCreatePost}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-primary-500 to-secondary-600"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-1" /> : null}
            {submitting ? '发布中...' : '发布'}
          </Button>
        </div>
      </Modal>

      {/* 帖子详情弹窗 */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="帖子详情" size="lg">
        {detailPost && (
          <div className="space-y-4">
            {/* 帖子内容 */}
            <div className="p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-800">{detailPost.nickname}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyConfig.find((u) => u.level === detailPost.urgencyLevel)?.color || urgencyConfig[1].color}`}>
                  {urgencyConfig.find((u) => u.level === detailPost.urgencyLevel)?.label || '较急'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{detailPost.title}</h2>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{detailPost.content}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {detailPost.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded text-xs">{t}</span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">{timeAgo(detailPost.createdAt)}</p>
            </div>

            {/* 回复列表 */}
            <div>
              <h3 className="font-bold text-gray-800 mb-3">回复 ({replies.length})</h3>
              {detailLoading ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载回复...
                </div>
              ) : replies.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">暂无回复，快来第一个回应吧</p>
              ) : (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {replies.map((r) => (
                    <div key={r.id} className="p-3 bg-white border border-gray-100 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-800 text-sm">{r.nickname}</span>
                        <span className="text-xs text-gray-400">{timeAgo(r.createdAt)}</span>
                      </div>
                      <p className="text-gray-600 text-sm">{r.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 回复输入 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                placeholder="写下你的回复..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
              <Button
                onClick={handleReply}
                disabled={replying || !replyContent.trim()}
                className="bg-gradient-to-r from-primary-500 to-secondary-600"
              >
                {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
