// Shuffle array using Fisher-Yates algorithm
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Calculate total duration for a set of tracks (in milliseconds)
const calculateTotalDuration = (tracks) => {
  return tracks.reduce((total, track) => total + (track.duration_ms || 0), 0);
};

export const mixPlaylists = (playlistTracks, ratioConfig, options) => {
  const { totalSongs, targetDuration, useTimeLimit, shuffleWithinGroups } = options;

  console.log('=== SIMPLE MIXER ===');
  console.log('Playlists:', Object.keys(playlistTracks).length);
  console.log('Ratio config:', ratioConfig);

  // Validate inputs
  if (!playlistTracks || Object.keys(playlistTracks).length === 0) {
    return [];
  }

  if (!ratioConfig || Object.keys(ratioConfig).length === 0) {
    return [];
  }

  // Prepare tracks for each playlist
  const preparedTracks = {};
  Object.keys(playlistTracks).forEach(playlistId => {
    let tracks = [...(playlistTracks[playlistId] || [])];
    
    // Filter out invalid tracks
    tracks = tracks.filter(track => track && track.id && track.uri);
    
    // Shuffle within each playlist if requested
    if (shuffleWithinGroups) {
      tracks = shuffleArray(tracks);
    }
    
    preparedTracks[playlistId] = tracks;
  });

  // Get valid playlist IDs
  const playlistIds = Object.keys(ratioConfig).filter(id => 
    preparedTracks[id] && preparedTracks[id].length > 0
  );
  
  if (playlistIds.length === 0) {
    return [];
  }

  console.log('Valid playlists:', playlistIds.length);

  const mixedTracks = [];
  const trackIndices = {}; // Keep track of current position in each playlist
  const playlistDurations = {}; // Track total time added from each playlist
  
  // Initialize
  playlistIds.forEach(playlistId => {
    trackIndices[playlistId] = 0;
    playlistDurations[playlistId] = 0;
  });

  let currentPlaylistIndex = 0;
  let attempts = 0;
  const maxAttempts = (totalSongs || 100) * 10;

  const shouldContinue = () => {
    if (useTimeLimit) {
      const currentDuration = calculateTotalDuration(mixedTracks) / (1000 * 60); // minutes
      return currentDuration < targetDuration;
    }
    return mixedTracks.length < totalSongs;
  };

  while (shouldContinue() && attempts < maxAttempts) {
    attempts++;

    // Simple alternation - cycle through playlists
    const selectedPlaylistId = playlistIds[currentPlaylistIndex % playlistIds.length];
    const config = ratioConfig[selectedPlaylistId];
    const tracks = preparedTracks[selectedPlaylistId];

    // Skip if no more tracks available
    if (trackIndices[selectedPlaylistId] >= tracks.length) {
      currentPlaylistIndex++;
      continue;
    }

    // Start with minimum songs
    let songsToTake = config.min || 1;
    
    // Check if we should add more songs to balance time
    if (config.max > config.min) {
      // Calculate current time balance
      const totalDurationSoFar = Object.values(playlistDurations).reduce((sum, dur) => sum + dur, 0);
      const currentPlaylistShare = playlistDurations[selectedPlaylistId];
      const expectedShare = totalDurationSoFar / playlistIds.length; // Equal time share
      
      // If this playlist is significantly behind in time, add more songs
      if (currentPlaylistShare < expectedShare * 0.8) {
        songsToTake = config.max;
        console.log(`Adding extra songs to ${selectedPlaylistId} for time balance`);
      }
    }
    
    console.log(`Adding ${songsToTake} songs from playlist ${selectedPlaylistId}`);

    // Add songs from this playlist
    let songsAdded = 0;
    for (let i = 0; i < songsToTake && shouldContinue(); i++) {
      const trackIndex = trackIndices[selectedPlaylistId];

      if (trackIndex < tracks.length) {
        const track = tracks[trackIndex];

        // Avoid duplicates
        if (!mixedTracks.find(t => t.id === track.id)) {
          mixedTracks.push({
            ...track,
            sourcePlaylist: selectedPlaylistId
          });
          
          // Track duration for balancing
          playlistDurations[selectedPlaylistId] += track.duration_ms || 0;
          songsAdded++;
        }

        trackIndices[selectedPlaylistId]++;
      }
    }
    
    console.log(`Added ${songsAdded} songs. Total: ${mixedTracks.length}`);
    
    // Move to next playlist
    currentPlaylistIndex++;
  }

  // Trim to target if using time limit
  if (useTimeLimit) {
    const trimmedTracks = [];
    let currentDuration = 0;

    for (const track of mixedTracks) {
      const trackDuration = (track.duration_ms || 0) / (1000 * 60); // minutes
      if (currentDuration + trackDuration <= targetDuration) {
        trimmedTracks.push(track);
        currentDuration += trackDuration;
      } else {
        break;
      }
    }

    return trimmedTracks;
  }

  return mixedTracks.slice(0, totalSongs);
};