// Shuffle array using Fisher-Yates algorithm
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Get random number between min and max (inclusive)
const getRandomInRange = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Calculate total duration for a set of tracks (in milliseconds)
const calculateTotalDuration = (tracks) => {
  return tracks.reduce((total, track) => total + (track.duration_ms || 0), 0);
};

// Calculate adjusted popularity with recency boost
const getAdjustedPopularity = (track, recencyBoost = false) => {
  const basePopularity = track.popularity || 0;
  
  if (!recencyBoost || !track.album?.release_date) {
    return { 
      adjustedPopularity: basePopularity, 
      basePopularity, 
      recencyBonus: 0,
      releaseYear: track.album?.release_date ? new Date(track.album.release_date).getFullYear() : 'Unknown'
    };
  }
  
  const releaseDate = new Date(track.album.release_date);
  const now = new Date();
  const daysSinceRelease = (now - releaseDate) / (1000 * 60 * 60 * 24);
  
  // Boost recent tracks (within 2 years) by up to 20 points
  let recencyBonus = 0;
  if (daysSinceRelease < 730) { // 2 years
    recencyBonus = Math.max(0, 20 * (1 - daysSinceRelease / 730));
  }
  
  const adjustedPopularity = Math.min(100, basePopularity + recencyBonus);
  
  return {
    adjustedPopularity,
    basePopularity,
    recencyBonus: Math.round(recencyBonus * 10) / 10, // Round to 1 decimal
    releaseYear: releaseDate.getFullYear()
  };
};

// Divide tracks into popularity quadrants
const createPopularityQuadrants = (tracks, recencyBoost = false) => {
  // Calculate adjusted popularity for all tracks
  const tracksWithPopularity = tracks.map(track => {
    const popularityData = getAdjustedPopularity(track, recencyBoost);
    return {
      ...track,
      ...popularityData
    };
  });
  
  // Sort by adjusted popularity (highest first)
  const sortedTracks = tracksWithPopularity.sort((a, b) => b.adjustedPopularity - a.adjustedPopularity);
  
  const totalTracks = sortedTracks.length;
  const quarterSize = Math.ceil(totalTracks / 4);
  
  const quadrants = {
    topHits: sortedTracks.slice(0, quarterSize), // 0-25% (most popular)
    popular: sortedTracks.slice(quarterSize, quarterSize * 2), // 25-50%
    moderate: sortedTracks.slice(quarterSize * 2, quarterSize * 3), // 50-75%
    deepCuts: sortedTracks.slice(quarterSize * 3) // 75-100% (least popular)
  };
  
  // Log quadrant information with relative rankings (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 Popularity Quadrants Created (relative to this playlist):`);
    console.log(`  🔥 Top Hits: ${quadrants.topHits.length} tracks (${Math.round(quadrants.topHits[quadrants.topHits.length-1]?.adjustedPopularity || 0)}-${Math.round(quadrants.topHits[0]?.adjustedPopularity || 0)} popularity)`);
    console.log(`  ⭐ Popular: ${quadrants.popular.length} tracks (${Math.round(quadrants.popular[quadrants.popular.length-1]?.adjustedPopularity || 0)}-${Math.round(quadrants.popular[0]?.adjustedPopularity || 0)} popularity)`);
    console.log(`  📻 Moderate: ${quadrants.moderate.length} tracks (${Math.round(quadrants.moderate[quadrants.moderate.length-1]?.adjustedPopularity || 0)}-${Math.round(quadrants.moderate[0]?.adjustedPopularity || 0)} popularity)`);
    console.log(`  💎 Deep Cuts: ${quadrants.deepCuts.length} tracks (${Math.round(quadrants.deepCuts[quadrants.deepCuts.length-1]?.adjustedPopularity || 0)}-${Math.round(quadrants.deepCuts[0]?.adjustedPopularity || 0)} popularity)`);
  }
  
  return quadrants;
};

