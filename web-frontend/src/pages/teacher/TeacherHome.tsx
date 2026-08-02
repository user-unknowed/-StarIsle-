import { Fragment, useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useClassroomStore } from '../../store/classroomStore';
import { Header } from '../../components/common/Header';
import { riskApi } from '../../services/api';
import { ApiError } from '../../services/http';
import { BarChart3, AlertTriangle, Users, CheckCircle, TrendingUp, Eye, Download, Upload, ShieldAlert, Loader2 } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

interface RiskDetail {
  level: string;
  score?: number;
  reason?: string;
  history?: Array<{ date: string; level: string }>;
  source: 'api' | 'mock';
}

const getRiskColor = (level: string | undefined) => {
  switch (level) {
    case 'red': return 'bg-danger-100 text-danger-600 border-danger-200';
    case 'orange': return 'bg-warning-100 text-warning-600 border-warning-200';
    case 'yellow': return 'bg-warning-50 text-warning-700 border-warning-200';
    default: return 'bg-success-100 text-success-600 border-success-200';
  }
};

const getRiskLabel = (level: string | undefined) => {
  switch (level) {
    case 'red': return '高风险';
    case 'orange': return '中风险';
    case 'yellow': return '低风险';
    default: return '正常';
  }
};

const getMoodEmoji = (level: number | undefined) => {
  if (!level) return '❓';
  if (level <= 1) return '😔';
  if (level <= 2) return '😞';
  if (level <= 3) return '😐';
  if (level <= 4) return '😊';
  return '😄';
};

