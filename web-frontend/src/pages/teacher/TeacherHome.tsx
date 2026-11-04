/**
 * @file TeacherHome.tsx
 * @description 教师端首页：班级状态总览（人数/平均心情/今日打卡/需关注）、心情分布、需关注学生列表与学生表格
 * @module web-frontend/pages/teacher
 */
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useClassroomStore } from '../../store/classroomStore';
import { Header } from '../../components/common/Header';
import { BarChart3, AlertTriangle, Users, CheckCircle, TrendingUp, Download, Upload } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

/**
 * 根据心情等级返回对应 emoji
 * @param level - 心情等级（1~5）
 * @returns 对应 emoji，未打卡返回问号
 */
const getMoodEmoji = (level: number | undefined) => {
  if (!level) return '❓';
  if (level <= 1) return '😔';
  if (level <= 2) return '😞';
  if (level <= 3) return '😐';
  if (level <= 4) return '😊';
  return '😄';
};

/**
 * 教师端首页组件
 * @returns JSX 元素
 */
export default function TeacherHome() {
  // 当前用户
  const user = useAuthStore((state) => state.user);
  // 班级 store：学生列表、统计、拉取方法
  const { students, stats, fetchClassStats, fetchStudents } = useClassroomStore();
  const toast = useToast();

  // 学生搜索关键字
  const [searchQuery, setSearchQuery] = useState('');

  // 进入页面拉取班级统计与学生列表
  useEffect(() => {
    fetchClassStats('class1');
    fetchStudents('class1');
  }, [fetchClassStats, fetchStudents]);

  // 需关注学生（带 alert 标志）
  const alertStudents = students.filter(s => s.alert);
  // 心情分布：1~5 级对应学生数与配色
  const moodDistribution = [
    { level: 1, count: students.filter(s => s.latestMood === 1).length, label: '很低落', color: 'bg-danger-500' },
    { level: 2, count: students.filter(s => s.latestMood === 2).length, label: '有点低落', color: 'bg-warning-500' },
    { level: 3, count: students.filter(s => s.latestMood === 3).length, label: '一般般', color: 'bg-warning-300' },
    { level: 4, count: students.filter(s => s.latestMood === 4).length, label: '还不错', color: 'bg-primary-500' },
    { level: 5, count: students.filter(s => s.latestMood === 5).length, label: '很开心', color: 'bg-success-500' },
  ];
  // 按昵称或ID过滤学生（不按任何等级排序或筛选）
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
                  <div
                    key={student.id}
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-danger-200 bg-danger-50"
                  >
                    <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center text-xl">
                      {student.nickname?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{student.nickname}</p>
                      <p className="text-sm">最新心情：{getMoodEmoji(student.latestMood)}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-white/70 text-gray-700">
                      需关注
                    </span>
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
                  <th scope="col" className="text-center py-3 px-4 text-sm font-medium text-gray-600">状态</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
