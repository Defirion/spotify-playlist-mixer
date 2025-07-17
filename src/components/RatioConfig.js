import React from 'react';

const RatioConfig = ({ selectedPlaylists, ratioConfig, onRatioUpdate }) => {
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
      <h2>Configure Ratios & Patterns</h2>
      <p>Set how many songs from each playlist should play in sequence</p>
      
      <div className="ratio-controls">
        {selectedPlaylists.map(playlist => {
          const config = ratioConfig[playlist.id] || { min: 1, max: 2, weight: 1 };
          return (
            <div key={playlist.id} style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              padding: '16px', 
              borderRadius: '8px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                {playlist.coverImage && (
                  <img 
                    src={playlist.coverImage} 
                    alt={playlist.name} 
                    className="playlist-cover" 
                    style={{ marginRight: '12px' }}
                  />
                )}
                <div className="playlist-info">
                  <strong style={{ fontSize: '16px' }}>{playlist.name}</strong>
                  <div style={{ fontSize: '14px', opacity: '0.8', marginTop: '2px' }}>
                    {playlist.tracks.total} tracks • avg {(() => {
                      // Calculate average track length based on playlist name
                      const name = playlist.name.toLowerCase();
                      if (name.includes('salsa')) {
                        return '4:30';
                      } else if (name.includes('bachata')) {
                        return '3:30';
                      } else {
                        return '3:30';
                      }
                    })()} per song
                  </div>
                </div>
              </div>
              
              <div className="input-group">
                <label>Songs per group: {config.min === config.max ? config.min : `${config.min}-${config.max}`}</label>
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
                  Drag handles to set min-max range of songs that play together
                </div>
              </div>
              

              
              <div className="input-group">
                <label>Weighting Strategy:</label>
                <div className="toggle-group">
                  <button
                    type="button"
                    className={`toggle-option ${(config.weightType || 'frequency') === 'frequency' ? 'active' : ''}`}
                    onClick={() => handleConfigChange(playlist.id, 'weightType', 'frequency')}
                  >
                    By Frequency
                  </button>
                  <button
                    type="button"
                    className={`toggle-option ${config.weightType === 'time' ? 'active' : ''}`}
                    onClick={() => handleConfigChange(playlist.id, 'weightType', 'time')}
                  >
                    By Time
                  </button>
                </div>
                <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
                  {config.weightType === 'time' 
                    ? 'Balances total playtime per genre (good for different song lengths)'
                    : 'Balances song count per genre (traditional approach)'
                  }
                </div>
              </div>
              
              <div className="input-group">
                <label>
                  Frequency: {(() => {
                    const weight = config.weight || 2;
                    if (weight <= 2) return 'Low';
                    if (weight <= 4) return 'Normal';
                    if (weight <= 6) return 'High';
                    if (weight <= 8) return 'Very High';
                    return 'Maximum';
                  })()}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', opacity: '0.7' }}>Low</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={config.weight}
                    onChange={(e) => handleConfigChange(playlist.id, 'weight', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', opacity: '0.7' }}>Maximum</span>
                </div>
                <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
                  {config.weightType === 'time' 
                    ? 'Adjusts for song length to balance total playtime per genre'
                    : 'Higher frequency = more songs from this playlist in the mix'
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
        <h4>Pattern Preview:</h4>
        <div style={{ fontSize: '14px', marginTop: '8px' }}>
          {selectedPlaylists.map(playlist => {
            const config = ratioConfig[playlist.id] || { min: 1, max: 2, weight: 1 };
            const frequencyText = (() => {
              const weight = config.weight || 2;
              if (weight <= 2) return 'Low';
              if (weight <= 4) return 'Normal';
              if (weight <= 6) return 'High';
              if (weight <= 8) return 'Very High';
              return 'Maximum';
            })();
            
            return (
              <div key={playlist.id} style={{ marginBottom: '4px' }}>
                <strong>{playlist.name}:</strong> {config.min}-{config.max} songs per group, {frequencyText} frequency
              </div>
            );
          })}
        </div>
        
        {selectedPlaylists.length > 1 && (
          <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(29, 185, 84, 0.1)', borderRadius: '4px' }}>
            <strong>Example Mix (per 100 songs):</strong>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              {(() => {
                const totalWeight = selectedPlaylists.reduce((sum, p) => {
                  const config = ratioConfig[p.id] || { weight: 1 };
                  return sum + config.weight;
                }, 0);
                
                // Calculate average song duration for each playlist
                const playlistAvgDurations = {};
                selectedPlaylists.forEach(playlist => {
                  // Estimate average song duration (you can make this more accurate by fetching actual data)
                  // For now, use reasonable estimates: Salsa ~4.5min, Bachata ~3.5min, others ~3.5min
                  const name = playlist.name.toLowerCase();
                  if (name.includes('salsa')) {
                    playlistAvgDurations[playlist.id] = 4.5; // minutes
                  } else if (name.includes('bachata')) {
                    playlistAvgDurations[playlist.id] = 3.5; // minutes
                  } else {
                    playlistAvgDurations[playlist.id] = 3.5; // minutes - default
                  }
                });
                
                return selectedPlaylists.map(playlist => {
                  const config = ratioConfig[playlist.id] || { weight: 1, weightType: 'frequency' };
                  const percentage = Math.round((config.weight / totalWeight) * 100);
                  const avgSongs = Math.round((config.min + config.max) / 2);
                  const avgDuration = playlistAvgDurations[playlist.id] || 3.5;
                  const weightTypeText = config.weightType === 'time' ? 'time-balanced' : 'frequency-based';
                  
                  if (config.weightType === 'time') {
                    // For time-balanced, calculate based on duration
                    const totalMinutes = 100 * 3.5; // Assume 100 songs * 3.5 min average
                    const playlistMinutes = Math.round((percentage / 100) * totalMinutes);
                    const estimatedSongs = Math.round(playlistMinutes / avgDuration);
                    
                    return (
                      <div key={playlist.id}>
                        • <strong>{playlist.name}:</strong> ~{estimatedSongs} songs ({percentage}%) in groups of {avgSongs} ({weightTypeText})
                      </div>
                    );
                  } else {
                    // For frequency-based, use song count
                    const estimatedSongs = Math.round((percentage / 100) * 100);
                    
                    return (
                      <div key={playlist.id}>
                        • <strong>{playlist.name}:</strong> ~{estimatedSongs} songs ({percentage}%) in groups of {avgSongs} ({weightTypeText})
                      </div>
                    );
                  }
                });
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RatioConfig;