// Create popularity-based track pools for each playlist
const createPopularityPools = (playlistTracks, options) => {
  const { recencyBoost, shuffleWithinGroups } = options;
  
  const popularityPools = {};
  
  Object.keys(playlistTracks).forEach(playlistId => {
    const tracks = playlistTracks[playlistId];
    if (tracks.length === 0) {
      popularityPools[playlistId] = { topHits: [], popular: [], moderate: [], deepCuts: [] };
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n🎼 Processing playlist: ${playlistId} (${tracks.length} tracks)`);
    }
    
    // Create quadrants - this is now relative to THIS playlist only
    const quadrants = createPopularityQuadrants(tracks, recencyBoost);
    
    // Shuffle within quadrants if requested
    if (shuffleWithinGroups) {
      quadrants.topHits = shuffleArray(quadrants.topHits);
      quadrants.popular = shuffleArray(quadrants.popular);
      quadrants.moderate = shuffleArray(quadrants.moderate);
      quadrants.deepCuts = shuffleArray(quadrants.deepCuts);
    }
    
    popularityPools[playlistId] = quadrants;
  });
  
  return popularityPools;
};

// Get tracks based on popularity strategy and position in playlist
const getTracksForPosition = (popularityPools, playlistId, position, totalLength, strategy) => {
  const pools = popularityPools[playlistId];
  if (!pools) return [];
  
  const positionRatio = position / totalLength; // 0.0 to 1.0
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🎯 Position ${position}/${totalLength} (${Math.round(positionRatio * 100)}%) - Strategy: ${strategy}`);
  }
  
  let selectedPools = [];
  
  switch (strategy) {
    case 'front-loaded':
      // Popular songs first, fade to deep cuts
      if (positionRatio < 0.3) {
        selectedPools = [...pools.topHits, ...pools.popular];
        if (process.env.NODE_ENV === 'development') console.log(`   Using: Top Hits + Popular (front-loaded start)`);
      } else if (positionRatio < 0.7) {
        selectedPools = [...pools.moderate, ...pools.popular];
        if (process.env.NODE_ENV === 'development') console.log(`   Using: Moderate + Popular (front-loaded middle)`);
      } else {
        selectedPools = [...pools.deepCuts, ...pools.moderate];
        if (process.env.NODE_ENV === 'development') console.log(`   Using: Deep Cuts + Moderate (front-loaded end)`);
      }
      break;
      
    case 'mid-peak':
      // Build to peak in middle, then fade
      if (positionRatio < 0.2) {
        selectedPools = [...pools.moderate, ...pools.deepCuts];
        if (process.env.NODE_ENV === 'development') console.log(`   Using: Moderate + Deep Cuts (mid-peak start)`);
      } else if (positionRatio < 0.4) {
        selectedPools = [...pools.popular, ...pools.moderate];
        if (process.env.NODE_ENV === 'development') console.log(`   Using: Popular + Moderate (mid-peak build)`);
      } else if (positionRatio < 0.6) {
        selectedPools = [...pools.topHits, ...pools.popular];
        if (process.env.NODE_ENV === 'development') console.log(`   Using: Top Hits + Popular (mid-peak PEAK! 🔥)`);
      } else if (positionRatio < 0.8) {
        selectedPools = [...pools.popular, ...pools.moderate];
        if (process.env.NODE_ENV === 'development') console.log(`   Using: Popular + Moderate (mid-peak wind down)`);
      } else {
        selectedPools = [...pools.moderate, ...pools.deepCuts];
        if (process.env.NODE_ENV === 'development') console.log(`   Using: Moderate + Deep Cuts (mid-peak end)`);
      }
      break;
      
    case 'crescendo':
      // Build from deep cuts to biggest hits
      if (positionRatio < 0.3) {
        selectedPools = [...pools.deepCuts, ...pools.moderate];
        if (process.env.NODE_ENV === 'development') console.log(`   Using: Deep Cuts + Moderate (crescendo start)`);
      } else if (positionRatio < 0.6) {
        selectedPools = [...pools.moderate, ...pools.popular];
        if (process.env.NODE_ENV === 'development') console.log(`   Using: Moderate + Popular (crescendo build)`);
      } else {
        selectedPools = [...pools.popular, ...pools.topHits];
        if (process.env.NODE_ENV === 'development') console.log(`   Using: Popular + Top Hits (crescendo finale)`);
      }
      break;
      
    case 'mixed':
    default:
      // Random mix of all quadrants
      selectedPools = [...pools.topHits, ...pools.popular, ...pools.moderate, ...pools.deepCuts];
      if (process.env.NODE_ENV === 'development') console.log(`   Using: All quadrants mixed`);
      break;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`   Available tracks: ${selectedPools.length}`);
  }
  return selectedPools;
};

