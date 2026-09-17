/**
 * @file StudentRelax.tsx
 * @description 学生端放松练习页：解压音乐播放（含列表与进度）与呼吸练习（含 4-7-8、方块、放松三种节奏），均支持 API/mock 双数据源
 * @module web-frontend/pages/student
 */
import { useState, useEffect, useRef } from 'react';
import { Header } from '../../components/common/Header';
import { Music, Play, Pause, SkipForward, SkipBack, Waves, Sparkles, Heart, Loader2 } from 'lucide-react';
import { contentApi } from '../../services/api';
import { useToast } from '../../components/ui/Toast';

// 音乐项类型：标题、时长、封面、分类、可选描述与音频地址
type MusicListItem = {
  id: string;
  title: string;
  duration: string;
  cover: string;
  category: string;
  description?: string;
  url?: string;
};

// 呼吸练习配置：4-7-8 / 方块 / 放松三种节奏
const breathingExercises = [
  { id: '478', name: '4-7-8呼吸法', description: '吸气4秒，屏息7秒，呼气8秒', color: 'from-blue-500 to-cyan-500' },
  { id: 'box', name: '方块呼吸法', description: '吸气4秒，屏息4秒，呼气4秒，屏息4秒', color: 'from-green-500 to-emerald-500' },
  { id: 'relax', name: '放松呼吸法', description: '缓慢吸气，自然呼气，放松全身', color: 'from-purple-500 to-pink-500' },
];

// 兜底音乐列表（API 不可用时使用）
const musicList: MusicListItem[] = [
  { id: '1', title: '森林雨声', duration: '45:32', cover: '🌧️', category: '自然' },
  { id: '2', title: '海浪轻拍', duration: '38:15', cover: '🌊', category: '海洋' },
  { id: '3', title: '星空冥想', duration: '52:08', cover: '⭐', category: '冥想' },
  { id: '4', title: '白噪音', duration: '60:00', cover: '🔊', category: '放松' },
  { id: '5', title: '钢琴旋律', duration: '32:45', cover: '🎹', category: '音乐' },
  { id: '6', title: '山间溪流', duration: '40:22', cover: '🏞️', category: '自然' },
];

/**
 * 学生端放松练习组件
 * @returns JSX 元素
 */
