import React from 'react';

const RatioConfig = ({ selectedPlaylists, ratioConfig, onRatioUpdate, onPlaylistRemove }) => {
  // Helper function to format duration from seconds to MM:SS
  const formatDurationFromSeconds = (seconds) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleConfigChange = (playlistId, field, value) => {
    const currentConfig = ratioConfig[playlistId] || { min: 1, max: 2, weight: 2, weightType: 'frequency' };
    const newValue = field === 'weightType' ? value : (parseInt(value) || 1);
    onRatioUpdate(playlistId, {
      ...currentConfig,
      [field]: newValue
    });
  };

  return (
    <div className="card">
      <h2>🎛️ Customize Your Mix</h2>
      <p>Choose how your playlists blend together</p>
      
      <div className="ratio-controls">
        {selectedPlaylists.map(playlist => {
          const config = ratioConfig[playlist.id] || { min: 1, max: 2, weight: 1 };
          return (
            <div key={playlist.id} style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              padding: '16px', 
              borderRadius: '8px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', position: 'relative' }}>
                {playlist.coverImage && (
                  <img 
                    src={playlist.coverImage} 
                    alt={playlist.name} 
                    className="playlist-cover" 
                    style={{ marginRight: '12px' }}
                  />
                )}
                <div className="playlist-info" style={{ flex: 1 }}>
                  <strong style={{ fontSize: '16px' }}>{playlist.name}</strong>
                  <div style={{ fontSize: '14px', opacity: '0.8', marginTop: '2px' }}>
                    {playlist.tracks.total} tracks
                    {playlist.realAverageDurationSeconds && (
                      <span> • avg {formatDurationFromSeconds(playlist.realAverageDurationSeconds)} per song</span>
                    )}
                    {playlist.realAverageDurationSeconds && playlist.tracksWithDuration !== playlist.tracks.total && (
                      <span style={{ fontSize: '12px', opacity: '0.6' }}>
                        {' '}({playlist.tracksWithDuration} with duration data)
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onPlaylistRemove && onPlaylistRemove(playlist.id)}
                  style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    background: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#cc0000'}
                  onMouseLeave={(e) => e.target.style.background = '#ff4444'}
                  title={`Remove ${playlist.name}`}
                >
                  ×
                </button>
              </div>
              
              <div className="input-group">
                <label>🎵 Play together: {config.min === config.max ? `${config.min} song${config.min > 1 ? 's' : ''}` : `${config.min}-${config.max} songs`}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', opacity: '0.7' }}>1</span>
                  <div style={{ flex: 1, position: 'relative', height: '20px' }}>
                    <div className="dual-range-slider">
                      <input
                        type="range"
                        min="1"
                        max="8"
                        value={config.min}
                        onChange={(e) => {
                          const newMin = parseInt(e.target.value);
                          handleConfigChange(playlist.id, 'min', newMin);
                          if (newMin > config.max) {
                            handleConfigChange(playlist.id, 'max', newMin);
                          }
                        }}
                        className="range-min"
                      />
                      <input
                        type="range"
                        min="1"
                        max="8"
                        value={config.max}
                        onChange={(e) => {
                          const newMax = parseInt(e.target.value);
                          if (newMax >= config.min) {
                            handleConfigChange(playlist.id, 'max', newMax);
                          }
                        }}
                        className="range-max"
                      />
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', opacity: '0.7' }}>8</span>
                </div>
                <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
                  How many songs play back-to-back from this playlist
                </div>
              </div>
              

              
              <div className="input-group">
                <label>⚖️ Balance Method:</label>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={`toggle-option ${(config.weightType || 'frequency') === 'frequency' ? 'active' : ''}`}
                    onClick={() => handleConfigChange(playlist.id, 'weightType', 'frequency')}
                  >
                    Same Song Count
                  </button>
                  <button
                    type="button"
                    className={`toggle-option ${config.weightType === 'time' ? 'active' : ''}`}
                    onClick={() => handleConfigChange(playlist.id, 'weightType', 'time')}
                  >
                    Same Play Time
                  </button>
                </div>
                <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
                  {config.weightType === 'time' 
                    ? 'Perfect for mixing genres with different song lengths (salsa vs bachata)'
                    : 'Traditional approach - equal number of songs from each playlist'
                  }
                </div>
              </div>
              
              <div className="input-group">
                <label>
                  🎲 Selection Priority: {(() => {
                    const weight = config.weight || 2;
                    const totalWeight = Object.values(ratioConfig).reduce((sum, cfg) => sum + (cfg.weight || 1), 0);
                    const percentage = Math.round((weight / totalWeight) * 100);
                    
                    if (weight <= 2) return `Low Priority (${weight}) - ~${percentage}% of mix`;
                    if (weight <= 4) return `Normal Priority (${weight}) - ~${percentage}% of mix`;
                    if (weight <= 6) return `High Priority (${weight}) - ~${percentage}% of mix`;
                    if (weight <= 8) return `Top Priority (${weight}) - ~${percentage}% of mix`;
                    return `Maximum Priority (${weight}) - ~${percentage}% of mix`;
                  })()}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', opacity: '0.7' }}>Lower</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={config.weight}
                    onChange={(e) => handleConfigChange(playlist.id, 'weight', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', opacity: '0.7' }}>Higher</span>
                </div>
                <div style={{ fontSize: '11px', opacity: '0.6', marginTop: '4px' }}>
                  Higher priority = more songs selected from this playlist
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {selectedPlaylists.length > 1 && (
        <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
          <div style={{ padding: '8px', background: 'rgba(29, 185, 84, 0.1)', borderRadius: '4px' }}>
            {(() => {
              const totalWeight = selectedPlaylists.reduce((sum, p) => {
                const config = ratioConfig[p.id] || { weight: 1 };
                return sum + config.weight;
              }, 0);
              
              // Check if any playlists use time-balanced weighting
              const hasTimeBalanced = selectedPlaylists.some(p => {
                const config = ratioConfig[p.id] || { weightType: 'frequency' };
                return config.weightType === 'time';
              });
              
              const exampleTitle = hasTimeBalanced ? 'Example Mix (per 60 minutes):' : 'Example Mix (per 100 songs):';
              const baseAmount = hasTimeBalanced ? 60 : 100; // 60 minutes or 100 songs
              
              return (
                <>
                  <strong>🎯 {exampleTitle}</strong>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>
                    {selectedPlaylists.map(playlist => {
                      const config = ratioConfig[playlist.id] || { weight: 1, weightType: 'frequency' };
                      const percentage = Math.round((config.weight / totalWeight) * 100);
                      const weightTypeText = config.weightType === 'time' ? 'same play time' : 'same song count';
                      
                      let displayText;
                      
                      if (hasTimeBalanced && config.weightType === 'time' && playlist.realAverageDurationSeconds) {
                        // Time-balanced calculation: distribute 60 minutes based on weight percentage
                        const playlistAvgMinutes = playlist.realAverageDurationSeconds / 60;
                        const playlistMinutes = (percentage / 100) * baseAmount; // percentage of 60 minutes
                        const exactSongs = playlistMinutes / playlistAvgMinutes;
                        const minSongs = Math.floor(exactSongs);
                        const maxSongs = Math.ceil(exactSongs);
                        const formattedMinutes = playlistMinutes.toFixed(1);
                        
                        const songsText = minSongs === maxSongs ? `${minSongs}` : `${minSongs}-${maxSongs}`;
                        displayText = `~${songsText} songs (${formattedMinutes} min, ${percentage}%)`;
                      } else if (hasTimeBalanced && config.weightType === 'frequency') {
                        // For frequency-based in time context: estimate based on average duration
                        const playlistAvgMinutes = playlist.realAverageDurationSeconds ? playlist.realAverageDurationSeconds / 60 : 3.5;
                        const playlistMinutes = (percentage / 100) * baseAmount;
                        const exactSongs = playlistMinutes / playlistAvgMinutes;
                        const minSongs = Math.floor(exactSongs);
                        const maxSongs = Math.ceil(exactSongs);
                        const formattedMinutes = playlistMinutes.toFixed(1);
                        
                        const songsText = minSongs === maxSongs ? `${minSongs}` : `${minSongs}-${maxSongs}`;
                        displayText = `~${songsText} songs (${formattedMinutes} min, ${percentage}%)`;
                      } else {
                        // Pure frequency-based: simple percentage of 100 songs
                        const exactSongs = (percentage / 100) * baseAmount;
                        const minSongs = Math.floor(exactSongs);
                        const maxSongs = Math.ceil(exactSongs);
                        
                        const songsText = minSongs === maxSongs ? `${minSongs}` : `${minSongs}-${maxSongs}`;
                        displayText = `~${songsText} songs (${percentage}%)`;
                      }
                      
                      const groupText = config.min === config.max ? 
                        (config.min === 1 ? '1 at a time' : `${config.min} at a time`) : 
                        `${config.min}-${config.max} at a time`;
                      
                      return (
                        <div key={playlist.id}>
                          • <strong>{playlist.name}:</strong> {displayText}, {groupText} ({weightTypeText})
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default RatioConfig;