export const mixPlaylists = (playlistTracks, ratioConfig, options) => {
  const { totalSongs, targetDuration, useTimeLimit, shuffleWithinGroups, popularityStrategy, recencyBoost } = options;

  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('=== POPULARITY-AWARE MIXER ===');
    console.log('Playlists:', Object.keys(playlistTracks).length);
    console.log('Strategy:', popularityStrategy);
    console.log('Recency boost:', recencyBoost);
  }

  // Validate inputs
  if (!playlistTracks || Object.keys(playlistTracks).length === 0) {
    return [];
  }

  if (!ratioConfig || Object.keys(ratioConfig).length === 0) {
    return [];
  }

  // Filter out invalid tracks first
  const cleanedPlaylistTracks = {};
  Object.keys(playlistTracks).forEach(playlistId => {
    const tracks = (playlistTracks[playlistId] || []).filter(track => track && track.id && track.uri);
    cleanedPlaylistTracks[playlistId] = tracks;
  });

  // Create popularity-based pools for each playlist
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 Creating popularity pools...');
  }
  const popularityPools = createPopularityPools(cleanedPlaylistTracks, options);

  // Get valid playlist IDs
  const playlistIds = Object.keys(ratioConfig).filter(id => 
    cleanedPlaylistTracks[id] && cleanedPlaylistTracks[id].length > 0
  );
  
  if (playlistIds.length === 0) {
    return [];
  }

  console.log('Valid playlists:', playlistIds.length);

  const mixedTracks = [];
  const playlistDurations = {}; // Track total time added from each playlist
  
  // Initialize tracking for each playlist
  playlistIds.forEach(playlistId => {
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

    // Get appropriate tracks based on position and strategy
    const currentPosition = mixedTracks.length;
    let estimatedTotalLength;
    
    if (useTimeLimit) {
      // For time-based playlists, estimate based on average song length (3.5 minutes)
      // But cap it at a reasonable number to avoid the 840 song issue
      const roughEstimate = Math.ceil(targetDuration / 3.5);
      estimatedTotalLength = Math.min(roughEstimate, 200); // Cap at 200 songs max
      console.log(`Time-based playlist: ${targetDuration} min ≈ ${roughEstimate} songs (using ${estimatedTotalLength} for strategy)`);
    } else {
      estimatedTotalLength = totalSongs;
    }
    
    const availableTracks = getTracksForPosition(popularityPools, selectedPlaylistId, currentPosition, estimatedTotalLength, popularityStrategy);

    // Skip if no more tracks available
    if (availableTracks.length === 0) {
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
    
    console.log(`\n🎼 Adding ${songsToTake} songs from playlist ${selectedPlaylistId} (${popularityStrategy} strategy, position ${currentPosition}/${estimatedTotalLength})`);

    // Add songs from this playlist
    let songsAdded = 0;
    const usedTrackIds = new Set(mixedTracks.map(t => t.id));
    
    for (let i = 0; i < songsToTake && shouldContinue(); i++) {
      // Find next available track from the appropriate popularity pool
      let selectedTrack = null;
      
      for (const track of availableTracks) {
        if (!usedTrackIds.has(track.id)) {
          selectedTrack = track;
          break;
        }
      }
      
      if (selectedTrack) {
        // Determine which quadrant this track came from
        let quadrant = '❓ Unknown';
        const pools = popularityPools[selectedPlaylistId];
        if (pools.topHits.find(t => t.id === selectedTrack.id)) quadrant = '🔥 Top Hit';
        else if (pools.popular.find(t => t.id === selectedTrack.id)) quadrant = '⭐ Popular';
        else if (pools.moderate.find(t => t.id === selectedTrack.id)) quadrant = '📻 Moderate';
        else if (pools.deepCuts.find(t => t.id === selectedTrack.id)) quadrant = '💎 Deep Cut';
        
        // Log detailed track information (development only)
        if (process.env.NODE_ENV === 'development') {
          const recencyInfo = selectedTrack.recencyBonus > 0 
            ? ` (+${selectedTrack.recencyBonus} recency bonus from ${selectedTrack.releaseYear})`
            : ` (${selectedTrack.releaseYear})`;
          
          console.log(`  🎵 "${selectedTrack.name}" by ${selectedTrack.artists?.[0]?.name || 'Unknown'}`);
          console.log(`     ${quadrant} within this playlist | Popularity: ${selectedTrack.basePopularity} → ${Math.round(selectedTrack.adjustedPopularity)}${recencyInfo}`);
        }
        
        mixedTracks.push({
          ...selectedTrack,
          sourcePlaylist: selectedPlaylistId
        });
        
        usedTrackIds.add(selectedTrack.id);
        
        // Track duration for balancing
        playlistDurations[selectedPlaylistId] += selectedTrack.duration_ms || 0;
        songsAdded++;
        
        // Remove used track from available tracks
        const trackIndex = availableTracks.indexOf(selectedTrack);
        if (trackIndex > -1) {
          availableTracks.splice(trackIndex, 1);
        }
      } else {
        break; // No more available tracks
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