// Shuffle array using Fisher-Yates algorithm
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Get random number between min and max (inclusive) - currently unused but kept for future features
// const getRandomInRange = (min, max) => {
//   return Math.floor(Math.random() * (max - min + 1)) + min;
// };

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
  
  // Add fallback mechanism for all strategies (except 'mixed' which already uses all quadrants)
  // This prevents premature stopping when strategy-specific pools are too restrictive
  if (strategy !== 'mixed') {
    // Store the strategy-specific selection
    const strategyPools = [...selectedPools];
    
    // If strategy pools are empty or will likely be exhausted soon, add fallback pools
    if (selectedPools.length === 0) {
      selectedPools = [...pools.topHits, ...pools.popular, ...pools.moderate, ...pools.deepCuts];
      if (process.env.NODE_ENV === 'development') {
        console.log(`   ⚠️ Fallback: Using all quadrants (strategy pools empty)`);
      }
    } else {
      // Add fallback pools to the end so strategy pools are preferred but fallback is available
      const allPools = [...pools.topHits, ...pools.popular, ...pools.moderate, ...pools.deepCuts];
      const fallbackPools = allPools.filter(track => !strategyPools.some(strategyTrack => strategyTrack.id === track.id));
      
      if (fallbackPools.length > 0) {
        selectedPools = [...strategyPools, ...fallbackPools];
        if (process.env.NODE_ENV === 'development') {
          console.log(`   📋 Strategy pools: ${strategyPools.length}, Fallback pools: ${fallbackPools.length}`);
        }
      }
    }
  }
  
  return selectedPools;
};

