// Hook-specific type definitions

import { SpotifyTrack } from './spotify';

import { SearchState } from './mixer';

import { SearchTracksOptions } from './api';

// API hooks
export interface UseSpotifySearchOptions extends SearchTracksOptions {
  debounceMs?: number;
  autoSearch?: boolean;
  enabled?: boolean;
}

export interface UseSpotifySearchReturn extends SearchState<SpotifyTrack> {
  setQuery: (query: string) => void;
  search: (query?: string) => Promise<void>;
  loadMore: () => void;
  clear: () => void;
  retry: () => void;
  isInitialLoad: boolean;
  isLoadingMore: boolean;
  isEmpty: boolean;
}
