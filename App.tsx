
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { getSurahData } from './constants';
import { Surah, PlayerState } from './types';
import { 
  PlayIcon, PauseIcon, SkipForwardIcon, SkipBackIcon, 
  VolumeIcon, VolumeMutedIcon, SearchIcon, SparklesIcon,
  HeartIcon, ClockIcon
} from './components/Icons';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const surahs = useMemo(() => getSurahData(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<number[]>(() => {
    const saved = localStorage.getItem('quran_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentSurahId: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
  });
  const [aiInfo, setAiInfo] = useState<{ id: number; text: string | null; loading: boolean }>({
    id: 0,
    text: null,
    loading: false
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem('quran_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    let interval: number;
    if (sleepTimer !== null && playerState.isPlaying) {
      interval = window.setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            setPlayerState(p => ({ ...p, isPlaying: false }));
            setSleepTimer(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sleepTimer, playerState.isPlaying]);

  const currentSurah = useMemo(() => 
    surahs.find(s => s.id === playerState.currentSurahId), 
    [surahs, playerState.currentSurahId]
  );

  const filteredSurahs = useMemo(() => 
    surahs.filter(s => {
      const matchesSearch = s.name.includes(searchQuery) || 
        s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toString() === searchQuery;
      const isFav = favorites.includes(s.id);
      return showFavoritesOnly ? (matchesSearch && isFav) : matchesSearch;
    }),
    [surahs, searchQuery, favorites, showFavoritesOnly]
  );

  const handlePlaySurah = useCallback((id: number) => {
    setPlayerState(prev => {
      if (prev.currentSurahId === id) {
        return { ...prev, isPlaying: !prev.isPlaying };
      }
      return { 
        ...prev, 
        currentSurahId: id, 
        isPlaying: true, 
        progress: 0 
      };
    });
  }, []);

  const toggleFavorite = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(favId => favId !== id) : [...prev, id]
    );
  };

  const handleNext = useCallback(() => {
    if (!playerState.currentSurahId) return;
    const nextId = playerState.currentSurahId < 114 ? playerState.currentSurahId + 1 : 1;
    handlePlaySurah(nextId);
  }, [playerState.currentSurahId, handlePlaySurah]);

  const handlePrev = useCallback(() => {
    if (!playerState.currentSurahId) return;
    const prevId = playerState.currentSurahId > 1 ? playerState.currentSurahId - 1 : 114;
    handlePlaySurah(prevId);
  }, [playerState.currentSurahId, handlePlaySurah]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPlayerState(prev => ({ ...prev, volume: val, isMuted: val === 0 }));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setPlayerState(prev => ({ ...prev, progress: val }));
    }
  };

  const fetchAiInfo = async (surah: Surah) => {
    setAiInfo({ id: surah.id, text: null, loading: true });
    const text = await geminiService.getSurahInfo(surah.name);
    setAiInfo({ id: surah.id, text, loading: false });
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = playerState.isMuted ? 0 : playerState.volume;
    }
  }, [playerState.volume, playerState.isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSurah) return;
    if (audio.src !== currentSurah.audioUrl) {
      audio.src = currentSurah.audioUrl;
      audio.load();
    }
  }, [currentSurah]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    let isCancelled = false;
    const syncPlayback = async () => {
      try {
        if (playerState.isPlaying) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise;
            if (isCancelled) audio.pause();
          }
        } else {
          audio.pause();
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') console.error(e);
      }
    };
    syncPlayback();
    return () => { isCancelled = true; };
  }, [playerState.isPlaying, playerState.currentSurahId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-52 lg:pb-40">
      {/* هيدر متجاوب مع التلفزيون */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-2xl border-b border-slate-800 px-6 py-6 sm:py-8 shadow-2xl">
        <div className="max-w-[1920px] mx-auto flex flex-col xl:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-6 w-full xl:w-auto">
             <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-emerald-500/20 shrink-0">
                <span className="text-3xl sm:text-4xl font-bold">قرآن</span>
             </div>
             <div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">القرآن الكريم</h1>
                <p className="text-sm sm:text-lg text-emerald-400 font-bold opacity-80 mt-1">بصوت القارئ ماهر المعيقلي</p>
             </div>
          </div>

          <div className="flex w-full xl:max-w-5xl items-center gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-emerald-500">
                <SearchIcon className="w-8 h-8" />
              </div>
              <input
                type="text"
                placeholder="ابحث برقم السورة أو اسمها (مثال: 114 أو الناس)..."
                className="w-full pr-16 pl-6 py-4 sm:py-6 bg-slate-800/50 border-2 border-slate-700 rounded-3xl focus:outline-none focus:ring-4 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-white text-xl sm:text-2xl placeholder-slate-500 shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`p-4 sm:p-6 rounded-3xl border-2 transition-all flex items-center gap-3 font-bold text-xl shadow-lg focus:ring-4 ${
                showFavoritesOnly 
                  ? 'bg-emerald-600 border-emerald-500 text-white' 
                  : 'bg-slate-800 border-slate-700 text-emerald-500 hover:bg-slate-700'
              }`}
            >
              <HeartIcon filled={showFavoritesOnly} className="w-8 h-8" />
              <span className="hidden md:inline">المفضلة</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-6 py-10 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
          {filteredSurahs.map((surah) => {
            const isCurrent = playerState.currentSurahId === surah.id;
            const isFav = favorites.includes(surah.id);
            return (
              <button 
                key={surah.id}
                className={`group relative overflow-hidden bg-slate-900 text-right p-8 rounded-[3rem] border-2 transition-all duration-300 shadow-lg hover:shadow-emerald-500/20 outline-none ${
                  isCurrent ? 'border-emerald-500 bg-slate-800 ring-4 ring-emerald-500/20' : 'border-slate-800 hover:border-slate-600'
                }`}
                onClick={() => handlePlaySurah(surah.id)}
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl transition-all shadow-xl ${
                      isCurrent ? 'bg-emerald-600 text-white rotate-6 scale-110' : 'bg-slate-800 text-emerald-400'
                    }`}>
                      {surah.id}
                    </div>
                    <div>
                      <h3 className="text-3xl sm:text-4xl font-black quran-font leading-none mb-2">{surah.name}</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{surah.englishName}</p>
                    </div>
                  </div>
                  <div 
                    onClick={(e) => toggleFavorite(e, surah.id)}
                    className={`p-3 rounded-2xl transition-all ${
                      isFav ? 'text-rose-500 bg-rose-500/10' : 'text-slate-600 hover:text-rose-400'
                    }`}
                  >
                    <HeartIcon filled={isFav} className="w-8 h-8" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="px-5 py-2 bg-slate-800 text-slate-300 text-sm font-black rounded-2xl">
                    {surah.type === 'Meccan' ? 'مكية' : 'مدنية'}
                  </span>
                  <div className="flex items-center gap-4">
                    <div 
                      onClick={(e) => { e.stopPropagation(); fetchAiInfo(surah); }}
                      className="p-3 text-slate-500 hover:text-emerald-400 transition-all cursor-pointer"
                      title="نبذة ذكية"
                    >
                      <SparklesIcon className="w-8 h-8" />
                    </div>
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                      isCurrent && playerState.isPlaying 
                        ? 'bg-emerald-600 text-white scale-110' 
                        : 'bg-slate-800 text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white'
                    }`}>
                      {isCurrent && playerState.isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8 ml-1" />}
                    </div>
                  </div>
                </div>

                {aiInfo.id === surah.id && (aiInfo.loading || aiInfo.text) && (
                  <div className="mt-8 p-6 bg-slate-950/80 rounded-[2rem] border border-slate-700 text-lg text-slate-300 leading-relaxed text-right animate-in fade-in zoom-in-95">
                    {aiInfo.loading ? (
                      <div className="flex items-center gap-3 justify-center py-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce delay-200"></div>
                      </div>
                    ) : (
                      <p className="font-medium">{aiInfo.text}</p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* مشغل الصوت المحسن للتلفزيون */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 p-6 sm:p-10 bg-slate-900/95 backdrop-blur-3xl border-t-4 border-slate-800 shadow-[0_-30px_60px_-15px_rgba(0,0,0,0.5)]">
        <div className="max-w-[1920px] mx-auto">
          
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            
            {/* معلومات السورة */}
            <div className="flex items-center gap-8 w-full lg:w-1/4">
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center text-white text-4xl sm:text-5xl font-black quran-font shadow-2xl">
                  {currentSurah?.id || '--'}
                </div>
                {playerState.isPlaying && (
                  <div className="absolute -bottom-3 -right-3 flex gap-1.5 items-end justify-center h-10 px-3 bg-emerald-500 rounded-2xl border-4 border-slate-900 shadow-xl">
                    <div className="w-1.5 bg-white h-4 animate-[bounce_0.6s_infinite]"></div>
                    <div className="w-1.5 bg-white h-7 animate-[bounce_0.8s_infinite]"></div>
                    <div className="w-1.5 bg-white h-3 animate-[bounce_0.5s_infinite]"></div>
                  </div>
                )}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-slate-50 font-black quran-font text-3xl sm:text-5xl truncate leading-tight mb-2">{currentSurah?.name || 'اختر سورة'}</h4>
                <p className="text-lg sm:text-xl text-emerald-400 font-bold opacity-60">القارئ ماهر المعيقلي</p>
              </div>
            </div>

            {/* التحكم الرئيسي */}
            <div className="flex flex-col items-center gap-6 w-full lg:w-2/4">
              <div className="flex items-center gap-12 sm:gap-20">
                <button onClick={handlePrev} className="text-slate-600 hover:text-white transition-all hover:scale-125 p-4 rounded-full focus:ring-4 outline-none">
                  <SkipBackIcon className="w-10 h-10 sm:w-14 sm:h-14" />
                </button>
                <button 
                  onClick={() => currentSurah && handlePlaySurah(currentSurah.id)}
                  className="w-20 h-20 sm:w-32 sm:h-32 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-all active:scale-90 focus:ring-8 focus:ring-emerald-500/40 outline-none"
                >
                  {playerState.isPlaying ? <PauseIcon className="w-12 h-12 sm:w-20 sm:h-20" /> : <PlayIcon className="w-12 h-12 sm:w-20 sm:h-20 ml-2" />}
                </button>
                <button onClick={handleNext} className="text-slate-600 hover:text-white transition-all hover:scale-125 p-4 rounded-full focus:ring-4 outline-none">
                  <SkipForwardIcon className="w-10 h-10 sm:w-14 sm:h-14" />
                </button>
              </div>
              
              {/* شريط التقدم العريض للتلفزيون */}
              <div className="w-full space-y-3">
                <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden cursor-pointer">
                  <div 
                    className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all duration-300"
                    style={{ width: `${(playerState.progress / (playerState.duration || 1)) * 100}%` }}
                  />
                  <input 
                    type="range"
                    min="0"
                    max={playerState.duration || 100}
                    value={playerState.progress}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                  />
                </div>
                <div className="flex justify-between text-lg sm:text-xl font-black text-slate-500 tabular-nums">
                  <span>{formatTime(playerState.progress)}</span>
                  <span>{formatTime(playerState.duration)}</span>
                </div>
              </div>
            </div>

            {/* أدوات إضافية */}
            <div className="flex items-center gap-8 w-full lg:w-1/4 justify-center lg:justify-end">
              <button 
                onClick={() => setSleepTimer(sleepTimer === null ? 30 : null)}
                className={`flex items-center gap-3 p-5 rounded-3xl border-2 transition-all font-bold text-xl focus:ring-4 outline-none ${sleepTimer ? 'bg-emerald-600 border-emerald-500 text-white animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
              >
                <ClockIcon className="w-8 h-8" />
                {sleepTimer && <span>{formatTime(remainingSeconds)}</span>}
              </button>
              
              <div className="hidden sm:flex items-center gap-4 bg-slate-800 px-6 py-4 rounded-3xl shadow-inner">
                <VolumeIcon className="w-8 h-8 text-slate-500" />
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={playerState.isMuted ? 0 : playerState.volume}
                  onChange={handleVolumeChange}
                  className="w-32 lg:w-48 accent-emerald-500 h-3 cursor-pointer rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </footer>

      <audio
        ref={audioRef}
        onTimeUpdate={() => setPlayerState(prev => ({ ...prev, progress: audioRef.current?.currentTime || 0 }))}
        onDurationChange={() => setPlayerState(prev => ({ ...prev, duration: audioRef.current?.duration || 0 }))}
        onEnded={handleNext}
        hidden
      />
    </div>
  );
};

export default App;