export const mixPlaylists = (playlistTracks, ratioConfig, options) => {
  const { totalSongs, targetDuration, useTimeLimit, popularityStrategy, recencyBoost, continueWhenPlaylistEmpty = true, useAllSongs = false } = options;
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🎵 Mix Options:', {
      totalSongs,
      targetDuration,
      useTimeLimit,
      useAllSongs,
      continueWhenPlaylistEmpty,
      popularityStrategy
    });
  }

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

  // Calculate total weight for proper ratio distribution
  const totalWeight = playlistIds.reduce((sum, id) => sum + (ratioConfig[id].weight || 1), 0);
  
  // Calculate target counts for each playlist based on weights
  const targetCounts = {};
  let estimatedTotalSongs;
  
  if (useAllSongs) {
    // For "use all songs" mode, calculate the optimal mix length based on ratios and available content
    // Find the limiting playlist (the one that will run out first based on ratios)
    let minPossibleSongs = Infinity;
    
    // Check if any playlist uses time-based weighting
    const hasTimeBasedWeighting = playlistIds.some(id => ratioConfig[id].weightType === 'time');
    
    if (hasTimeBasedWeighting) {
      // For time-based weighting, calculate based on available duration
      let minPossibleDuration = Infinity;
      
      playlistIds.forEach(playlistId => {
        const config = ratioConfig[playlistId];
        const weight = config.weight || 1;
        const targetRatio = weight / totalWeight;
        const availableCount = cleanedPlaylistTracks[playlistId].length;
        
        // Calculate average song duration for this playlist from actual tracks
        const playlistTracks = cleanedPlaylistTracks[playlistId] || [];
        const totalDuration = playlistTracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0);
        const avgDurationSeconds = playlistTracks.length > 0 ? (totalDuration / playlistTracks.length) / 1000 : 210;
        const availableDurationSeconds = availableCount * avgDurationSeconds;
        
        // Calculate total mix duration if this playlist is the limiting factor
        const maxTotalDurationIfThisLimits = availableDurationSeconds / targetRatio;
        
        if (maxTotalDurationIfThisLimits < minPossibleDuration) {
          minPossibleDuration = maxTotalDurationIfThisLimits;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 ${playlistId}: ${availableCount} songs (${Math.round(availableDurationSeconds/60)}m), ${Math.round(targetRatio * 100)}% time ratio → max total: ${Math.round(maxTotalDurationIfThisLimits/60)}m`);
        }
      });
      
      // Convert total duration back to estimated song count using overall average
      const overallAvgDuration = playlistIds.reduce((sum, id) => {
        const playlistTracks = cleanedPlaylistTracks[id] || [];
        const totalDuration = playlistTracks.reduce((sum, track) => sum + (track.duration_ms || 0), 0);
        const avgDuration = playlistTracks.length > 0 ? (totalDuration / playlistTracks.length) / 1000 : 210;
        return sum + avgDuration;
      }, 0) / playlistIds.length;
      
      estimatedTotalSongs = Math.floor((minPossibleDuration / overallAvgDuration) * 1.05);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 useAllSongs (time-based): optimal mix = ${Math.round(minPossibleDuration/60)}m ≈ ${estimatedTotalSongs} songs`);
      }
    } else {
      // For frequency-based weighting, calculate based on song counts
      playlistIds.forEach(playlistId => {
        const weight = ratioConfig[playlistId].weight || 1;
        const targetRatio = weight / totalWeight;
        const availableCount = cleanedPlaylistTracks[playlistId].length;
        
        // Calculate how many total songs we could have if this playlist is the limiting factor
        const maxTotalIfThisLimits = Math.floor(availableCount / targetRatio);
        
        if (maxTotalIfThisLimits < minPossibleSongs) {
          minPossibleSongs = maxTotalIfThisLimits;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 ${playlistId}: ${availableCount} songs, ${Math.round(targetRatio * 100)}% freq ratio → max total: ${maxTotalIfThisLimits}`);
        }
      });
      
      // Add a small buffer (5%) to account for rounding variations
      estimatedTotalSongs = Math.floor(minPossibleSongs * 1.05);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 useAllSongs (frequency-based): optimal mix length = ${estimatedTotalSongs} songs (${minPossibleSongs} + 5% buffer)`);
      }
    }
  } else {
    estimatedTotalSongs = useTimeLimit ? Math.ceil(targetDuration / 3.5) : totalSongs;
  }
  
  playlistIds.forEach(playlistId => {
    const weight = ratioConfig[playlistId].weight || 1;
    const targetRatio = weight / totalWeight;
    targetCounts[playlistId] = Math.round(estimatedTotalSongs * targetRatio);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎯 ${playlistId}: weight ${weight}/${totalWeight} = ${Math.round(targetRatio * 100)}% → ~${targetCounts[playlistId]} songs`);
    }
  });

  const mixedTracks = [];
  const playlistCounts = {}; // Track songs added from each playlist
  const playlistDurations = {}; // Track total time added from each playlist
  const playlistExhausted = {}; // Track which playlists have run out of songs
  
  // Initialize tracking for each playlist
  playlistIds.forEach(playlistId => {
    playlistCounts[playlistId] = 0;
    playlistDurations[playlistId] = 0;
    playlistExhausted[playlistId] = false;
  });

  let attempts = 0;
  const maxAttempts = useAllSongs ? estimatedTotalSongs * 2 : (totalSongs || 100) * 10;

  const shouldContinue = () => {
    if (useAllSongs) {
      // Continue until we reach the calculated optimal length or playlists are exhausted
      const hasAvailableTracks = playlistIds.some(id => !playlistExhausted[id]);
      const belowTarget = mixedTracks.length < estimatedTotalSongs;
      
      if (process.env.NODE_ENV === 'development' && mixedTracks.length % 10 === 0) {
        console.log(`🔄 useAllSongs check: ${mixedTracks.length}/${estimatedTotalSongs} songs, hasAvailableTracks: ${hasAvailableTracks}`);
      }
      
      // Continue if we haven't reached target AND have available tracks
      // OR if continueWhenPlaylistEmpty is true and we still have tracks from some playlists
      return (belowTarget && hasAvailableTracks) || (continueWhenPlaylistEmpty && hasAvailableTracks);
    }
    
    if (useTimeLimit) {
      const currentDuration = calculateTotalDuration(mixedTracks) / (1000 * 60); // minutes
      return currentDuration < targetDuration;
    }
    return mixedTracks.length < totalSongs;
  };

  // Helper function to find which playlist needs more songs/time based on target ratios
  const getNextPlaylistId = () => {
    let bestPlaylistId = null;
    let maxDeficit = -1;
    
    for (const playlistId of playlistIds) {
      // Skip if playlist is exhausted
      if (playlistExhausted[playlistId]) continue;
      
      const config = ratioConfig[playlistId];
      const targetRatio = (config.weight || 1) / totalWeight;
      let currentRatio = 0;
      
      if (config.weightType === 'time') {
        // For time-based balancing, compare duration ratios
        const totalDurationSoFar = Object.values(playlistDurations).reduce((sum, dur) => sum + dur, 0);
        if (totalDurationSoFar > 0) {
          currentRatio = playlistDurations[playlistId] / totalDurationSoFar;
        }
        
        if (process.env.NODE_ENV === 'development') {
          const currentMinutes = Math.round(playlistDurations[playlistId] / (1000 * 60));
          const totalMinutes = Math.round(totalDurationSoFar / (1000 * 60));
          console.log(`⏱️ ${playlistId}: ${currentMinutes}m/${totalMinutes}m = ${Math.round(currentRatio * 100)}% (target: ${Math.round(targetRatio * 100)}%)`);
        }
      } else {
        // For frequency-based balancing, compare song count ratios
        if (mixedTracks.length > 0) {
          currentRatio = playlistCounts[playlistId] / mixedTracks.length;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🎵 ${playlistId}: ${playlistCounts[playlistId]}/${mixedTracks.length} = ${Math.round(currentRatio * 100)}% (target: ${Math.round(targetRatio * 100)}%)`);
        }
      }
      
      // Calculate how far behind this playlist is from its target ratio
      const deficit = targetRatio - currentRatio;
      
      // Check if playlist still has available tracks
      let estimatedLengthForCheck;
      if (useAllSongs) {
        estimatedLengthForCheck = estimatedTotalSongs;
      } else if (useTimeLimit) {
        estimatedLengthForCheck = Math.min(Math.ceil(targetDuration / 3.5), 200);
      } else {
        estimatedLengthForCheck = totalSongs;
      }
      const availableTracksForPlaylist = getTracksForPosition(popularityPools, playlistId, mixedTracks.length, estimatedLengthForCheck, popularityStrategy);
      const usedTrackIds = new Set(mixedTracks.map(t => t.id));
      const hasAvailableTracks = availableTracksForPlaylist.some(track => !usedTrackIds.has(track.id));
      
      if (!hasAvailableTracks) {
        playlistExhausted[playlistId] = true;
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚫 Playlist ${playlistId} is now exhausted`);
        }
        continue;
      }
      
      if (deficit > maxDeficit) {
        maxDeficit = deficit;
        bestPlaylistId = playlistId;
      }
    }
    
    return bestPlaylistId;
  };

  // Helper function to check if we should stop due to exhausted playlists
  const shouldStopDueToExhaustion = () => {
    const exhaustedPlaylists = Object.keys(playlistExhausted).filter(id => playlistExhausted[id]);
    const totalPlaylists = playlistIds.length;
    
    // If we're not set to continue when playlists are empty, stop when any playlist is exhausted
    if (!continueWhenPlaylistEmpty && exhaustedPlaylists.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🛑 Stopping due to exhausted playlist(s): ${exhaustedPlaylists.join(', ')}`);
      }
      return true;
    }
    
    // If all playlists are exhausted, we must stop regardless of setting
    if (exhaustedPlaylists.length === totalPlaylists) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🛑 All playlists exhausted, stopping`);
      }
      return true;
    }
    
    return false;
  };

  while (shouldContinue() && attempts < maxAttempts) {
    attempts++;

    // Check if we should stop due to playlist exhaustion
    if (shouldStopDueToExhaustion()) {
      break;
    }

    // Choose playlist based on weight ratios, not simple alternation
    const selectedPlaylistId = getNextPlaylistId();
    if (!selectedPlaylistId) break;
    
    const config = ratioConfig[selectedPlaylistId];

    // Get appropriate tracks based on position and strategy
    const currentPosition = mixedTracks.length;
    let estimatedTotalLength;
    
    if (useAllSongs) {
      // For "use all songs" mode, use the total available songs
      estimatedTotalLength = estimatedTotalSongs;
    } else if (useTimeLimit) {
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
      continue;
    }

    // Start with minimum songs
    let songsToTake = config.min || 1;
    
    // Check if we should add more songs to balance time
    if (config.max > config.min) {
      // Calculate current time balance based on configured weights
      const totalDurationSoFar = Object.values(playlistDurations).reduce((sum, dur) => sum + dur, 0);
      const currentPlaylistShare = playlistDurations[selectedPlaylistId];
      
      // Calculate expected share based on weight ratio
      const targetRatio = (config.weight || 1) / totalWeight;
      const expectedShare = totalDurationSoFar * targetRatio;
      
      // If this playlist is significantly behind in time, add more songs
      if (currentPlaylistShare < expectedShare * 0.8) {
        songsToTake = config.max;
        console.log(`Adding extra songs to ${selectedPlaylistId} for time balance (${Math.round(currentPlaylistShare/60000)}m vs expected ${Math.round(expectedShare/60000)}m)`);
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
        
        // Track duration and count for balancing
        playlistDurations[selectedPlaylistId] += selectedTrack.duration_ms || 0;
        playlistCounts[selectedPlaylistId]++;
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

    // Add metadata to trimmed tracks as well
    const exhaustedPlaylists = Object.keys(playlistExhausted).filter(id => playlistExhausted[id]);
    trimmedTracks.exhaustedPlaylists = exhaustedPlaylists;
    trimmedTracks.stoppedEarly = exhaustedPlaylists.length > 0 && !continueWhenPlaylistEmpty;
    
    if (process.env.NODE_ENV === 'development' && exhaustedPlaylists.length > 0) {
      console.log(`🏁 Time-limited mixing completed. Exhausted playlists: ${exhaustedPlaylists.join(', ')}`);
      if (trimmedTracks.stoppedEarly) {
        console.log(`⏹️ Stopped early due to playlist exhaustion (continueWhenPlaylistEmpty = false)`);
      }
    }
    
    return trimmedTracks;
  }

  // Add metadata about exhausted playlists to the result
  const exhaustedPlaylists = Object.keys(playlistExhausted).filter(id => playlistExhausted[id]);
  
  // For useAllSongs mode, don't truncate - use all generated tracks
  // For other modes, truncate to the specified limit
  const result = useAllSongs ? mixedTracks : mixedTracks.slice(0, totalSongs);
  
  // Add metadata to the result for UI feedback
  result.exhaustedPlaylists = exhaustedPlaylists;
  result.stoppedEarly = exhaustedPlaylists.length > 0 && !continueWhenPlaylistEmpty;
  
  if (process.env.NODE_ENV === 'development' && exhaustedPlaylists.length > 0) {
    console.log(`🏁 Mixing completed. Exhausted playlists: ${exhaustedPlaylists.join(', ')}`);
    if (result.stoppedEarly) {
      console.log(`⏹️ Stopped early due to playlist exhaustion (continueWhenPlaylistEmpty = false)`);
    }
  }
  
  return result;
};