export default function StudentRelax() {
  const toast = useToast();
  // 当前激活的 Tab：音乐/呼吸
  const [activeTab, setActiveTab] = useState<'music' | 'breathing'>('music');
  // 当前播放的曲目
  const [currentTrack, setCurrentTrack] = useState(musicList[0]);
  // 是否正在播放
  const [isPlaying, setIsPlaying] = useState(false);
  // 播放进度（0~100）
  const [progress, setProgress] = useState(0);
  // 当前选中的呼吸练习
  const [currentExercise, setCurrentExercise] = useState(breathingExercises[0]);
  // 当前呼吸阶段：吸气/屏息/呼气
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  // 呼吸阶段进度（0~100）
  const [breathingProgress, setBreathingProgress] = useState(0);
  // 是否正在进行呼吸练习
  const [isBreathing, setIsBreathing] = useState(false);
  // API 返回的音乐列表
  const [apiMusicList, setApiMusicList] = useState<MusicListItem[]>([]);
  // API 返回的呼吸练习步骤
  const [apiBreathingSteps, setApiBreathingSteps] = useState<{ name: string; duration: number; instruction: string }[] | null>(null);
  // 数据来源：api 或 mock
  const [contentSource, setContentSource] = useState<'api' | 'mock'>('mock');
  // 是否正在加载音乐列表
  const [isLoading, setIsLoading] = useState(true);

  // 音频元素引用
  const audioRef = useRef<HTMLAudioElement>(null);
  // 模拟播放进度定时器
  const progressInterval = useRef<any>(null);
  // 呼吸阶段进度定时器
  const breathingInterval = useRef<any>(null);

  // 无音频 URL 时，保留基于 interval 的进度作为演示回退
  useEffect(() => {
    if (isPlaying && !currentTrack.url) {
      progressInterval.current = window.setInterval(() => {
        setProgress(prev => {
          // 播放结束：停止并重置
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.5;
        });
      }, 1000);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, currentTrack]);

  // 有音频 URL 时，通过 <audio> 元素驱动播放/暂停
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack.url) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  /**
   * audio 元素时间更新事件：根据当前时间与总时长更新进度条
   */
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || Number.isNaN(audio.duration)) return;
    setProgress((audio.currentTime / audio.duration) * 100);
  };

  // 呼吸练习计时：按阶段循环 吸气4s/屏息7s/呼气8s
  useEffect(() => {
    if (isBreathing) {
      // 三阶段配置：吸气/屏息/呼气
      const phases = [
        { phase: 'inhale' as const, duration: 4000 },
        { phase: 'hold' as const, duration: 7000 },
        { phase: 'exhale' as const, duration: 8000 },
      ];

      let phaseIndex = 0;

      // 执行当前阶段：更新阶段文案与进度
      const runPhase = () => {
        const current = phases[phaseIndex];
        setBreathingPhase(current.phase);
        setBreathingProgress(0);

        const stepDuration = 100;
        const steps = current.duration / stepDuration;

        const stepInterval = setInterval(() => {
          setBreathingProgress(prev => {
            // 阶段完成：进入下一阶段
            if (prev >= 100) {
              clearInterval(stepInterval);
              phaseIndex = (phaseIndex + 1) % phases.length;
              setTimeout(runPhase, 200);
              return 0;
            }
            return prev + (100 / steps);
          });
        }, stepDuration);

        breathingInterval.current = stepInterval;
      };

      runPhase();
    } else {
      if (breathingInterval.current) {
        clearInterval(breathingInterval.current);
      }
    }

    return () => {
      if (breathingInterval.current) {
        clearInterval(breathingInterval.current);
      }
    };
  }, [isBreathing, currentExercise]);

  // 接入 contentApi：获取冥想列表
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    contentApi
      .getMeditations('all')
      .then((data) => {
        if (cancelled) return;
        // 将后端返回结构映射为本地 MusicListItem
        const mapped: MusicListItem[] = (data.meditations || []).map((m) => ({
          id: m.id,
          title: m.title,
          duration: `${Math.floor(m.duration / 60)}:${String(m.duration % 60).padStart(2, '0')}`,
          cover: '🎵',
          category: m.category,
          description: m.description,
          url: m.audio_url,
        }));
        if (mapped.length) {
          setApiMusicList(mapped);
          setCurrentTrack(mapped[0]);
          setContentSource('api');
        }
      })
      .catch((err) => {
        console.error('contentApi failed:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 接入 contentApi：获取呼吸练习步骤
  useEffect(() => {
    let cancelled = false;
    contentApi
      .getBreathing(currentExercise.id)
      .then((data) => {
        if (cancelled) return;
        if (data.steps?.length) {
          setApiBreathingSteps(data.steps);
          setContentSource('api');
        }
      })
      .catch((err) => {
        console.error('contentApi failed:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [currentExercise]);

  // 实际展示的音乐列表：优先用 API 数据，否则用兜底列表
  const displayMusicList: MusicListItem[] = apiMusicList.length > 0 ? apiMusicList : musicList;

  /**
   * 切换到指定曲目并重置进度
   * @param track - 目标曲目
   */
  const switchTrack = (track: MusicListItem) => {
    setCurrentTrack(track);
    setProgress(0);
    // 无音频地址时停止播放
    if (!track.url) {
      setIsPlaying(false);
    }
  };

  /**
   * 上一首：在展示列表中循环切换
   */
  const handlePrev = () => {
    const currentIndex = displayMusicList.findIndex(m => m.id === currentTrack.id);
    const newIndex = currentIndex > 0 ? currentIndex - 1 : displayMusicList.length - 1;
    switchTrack(displayMusicList[newIndex]);
  };

  /**
   * 下一首：在展示列表中循环切换
   */
  const handleNext = () => {
    const currentIndex = displayMusicList.findIndex(m => m.id === currentTrack.id);
    const newIndex = currentIndex < displayMusicList.length - 1 ? currentIndex + 1 : 0;
    switchTrack(displayMusicList[newIndex]);
  };

  /**
   * 点击播放/暂停：无音频地址时给出演示提示
   */
  const handlePlayClick = () => {
    if (!currentTrack.url) {
      toast.info('演示版本暂无音频');
      return;
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <Header role="student" />
      
      <main className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
        <div className="flex gap-4 mb-8" role="tablist">
          <button
            onClick={() => setActiveTab('music')}
            role="tab"
            aria-selected={activeTab === 'music'}
            className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
              activeTab === 'music'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Music className="w-5 h-5 inline-block mr-2" />
            解压音乐
          </button>
          <button
            onClick={() => setActiveTab('breathing')}
            role="tab"
            aria-selected={activeTab === 'breathing'}
            className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
              activeTab === 'breathing'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Waves className="w-5 h-5 inline-block mr-2" />
            呼吸练习
          </button>
        </div>

        <div role="tabpanel">
        {activeTab === 'music' && (
          <div className="space-y-6">
            <audio ref={audioRef} src={currentTrack.url} onTimeUpdate={handleTimeUpdate} onEnded={handleNext} />
            <div className="bg-white rounded-3xl p-6 shadow-lg">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center text-5xl">
                  {currentTrack.cover}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-purple-600 font-medium">{currentTrack.category}</p>
                    {!currentTrack.url && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-warning-50 text-warning-700 border border-warning-200">演示模式</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">{currentTrack.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{currentTrack.duration}</p>
                </div>
              </div>

              <div className="mb-4">
                <div
                  className="h-2 bg-gray-200 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={handlePrev}
                  aria-label="上一首"
                  className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={handlePlayClick}
                  aria-label={isPlaying ? '暂停' : '播放'}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isPlaying
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  }`}
                >
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                </button>
                <button
                  onClick={handleNext}
                  aria-label="下一首"
                  className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">音乐列表</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${contentSource === 'api' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {contentSource === 'api' ? 'API 数据' : '示例数据'}
                </span>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
              ) : (
              <div className="space-y-3">
                {displayMusicList.map((music) => (
                  <button
                    key={music.id}
                    onClick={() => switchTrack(music)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                      currentTrack.id === music.id
                        ? 'bg-purple-50 border border-purple-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                      {music.cover}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-800">{music.title}</p>
                      <p className="text-sm text-gray-500">{music.category}</p>
                    </div>
                    <span className="text-sm text-gray-400">{music.duration}</span>
                    {currentTrack.id === music.id && isPlaying && (
                      <div className="flex gap-1">
                        <span className="w-1 h-4 bg-purple-500 rounded-full animate-bounce"></span>
                        <span className="w-1 h-4 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        <span className="w-1 h-4 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'breathing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-lg">
              <div className="flex flex-col items-center">
                <div className="relative w-64 h-64 mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full opacity-50"></div>
                  <div 
                    className={`absolute inset-0 rounded-full bg-gradient-to-br ${currentExercise.color} opacity-30 transition-all duration-1000`}
                    style={{
                      transform: breathingPhase === 'inhale' 
                        ? `scale(${0.5 + (breathingProgress / 100) * 0.5})`
                        : breathingPhase === 'exhale'
                        ? `scale(${1 - (breathingProgress / 100) * 0.5})`
                        : 'scale(1)',
                    }}
                  ></div>
                  <div className="absolute inset-8 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                    <Sparkles className={`w-8 h-8 mb-2 transition-colors duration-300 ${
                      breathingPhase === 'inhale' ? 'text-blue-500' : 
                      breathingPhase === 'hold' ? 'text-yellow-500' : 'text-purple-500'
                    }`} />
                    <p className="text-2xl font-bold text-gray-800">
                      {breathingPhase === 'inhale' ? '吸气' : 
                       breathingPhase === 'hold' ? '屏息' : '呼气'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {Math.round(breathingProgress)}%
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={() => setIsBreathing(!isBreathing)}
                    className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
                      isBreathing
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg'
                    }`}
                  >
                    {isBreathing ? '停止' : '开始'}
                  </button>
                </div>

                {apiBreathingSteps && apiBreathingSteps.length > 0 && (
                  <div className="w-full mt-2 p-3 bg-indigo-50 rounded-xl">
                    <p className="text-xs text-indigo-600 font-medium mb-2">API 返回步骤（{currentExercise.name}）</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {apiBreathingSteps.map((step, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-white rounded-lg text-gray-600 border border-indigo-100">
                          {step.name} {step.duration}s
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-4">选择呼吸法</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {breathingExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => {
                      setCurrentExercise(exercise);
                      setIsBreathing(false);
                      setBreathingProgress(0);
                    }}
                    className={`p-5 rounded-2xl transition-all duration-300 text-left ${
                      currentExercise.id === exercise.id
                        ? `bg-gradient-to-br ${exercise.color} text-white shadow-lg`
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <Heart className={`w-6 h-6 mb-3 ${currentExercise.id === exercise.id ? 'text-white' : 'text-purple-500'}`} />
                    <p className={`font-bold mb-1 ${currentExercise.id === exercise.id ? 'text-white' : 'text-gray-800'}`}>
                      {exercise.name}
                    </p>
                    <p className={`text-sm ${currentExercise.id === exercise.id ? 'text-white/80' : 'text-gray-500'}`}>
                      {exercise.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}