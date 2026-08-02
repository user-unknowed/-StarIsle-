import { useState, useEffect, useRef } from 'react';
import { Header } from '../../components/common/Header';
import BubbleWrapGame from '../../components/BubbleWrapGame';
import { Music, Play, Pause, SkipForward, SkipBack, Waves, Sparkles, Heart, Grid3X3, Loader2 } from 'lucide-react';
import { contentApi } from '../../services/api';
import { useToast } from '../../components/ui/Toast';

type MusicListItem = {
  id: string;
  title: string;
  duration: string;
  cover: string;
  category: string;
  description?: string;
  audioUrl?: string;
};

const breathingExercises = [
  { id: '478', name: '4-7-8呼吸法', description: '吸气4秒，屏息7秒，呼气8秒', color: 'from-blue-500 to-cyan-500' },
  { id: 'box', name: '方块呼吸法', description: '吸气4秒，屏息4秒，呼气4秒，屏息4秒', color: 'from-green-500 to-emerald-500' },
  { id: 'relax', name: '放松呼吸法', description: '缓慢吸气，自然呼气，放松全身', color: 'from-purple-500 to-pink-500' },
];

const musicList: MusicListItem[] = [
  { id: '1', title: '森林雨声', duration: '45:32', cover: '🌧️', category: '自然' },
  { id: '2', title: '海浪轻拍', duration: '38:15', cover: '🌊', category: '海洋' },
  { id: '3', title: '星空冥想', duration: '52:08', cover: '⭐', category: '冥想' },
  { id: '4', title: '白噪音', duration: '60:00', cover: '🔊', category: '放松' },
  { id: '5', title: '钢琴旋律', duration: '32:45', cover: '🎹', category: '音乐' },
  { id: '6', title: '山间溪流', duration: '40:22', cover: '🏞️', category: '自然' },
];

export default function TeacherRelax() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'music' | 'breathing' | 'bubble'>('music');
  const [currentTrack, setCurrentTrack] = useState<MusicListItem>(musicList[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(breathingExercises[0]);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathingProgress, setBreathingProgress] = useState(0);
  const [isBreathing, setIsBreathing] = useState(false);
  const [apiMusicList, setApiMusicList] = useState<MusicListItem[]>([]);
  const [apiBreathingSteps, setApiBreathingSteps] = useState<{ name: string; duration: number; instruction: string }[] | null>(null);
  const [contentSource, setContentSource] = useState<'api' | 'mock'>('mock');
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const breathingInterval = useRef<any>(null);

  // 切换曲目时重置音频与播放状态
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setProgress(0);
    setIsPlaying(false);
  }, [currentTrack]);

  useEffect(() => {
    if (isBreathing) {
      const phases = [
        { phase: 'inhale' as const, duration: 4000 },
        { phase: 'hold' as const, duration: 7000 },
        { phase: 'exhale' as const, duration: 8000 },
      ];

      let phaseIndex = 0;

      const runPhase = () => {
        const current = phases[phaseIndex];
        setBreathingPhase(current.phase);
        setBreathingProgress(0);

        const stepDuration = 100;
        const steps = current.duration / stepDuration;

        const stepInterval = setInterval(() => {
          setBreathingProgress(prev => {
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
    setIsLoadingContent(true);
    contentApi
      .getMeditations('all')
      .then((data) => {
        if (cancelled) return;
        const mapped: MusicListItem[] = (data.meditations || []).map((m) => ({
          id: m.id,
          title: m.title,
          duration: `${Math.floor(m.duration / 60)}:${String(m.duration % 60).padStart(2, '0')}`,
          cover: '🎵',
          category: m.category,
          description: m.description,
          audioUrl: m.audio_url,
        }));
        if (mapped.length) {
          setApiMusicList(mapped);
          setCurrentTrack(mapped[0]);
          setContentSource('api');
        }
      })
      .catch((err) => {
        console.error('contentApi.getMeditations failed:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingContent(false);
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
        console.error('contentApi.getBreathing failed:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [currentExercise]);

  const displayMusicList: MusicListItem[] = apiMusicList.length > 0 ? apiMusicList : musicList;

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    setProgress(pct);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentTrack.audioUrl) {
      toast.info('演示版本暂无音频');
      return;
    }
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          toast.error('音频播放失败');
          setIsPlaying(false);
        });
    }
  };

  const handlePrev = () => {
    const currentIndex = displayMusicList.findIndex(m => m.id === currentTrack.id);
    const newIndex = currentIndex > 0 ? currentIndex - 1 : displayMusicList.length - 1;
    setCurrentTrack(displayMusicList[newIndex]);
  };

  const handleNext = () => {
    const currentIndex = displayMusicList.findIndex(m => m.id === currentTrack.id);
    const newIndex = currentIndex < displayMusicList.length - 1 ? currentIndex + 1 : 0;
    setCurrentTrack(displayMusicList[newIndex]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <Header role="teacher" />

      <main className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
        <div className="flex gap-4 mb-8" role="tablist">
          <button
            onClick={() => setActiveTab('music')}
            role="tab"
            aria-selected={activeTab === 'music'}
            aria-controls="panel-music"
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
            aria-controls="panel-breathing"
            className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
              activeTab === 'breathing'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Waves className="w-5 h-5 inline-block mr-2" />
            呼吸练习
          </button>
          <button
            onClick={() => setActiveTab('bubble')}
            role="tab"
            aria-selected={activeTab === 'bubble'}
            aria-controls="panel-bubble"
            className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
              activeTab === 'bubble'
                ? 'bg-gradient-to-r from-pink-400 to-rose-500 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Grid3X3 className="w-5 h-5 inline-block mr-2" />
            捏气泡纸
          </button>
        </div>

        {activeTab === 'music' && (
          <div className="space-y-6" role="tabpanel" id="panel-music">
            <div className="bg-white rounded-3xl p-6 shadow-lg">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center text-5xl">
                  {currentTrack.cover}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-purple-600 font-medium">{currentTrack.category}</p>
                    {!currentTrack.audioUrl && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-warning-50 text-warning-700 border border-warning-200">
                        演示模式
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">{currentTrack.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{currentTrack.duration}</p>
                </div>
              </div>

              {/* 真实音频元素，驱动进度与播放 */}
              <audio
                ref={audioRef}
                src={currentTrack.audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleNext}
                className="hidden"
              />

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
                  onClick={togglePlay}
                  aria-label={isPlaying ? '暂停' : '播放'}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isPlaying
                      ? 'bg-gradient-to-r from-primary-400 to-secondary-400 text-white shadow-lg'
                      : 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg'
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
              {isLoadingContent ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {displayMusicList.map((music) => (
                    <button
                      key={music.id}
                      onClick={() => setCurrentTrack(music)}
                      aria-label={`播放 ${music.title}`}
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
          <div className="space-y-6" role="tabpanel" id="panel-breathing">
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
                    aria-label={isBreathing ? '停止呼吸练习' : '开始呼吸练习'}
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
                    aria-label={exercise.name}
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

        {activeTab === 'bubble' && (
          <div role="tabpanel" id="panel-bubble">
            <BubbleWrapGame />
          </div>
        )}
      </main>
    </div>
  );
}
