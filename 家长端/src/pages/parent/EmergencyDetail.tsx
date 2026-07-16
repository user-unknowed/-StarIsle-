import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentStore } from '../../store/parentStore';
import { ArrowLeft, AlertTriangle, Phone, MapPin, Clock, Check, User, Heart } from 'lucide-react';

export default function EmergencyDetail() {
  const navigate = useNavigate();
  const { emergencyResources, fetchEmergencyResources, confirmEmergencyAlert } = useParentStore();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [countdown, setCountdown] = useState(72 * 60 * 60);

  useEffect(() => {
    fetchEmergencyResources();
    
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [fetchEmergencyResources]);

  const handleConfirm = async () => {
    await confirmEmergencyAlert('alert1');
    setIsConfirmed(true);
  };

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const hotlines = emergencyResources.filter(r => r.type === 'hotline');
  const hospitals = emergencyResources.filter(r => r.type === 'hospital');
  const teachers = emergencyResources.filter(r => r.type === 'teacher');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/parent')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-gray-800">预警详情</h1>
              <p className="text-xs text-red-600">紧急情况，请立即关注</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="bg-red-600 rounded-3xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="px-3 py-1 bg-red-500 rounded-full text-sm font-bold">红色预警</span>
              <p className="text-red-100 text-sm mt-1">事态紧急，请立即关注</p>
            </div>
          </div>
          <p className="text-red-50 leading-relaxed">
            大星检测到孩子目前的情绪状态比较紧急。孩子可能正在经历非常困难的时刻。请保持冷静，按照以下建议采取行动。
          </p>
        </div>

        {!isConfirmed ? (
          <div className="bg-white rounded-3xl p-5 shadow-lg border-2 border-red-200">
            <h2 className="font-bold text-gray-800 mb-4">行动建议</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-red-50 rounded-xl">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 font-bold">1</div>
                <div>
                  <h3 className="font-bold text-gray-800">立即与孩子建立安全连接</h3>
                  <p className="text-sm text-gray-600 mt-1">先陪伴，不说教。告诉孩子"无论发生什么，爸爸妈妈都在你身边"。</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-orange-50 rounded-xl">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-bold">2</div>
                <div>
                  <h3 className="font-bold text-gray-800">联系学校心理老师</h3>
                  <p className="text-sm text-gray-600 mt-1">寻求专业心理老师的帮助和指导。</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-xl">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600 font-bold">3</div>
                <div>
                  <h3 className="font-bold text-gray-800">拨打心理援助热线</h3>
                  <p className="text-sm text-gray-600 mt-1">24小时专业心理援助，随时为您提供支持。</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold">4</div>
                <div>
                  <h3 className="font-bold text-gray-800">前往最近医院急诊</h3>
                  <p className="text-sm text-gray-600 mt-1">如情况严重，请立即前往医院寻求专业医疗帮助。</p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleConfirm}
              className="w-full mt-6 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              我已了解并开始行动
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-5 shadow-lg border-2 border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">已确认预警信息</h2>
                <p className="text-sm text-green-600">教师端已收到您的确认回执</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              感谢您的及时响应。请继续关注孩子的状态，如有需要，随时可以联系心理老师或拨打援助热线。
            </p>
          </div>
        )}

        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-600" />
            心理援助热线
          </h2>
          <div className="space-y-3">
            {hotlines.map((hotline) => (
              <a 
                key={hotline.name}
                href={`tel:${hotline.phone}`}
                className="flex items-center justify-between p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-800">{hotline.name}</p>
                  <p className="text-sm text-gray-500">{hotline.phone}</p>
                </div>
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <Phone className="w-5 h-5" />
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            最近医院
          </h2>
          <div className="space-y-3">
            {hospitals.map((hospital) => (
              <div key={hospital.name} className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-800">{hospital.name}</p>
                  <p className="text-sm text-gray-500">{hospital.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-600">{hospital.distance}</p>
                  <button className="text-xs text-blue-600 hover:text-blue-800">导航</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {teachers.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600" />
              学校联系人
            </h2>
            <div className="space-y-3">
              {teachers.map((teacher) => (
                <a 
                  key={teacher.name}
                  href={`tel:${teacher.phone}`}
                  className="flex items-center justify-between p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-800">{teacher.name}</p>
                    <p className="text-sm text-gray-500">{teacher.phone}</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white">
                    <Phone className="w-5 h-5" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-orange-100">预警跟进倒计时</p>
              <p className="text-2xl font-bold">{formatCountdown(countdown)}</p>
            </div>
          </div>
          <p className="text-sm text-orange-100 mt-3">
            在接下来的72小时内，大星会持续关注孩子的状态。请保持手机畅通。
          </p>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          <button 
            onClick={() => navigate('/parent')}
            className="flex flex-col items-center gap-1 p-2 text-indigo-600"
          >
            <Heart className="w-6 h-6" />
            <span className="text-xs font-medium">首页</span>
          </button>
          <button 
            onClick={() => navigate('/parent/chat')}
            className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            <Heart className="w-6 h-6" />
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