export default function TeacherHome() {
  const user = useAuthStore((state) => state.user);
  const { students, stats, fetchClassStats, fetchStudents } = useClassroomStore();
  const toast = useToast();

  // 高风险告警接入 riskApi.getLevel
  const [riskDetails, setRiskDetails] = useState<Record<string, RiskDetail | null>>({});
  const [riskLoadingId, setRiskLoadingId] = useState<string | null>(null);
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRiskLevel = async (studentId: string, fallbackLevel?: string) => {
    setRiskLoadingId(studentId);
    try {
      const data = await riskApi.getLevel(studentId);
      setRiskDetails((prev) => ({
        ...prev,
        [studentId]: {
          level: (data as { current_risk_level?: string; level?: string }).current_risk_level || data.level || fallbackLevel || 'green',
          history: (data as { history?: Array<{ date: string; level: string }> }).history,
          source: 'api',
        },
      }));
    } catch (err) {
      // 降级：使用学生列表中的风险等级
      if (err instanceof ApiError) {
        console.warn(`[TeacherHome] riskApi.getLevel 失败 (${err.status})，降级使用 mock`);
      }
      setRiskDetails((prev) => ({
        ...prev,
        [studentId]: {
          level: fallbackLevel || 'green',
          reason: '（后端不可用，展示学生列表风险等级）',
          history: [
            { date: '2026-07-12', level: fallbackLevel || 'green' },
            { date: '2026-07-13', level: fallbackLevel || 'green' },
            { date: '2026-07-14', level: fallbackLevel || 'green' },
          ],
          source: 'mock',
        },
      }));
    } finally {
      setRiskLoadingId(null);
    }
  };

  const toggleRiskDetail = (studentId: string, fallbackLevel?: string) => {
    if (expandedRiskId === studentId) {
      setExpandedRiskId(null);
      return;
    }
    setExpandedRiskId(studentId);
    if (!riskDetails[studentId]) {
      fetchRiskLevel(studentId, fallbackLevel);
    }
  };

  useEffect(() => {
    fetchClassStats('class1');
    fetchStudents('class1');
  }, [fetchClassStats, fetchStudents]);

  const renderRiskDetail = (detail: RiskDetail | null | undefined, loading: boolean) => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>加载风险详情中...</span>
        </div>
      );
    }
    if (!detail) {
      return <p className="text-sm text-gray-500">暂无风险详情数据</p>;
    }
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <ShieldAlert className="w-4 h-4 text-gray-600" />
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRiskColor(detail.level)}`}>
            {getRiskLabel(detail.level)}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${detail.source === 'api' ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-600'}`}>
            {detail.source === 'api' ? 'API 数据' : '示例数据'}
          </span>
        </div>
        {detail.reason && (
          <p className="text-sm text-gray-600">{detail.reason}</p>
        )}
        {detail.history && detail.history.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2">历史趋势</p>
            <div className="flex items-end gap-1">
              {detail.history.map((h) => (
                <div key={h.date} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-md ${getRiskColor(h.level).split(' ')[0]}`}
                    title={`${h.date} · ${getRiskLabel(h.level)}`}
                  />
                  <span className="text-[10px] text-gray-400">{h.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const alertStudents = students.filter(s => s.alert);
  const moodDistribution = [
    { level: 1, count: students.filter(s => s.latestMood === 1).length, label: '很低落', color: 'bg-danger-500' },
    { level: 2, count: students.filter(s => s.latestMood === 2).length, label: '有点低落', color: 'bg-warning-500' },
    { level: 3, count: students.filter(s => s.latestMood === 3).length, label: '一般般', color: 'bg-warning-300' },
    { level: 4, count: students.filter(s => s.latestMood === 4).length, label: '还不错', color: 'bg-primary-500' },
    { level: 5, count: students.filter(s => s.latestMood === 5).length, label: '很开心', color: 'bg-success-500' },
  ];
  const filteredStudents = students.filter(
    s => s.nickname.includes(searchQuery) || s.id.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-primary-50">
      <Header role="teacher" />

      <main id="main" className="pt-20 pb-8 px-4 max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-3xl p-6 mb-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">班级状态总览</h1>
              <p className="text-primary-200 mt-1">你好，{user?.nickname}，查看班级学生的心理健康状态</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => toast.info('功能开发中，敬请期待')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span>导入数据</span>
              </button>
              <button
                onClick={() => toast.info('功能开发中，敬请期待')}
                className="flex items-center gap-2 px-4 py-2 bg-white text-primary-600 rounded-xl hover:bg-primary-50 transition-colors font-medium"
              >
                <Download className="w-5 h-5" />
                <span>导出报告</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">班级人数</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.totalStudents || 0}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">平均心情</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.averageMood || 0}</p>
              </div>
              <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-secondary-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">今日打卡</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.todayCheckinCount || 0}</p>
              </div>
              <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">需关注</p>
                <p className="text-3xl font-bold text-danger-600">{stats?.alertCount || 0}</p>
              </div>
              <div className="w-12 h-12 bg-danger-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-danger-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-secondary-600" />
              心情分布
            </h3>
            <div className="space-y-4">
              {moodDistribution.map((item) => {
                const maxCount = Math.max(...moodDistribution.map(m => m.count));
                const width = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                return (
                  <div key={item.level} className="flex items-center gap-4">
                    <span className="w-16 text-sm text-gray-600">{item.label}</span>
                    <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} transition-all duration-500 flex items-center justify-end pr-2`}
                        style={{ width: `${width}%` }}
                      >
                        {item.count > 0 && <span className="text-white text-sm font-medium">{item.count}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger-600" />
              需要关注的学生
              {alertStudents.length > 0 && (
                <span className="ml-auto px-3 py-1 bg-danger-100 text-danger-600 text-sm rounded-full">
                  {alertStudents.length}人
                </span>
              )}
            </h3>
            {alertStudents.length > 0 ? (
              <div className="space-y-3">
                {alertStudents.map((student) => (
                  <div key={student.id} className="space-y-2">
                    <div className={`flex items-center gap-4 p-4 rounded-xl border-2 ${getRiskColor(student.riskLevel)}`}>
                      <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center text-xl">
                        {student.nickname?.[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{student.nickname}</p>
                        <p className="text-sm">最新心情：{getMoodEmoji(student.latestMood)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${student.riskLevel === 'red' ? 'bg-danger-200 text-danger-700' : student.riskLevel === 'orange' ? 'bg-warning-200 text-warning-700' : 'bg-warning-100 text-warning-700'}`}>
                        {getRiskLabel(student.riskLevel)}
                      </span>
                      <button
                        onClick={() => toggleRiskDetail(student.id, student.riskLevel)}
                        aria-label={`查看 ${student.nickname} 的风险详情`}
                        className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                    {expandedRiskId === student.id && (
                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        {renderRiskDetail(riskDetails[student.id], riskLoadingId === student.id)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-3" />
                <p className="text-gray-500">暂无需要特别关注的学生</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800">学生列表</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索学生..."
                  aria-label="搜索学生"
                  className="pl-10 pr-4 py-2 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-500"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-gray-600">学生姓名</th>
                  <th scope="col" className="text-center py-3 px-4 text-sm font-medium text-gray-600">最新心情</th>
                  <th scope="col" className="text-center py-3 px-4 text-sm font-medium text-gray-600">风险等级</th>
                  <th scope="col" className="text-center py-3 px-4 text-sm font-medium text-gray-600">状态</th>
                  <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <Fragment key={student.id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">{student.nickname?.[0]}</span>
                          </div>
                          <span className="font-medium">{student.nickname}</span>
                        </div>
                      </td>
                      <td className="text-center py-4 px-4 text-xl">{getMoodEmoji(student.latestMood)}</td>
                      <td className="text-center py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(student.riskLevel)}`}>
                          {getRiskLabel(student.riskLevel)}
                        </span>
                      </td>
                      <td className="text-center py-4 px-4">
                        {student.alert ? (
                          <span className="flex items-center justify-center gap-1 text-danger-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm">需关注</span>
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1 text-success-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">正常</span>
                          </span>
                        )}
                      </td>
                      <td className="text-right py-4 px-4">
                        <button
                          onClick={() => toggleRiskDetail(student.id, student.riskLevel)}
                          className="text-secondary-600 hover:text-secondary-800 font-medium"
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                    {expandedRiskId === student.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                            {renderRiskDetail(riskDetails[student.id], riskLoadingId === student.id)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
