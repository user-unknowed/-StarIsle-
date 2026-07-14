import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useClassroomStore } from '../../store/classroomStore';
import { Header } from '../../components/common/Header';
import { BarChart3, AlertTriangle, Users, CheckCircle, TrendingUp, Eye, Download, Upload, FileSpreadsheet } from 'lucide-react';

const getRiskColor = (level: string | undefined) => {
  switch (level) {
    case 'red': return 'bg-red-100 text-red-600 border-red-200';
    case 'orange': return 'bg-orange-100 text-orange-600 border-orange-200';
    case 'yellow': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
    default: return 'bg-green-100 text-green-600 border-green-200';
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

  useEffect(() => {
    fetchClassStats('class1');
    fetchStudents('class1');
  }, [fetchClassStats, fetchStudents]);

  const alertStudents = students.filter(s => s.alert);
  const moodDistribution = [
    { level: 1, count: students.filter(s => s.latestMood === 1).length, label: '很低落', color: 'bg-red-500' },
    { level: 2, count: students.filter(s => s.latestMood === 2).length, label: '有点低落', color: 'bg-orange-500' },
    { level: 3, count: students.filter(s => s.latestMood === 3).length, label: '一般般', color: 'bg-yellow-500' },
    { level: 4, count: students.filter(s => s.latestMood === 4).length, label: '还不错', color: 'bg-blue-500' },
    { level: 5, count: students.filter(s => s.latestMood === 5).length, label: '很开心', color: 'bg-green-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <Header role="teacher" />
      
      <main className="pt-20 pb-8 px-4 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 mb-8 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">班级状态总览</h1>
              <p className="text-indigo-200 mt-1">你好，{user?.nickname}，查看班级学生的心理健康状态</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors">
                <Upload className="w-5 h-5" />
                <span>导入数据</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors font-medium">
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
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">平均心情</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.averageMood || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">今日打卡</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.todayCheckinCount || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">需关注</p>
                <p className="text-3xl font-bold text-red-600">{stats?.alertCount || 0}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
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
              <AlertTriangle className="w-5 h-5 text-red-600" />
              需要关注的学生
              {alertStudents.length > 0 && (
                <span className="ml-auto px-3 py-1 bg-red-100 text-red-600 text-sm rounded-full">
                  {alertStudents.length}人
                </span>
              )}
            </h3>
            {alertStudents.length > 0 ? (
              <div className="space-y-3">
                {alertStudents.map((student) => (
                  <div 
                    key={student.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 ${getRiskColor(student.riskLevel)}`}
                  >
                    <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center text-xl">
                      {student.nickname?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{student.nickname}</p>
                      <p className="text-sm">最新心情：{getMoodEmoji(student.latestMood)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${student.riskLevel === 'red' ? 'bg-red-200 text-red-700' : student.riskLevel === 'orange' ? 'bg-orange-200 text-orange-700' : 'bg-yellow-200 text-yellow-700'}`}>
                      {getRiskLabel(student.riskLevel)}
                    </span>
                    <button className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
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
                  placeholder="搜索学生..."
                  className="pl-10 pr-4 py-2 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">学生姓名</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">最新心情</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">风险等级</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">状态</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
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
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(student.riskLevel)}`}>
                        {getRiskLabel(student.riskLevel)}
                      </span>
                    </td>
                    <td className="text-center py-4 px-4">
                      {student.alert ? (
                        <span className="flex items-center justify-center gap-1 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm">需关注</span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">正常</span>
                        </span>
                      )}
                    </td>
                    <td className="text-right py-4 px-4">
                      <button className="text-purple-600 hover:text-purple-800 font-medium">查看详情</button>
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