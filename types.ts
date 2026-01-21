
export interface Surah {
  id: number;
  name: string;
  englishName: string;
  type: 'Meccan' | 'Medinan';
  versesCount: number;
  audioUrl: string;
}

export interface PlayerState {
  currentSurahId: number | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}
