import { useEffect, useState } from 'react';
import { useParentStore } from '../../store/parentStore';
import { Header } from '../../components/common/Header';
import { Button, Input, Modal, ToastContainer, useToast } from '../../components/ui';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserMinus,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

export default function ParentChildren() {
  const {
    children,
    isLoading,
    error,
    isUsingMockData,
    fetchChildren,
    bindChild,
    authorizeChild,
    unbindChild,
  } = useParentStore();

  const toast = useToast();
  const [showBindModal, setShowBindModal] = useState(false);
  const [bindStudentId, setBindStudentId] = useState('');
  const [bindNickname, setBindNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmUnbind, setConfirmUnbind] = useState<string | null>(null);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const handleBind = async () => {
    if (!bindStudentId.trim()) {
      toast.warning('请输入孩子ID');
      return;
    }
    setSubmitting(true);
    const result = await bindChild({
      studentId: bindStudentId.trim(),
      studentNickname: bindNickname.trim() || undefined,
      bindType: 'manual',
    });
    setSubmitting(false);
    if (result) {
      toast.success(`已绑定 ${result.studentNickname}（${isUsingMockData ? '示例' : 'API 返回'}）`);
      setShowBindModal(false);
      setBindStudentId('');
      setBindNickname('');
    } else {
      toast.error('绑定失败，请重试');
    }
  };

  const handleAuthorize = async (bindingId: string, nickname: string) => {
    await authorizeChild(bindingId);
    toast.success(`已授权 ${nickname} 的数据访问`);
  };

  const handleUnbind = async (bindingId: string, nickname: string) => {
    await unbindChild(bindingId);
    setConfirmUnbind(null);
    toast.success(`已解除与 ${nickname} 的绑定`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <Header role="parent" />
      <ToastContainer toasts={toast.toasts} />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-[#F4A261] to-[#E76F51] rounded-3xl p-6 mb-6 text-white shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">我的孩子</h1>
                <p className="text-orange-100 text-sm mt-1">管理已绑定的孩子与数据授权</p>
              </div>
            </div>
            <button
              onClick={() => setShowBindModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-xl hover:bg-orange-50 transition-colors font-medium"
            >
              <UserPlus className="w-5 h-5" />
              绑定孩子
            </button>
          </div>
          {isUsingMockData && (
            <p className="text-orange-200 text-xs mt-3">（后端未连接，展示示例数据）</p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-600 text-sm">
            {error}
          </div>
        )}

        {isLoading && children.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 shadow-lg text-center text-gray-400">
            加载中...
          </div>
        ) : children.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 shadow-lg text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">还没有绑定孩子</h3>
            <p className="text-gray-500 mb-6">绑定孩子后可查看其心情状态与告警信息</p>
            <Button onClick={() => setShowBindModal(true)} className="bg-gradient-to-r from-[#F4A261] to-[#E76F51]">
              <UserPlus className="w-5 h-5" />
              立即绑定
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {children.map((child) => (
              <div key={child.bindingId} className="bg-white rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center text-xl font-bold text-orange-600">
                    {child.studentNickname?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800">{child.studentNickname}</h3>
                      {child.authorized ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          已授权
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded-full">
                          <Clock className="w-3 h-3" />
                          待授权
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      孩子ID：{child.studentId}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      绑定时间：{new Date(child.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  {!child.authorized && (
                    <Button
                      size="sm"
                      onClick={() => handleAuthorize(child.bindingId, child.studentNickname)}
                      className="bg-gradient-to-r from-[#F4A261] to-[#E76F51]"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      授权访问
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmUnbind(child.bindingId)}
                    className="text-danger-500 border-danger-300 hover:bg-danger-50"
                  >
                    <UserMinus className="w-4 h-4" />
                    解除绑定
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 绑定孩子弹窗 */}
        <Modal
          isOpen={showBindModal}
          onClose={() => !submitting && setShowBindModal(false)}
          title="绑定孩子"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-orange-50 rounded-xl text-sm text-orange-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>请输入孩子的学生ID（可向孩子或老师索取），绑定后需完成授权才能查看数据。</span>
            </div>
            <Input
              label="孩子学生ID"
              value={bindStudentId}
              onChange={(e) => setBindStudentId(e.target.value)}
              placeholder="例如 student1"
              required
            />
            <Input
              label="孩子昵称（可选）"
              value={bindNickname}
              onChange={(e) => setBindNickname(e.target.value)}
              placeholder="例如 小明同学"
            />
            <Button
              onClick={handleBind}
              loading={submitting}
              className="w-full bg-gradient-to-r from-[#F4A261] to-[#E76F51]"
            >
              确认绑定
            </Button>
          </div>
        </Modal>

        {/* 解绑确认弹窗 */}
        <Modal
          isOpen={!!confirmUnbind}
          onClose={() => setConfirmUnbind(null)}
          title="确认解除绑定"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-600">解除绑定后将无法查看该孩子的状态与告警，确定继续吗？</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmUnbind(null)}>
                取消
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  const child = children.find((c) => c.bindingId === confirmUnbind);
                  if (child) handleUnbind(child.bindingId, child.studentNickname);
                }}
              >
                确认解绑
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
