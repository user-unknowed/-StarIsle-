import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { RefreshCw, Trophy, Zap, Target, Grid3X3 } from 'lucide-react';

interface Bubble {
  id: number;
  popped: boolean;
  row: number;
  col: number;
}

export default function BubbleWrapGame() {
  const [rows, setRows] = useState(6);
  const [cols, setCols] = useState(8);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [poppedCount, setPoppedCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState<Set<number>>(new Set());
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalBubbles = useMemo(() => rows * cols, [rows, cols]);
  const progress = useMemo(() => Math.round((poppedCount / totalBubbles) * 100), [poppedCount, totalBubbles]);

  useEffect(() => {
    const generateBubbles = () => {
      const newBubbles: Bubble[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          newBubbles.push({
            id: r * cols + c,
            popped: false,
            row: r,
            col: c,
          });
        }
      }
      setBubbles(newBubbles);
    };

    generateBubbles();

    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setCols(5);
        setRows(8);
      } else if (width < 1024) {
        setCols(6);
        setRows(7);
      } else {
        setCols(8);
        setRows(6);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [rows, cols]);

  const playPopSound = useCallback(() => {
    if (!isSoundEnabled) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.log('Audio playback failed:', e);
    }
  }, [isSoundEnabled]);

  const handleBubblePress = useCallback((bubble: Bubble) => {
    if (bubble.popped || isAnimating.has(bubble.id)) return;

    setIsAnimating(prev => new Set(prev).add(bubble.id));
    
    playPopSound();

    setBubbles(prev => prev.map(b => 
      b.id === bubble.id ? { ...b, popped: true } : b
    ));

    setPoppedCount(prev => prev + 1);
    
    setCombo(prev => {
      const newCombo = prev + 1;
      setMaxCombo(max => Math.max(max, newCombo));
      return newCombo;
    });

    const baseScore = 10;
    const comboBonus = Math.min(combo * 5, 50);
    setScore(prev => prev + baseScore + comboBonus);

    setTimeout(() => {
      setIsAnimating(prev => {
        const next = new Set(prev);
        next.delete(bubble.id);
        return next;
      });
    }, 200);
  }, [isAnimating, playPopSound, combo]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touches = e.touches;
    Array.from(touches).forEach(touch => {
      const target = touch.target as HTMLElement;
      const bubbleId = parseInt(target.dataset.bubbleId || '-1');
      if (bubbleId >= 0) {
        const bubble = bubbles.find(b => b.id === bubbleId);
        if (bubble) handleBubblePress(bubble);
      }
    });
  }, [bubbles, handleBubblePress]);

  const handleMouseDown = useCallback((bubble: Bubble) => {
    handleBubblePress(bubble);
  }, [handleBubblePress]);

  const resetGame = useCallback(() => {
    const newBubbles: Bubble[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newBubbles.push({
          id: r * cols + c,
          popped: false,
          row: r,
          col: c,
        });
      }
    }
    setBubbles(newBubbles);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setPoppedCount(0);
    setIsAnimating(new Set());
  }, [rows, cols]);

  const allPopped = useMemo(() => poppedCount === totalBubbles, [poppedCount, totalBubbles]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
              <Grid3X3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">捏捏气泡纸</h2>
              <p className="text-sm text-gray-500">解压放松，快乐无限</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className={`p-3 rounded-xl transition-all duration-300 ${
                isSoundEnabled 
                  ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' 
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
              title={isSoundEnabled ? '关闭音效' : '开启音效'}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isSoundEnabled ? (
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                ) : (
                  <>
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 text-center">
            <Target className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{score}</p>
            <p className="text-xs text-gray-500">总分</p>
          </div>
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-4 text-center">
            <Zap className="w-6 h-6 text-pink-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{combo}</p>
            <p className="text-xs text-gray-500">连击</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4 text-center">
            <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{maxCombo}</p>
            <p className="text-xs text-gray-500">最高连击</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 text-center">
            <Grid3X3 className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{progress}%</p>
            <p className="text-xs text-gray-500">完成度</p>
          </div>
        </div>

        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-6">
          <div 
            className="h-full bg-gradient-to-r from-pink-400 via-rose-500 to-red-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div 
          ref={containerRef}
          className="grid gap-2 md:gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl"
          style={{ 
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            touchAction: 'none',
          }}
          onTouchStart={handleTouchStart}
        >
          {bubbles.map((bubble) => (
            <button
              key={bubble.id}
              data-bubble-id={bubble.id}
              onMouseDown={() => handleMouseDown(bubble)}
              onMouseEnter={(e) => {
                if (e.buttons === 1) {
                  handleMouseDown(bubble);
                }
              }}
              className={`
                aspect-square rounded-xl transition-all duration-150
                flex items-center justify-center
                ${bubble.popped 
                  ? 'bg-gray-200 cursor-default' 
                  : 'bg-gradient-to-br from-white via-gray-50 to-gray-100 shadow-inner hover:shadow-md cursor-pointer active:scale-95'
                }
                ${isAnimating.has(bubble.id) && !bubble.popped ? 'animate-pop' : ''}
              `}
              disabled={bubble.popped}
            >
              {!bubble.popped && (
                <div className={`
                  w-3/5 h-3/5 rounded-full
                  bg-gradient-to-br from-white/80 to-gray-100/50
                  ${bubble.popped ? 'opacity-0' : 'opacity-100'}
                  transition-opacity duration-150
                `} />
              )}
              {bubble.popped && (
                <div className="w-full h-full flex items-center justify-center">
                  <svg 
                    className="w-3/5 h-3/5 text-gray-300" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="8" y1="8" x2="16" y2="16" />
                    <line x1="16" y1="8" x2="8" y2="16" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={resetGame}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-400 to-rose-500 text-white rounded-xl font-bold hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            <RefreshCw className="w-5 h-5" />
            再来一张
          </button>
        </div>

        {allPopped && (
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl text-center animate-bounce-in">
            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">🎉 恭喜完成！</h3>
            <p className="text-gray-600">总得分: <span className="font-bold text-rose-500">{score}</span> | 最高连击: <span className="font-bold text-yellow-500">{maxCombo}</span></p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4">游戏玩法</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-lg">👆</span>
            </div>
            <div>
              <p className="font-medium text-gray-800">点击气泡</p>
              <p className="text-sm text-gray-500">用鼠标或手指点击气泡，享受解压的快感</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-lg">⚡</span>
            </div>
            <div>
              <p className="font-medium text-gray-800">连击加分</p>
              <p className="text-sm text-gray-500">连续点击可获得额外分数加成</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🔊</span>
            </div>
            <div>
              <p className="font-medium text-gray-800">音效反馈</p>
              <p className="text-sm text-gray-500">开启音效体验更真实的气泡破裂声</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}