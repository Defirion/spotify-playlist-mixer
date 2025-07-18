import React, { useState } from 'react';

const RatioConfig = ({ selectedPlaylists, ratioConfig, onRatioUpdate, onPlaylistRemove }) => {
  const [globalBalanceMethod, setGlobalBalanceMethod] = useState('frequency');

  // Update global balance method when ratioConfig changes (from presets)
  React.useEffect(() => {
    if (selectedPlaylists.length > 0 && ratioConfig) {
      // Check if any playlist has weightType 'time'
      const hasTimeWeighting = selectedPlaylists.some(playlist => {
        const config = ratioConfig[playlist.id];
        return config && config.weightType === 'time';
      });
      
      // Set global balance method based on the weightType found
      const newMethod = hasTimeWeighting ? 'time' : 'frequency';
      if (newMethod !== globalBalanceMethod) {
        setGlobalBalanceMethod(newMethod);
      }
    }
  }, [ratioConfig, selectedPlaylists, globalBalanceMethod]);
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

  const handleGlobalBalanceMethodChange = (method) => {
    setGlobalBalanceMethod(method);
    // Update all playlists to use the new balance method
    selectedPlaylists.forEach(playlist => {
      handleConfigChange(playlist.id, 'weightType', method);
    });
  };

  return (
    <div className="card">
      <style>
        {`
          .ratio-config-slider {
            -webkit-appearance: none !important;
            appearance: none !important;
            height: 6px !important;
            background: var(--hunter-green) !important;
            border-radius: 3px !important;
            outline: none !important;
            cursor: pointer !important;
            border: 1px solid var(--fern-green) !important;
            padding: 12px 1px !important;
            margin: 0 !important;
          }
          
          .ratio-config-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            background: var(--moss-green);
            border-radius: 4px;
            cursor: pointer;
            border: 2px solid var(--mindaro);
            box-shadow: 0 2px 4px rgba(19, 42, 19, 0.3);
          }
          
          .ratio-config-slider::-moz-range-thumb {
            width: 18px;
            height: 18px;
            background: var(--moss-green);
            border-radius: 4px;
            cursor: pointer;
            border: 2px solid var(--mindaro);
            box-shadow: 0 2px 4px rgba(19, 42, 19, 0.3);
          }
          
          .ratio-config-slider:hover::-webkit-slider-thumb {
            background: var(--fern-green);
            transform: scale(1.1);
          }
          
          .ratio-config-slider:hover::-moz-range-thumb {
            background: var(--fern-green);
            transform: scale(1.1);
          }
          
          .dual-range-slider {
            position: relative !important;
            width: 100% !important;
            height: 20px !important;
          }
          
          .dual-range-slider::before {
            content: '' !important;
            position: absolute !important;
            top: 50% !important;
            left: 0 !important;
            right: 0 !important;
            height: 6px !important;
            background: var(--hunter-green) !important;
            border-radius: 3px !important;
            transform: translateY(-50%) !important;
            z-index: 1 !important;
          }
          
          .dual-range-slider input[type="range"] {
            position: absolute !important;
            width: 100% !important;
            height: 6px !important;
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            outline: none !important;
            cursor: pointer !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            pointer-events: none !important;
            border-radius: 3px !important;
          }
          
          .dual-range-slider input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none !important;
            appearance: none !important;
            width: 18px !important;
            height: 18px !important;
            background: var(--moss-green) !important;
            border-radius: 4px !important;
            border: 2px solid var(--mindaro) !important;
            cursor: pointer !important;
            box-shadow: 0 2px 4px rgba(19, 42, 19, 0.3) !important;
            pointer-events: all !important;
            position: relative !important;
          }
          
          .dual-range-slider input[type="range"]::-moz-range-thumb {
            width: 18px !important;
            height: 18px !important;
            background: var(--moss-green) !important;
            border-radius: 4px !important;
            border: 2px solid var(--mindaro) !important;
            cursor: pointer !important;
            box-shadow: 0 2px 4px rgba(19, 42, 19, 0.3) !important;
            pointer-events: all !important;
            position: relative !important;
          }
          
          .dual-range-slider .range-min {
            z-index: 2 !important;
          }
          
          .dual-range-slider .range-max {
            z-index: 3 !important;
          }
          
          .dual-range-slider .range-min::-webkit-slider-thumb {
            background: var(--fern-green) !important;
            z-index: 2 !important;
          }
          
          .dual-range-slider .range-max::-webkit-slider-thumb {
            background: var(--moss-green) !important;
            z-index: 3 !important;
          }

          @media (max-width: 768px) {
            .ratio-grid {
              grid-template-columns: 1fr !important;
              text-align: center;
            }
            .ratio-grid > * {
              grid-column: 1 / -1 !important;
            }
            .playlist-cover {
              margin: 0 auto 16px;
            }
            .slider-container {
              width: 100%;
            }
            .remove-button-cell {
              justify-self: center;
              margin-top: 10px;
            }
          }
        `}
      </style>
      <h2>🎛️ Customize Your Mix</h2>
      <p>Choose how your playlists blend together</p>
      
      {/* Universal Balance Method */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.08)', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <label style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px', display: 'block' }}>
          ⚖️ Balance Method (applies to all playlists):
        </label>
        <div className="toggle-group">
          <button
            type="button"
            className={`toggle-option ${globalBalanceMethod === 'frequency' ? 'active' : ''}`}
            onClick={() => handleGlobalBalanceMethodChange('frequency')}
          >
            Same Song Count
          </button>
          <button
            type="button"
            className={`toggle-option ${globalBalanceMethod === 'time' ? 'active' : ''}`}
            onClick={() => handleGlobalBalanceMethodChange('time')}
          >
            Same Play Time
          </button>
        </div>
        <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '8px' }}>
          {globalBalanceMethod === 'time' 
            ? 'Perfect for mixing genres with different song lengths (salsa vs bachata)'
            : 'Traditional approach - equal number of songs from each playlist'
          }
        </div>
      </div>
      
      <div className="ratio-controls" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {selectedPlaylists.map(playlist => {
          const config = ratioConfig[playlist.id] || { min: 1, max: 2, weight: 1 };
          return (
            <div key={playlist.id} style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              padding: '16px', 
              borderRadius: '8px' 
            }}>
              <div 
                className="ratio-grid"
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: playlist.coverImage ? 'auto auto 1fr auto' : 'auto 1fr auto',
                  alignItems: 'center', 
                  gap: '16px', 
                  width: '100%' 
                }}
              >
                {playlist.coverImage && (
                  <img 
                    src={playlist.coverImage} 
                    alt={playlist.name} 
                    className="playlist-cover"
                  />
                )}
                <div className="playlist-info">
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
                
                {/* Inline Sliders */}
                <div className="slider-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', opacity: '0.8', textAlign: 'center' }}>
                    🎵 Play together: {config.min === config.max ? `${config.min} song${config.min > 1 ? 's' : ''}` : `${config.min}-${config.max} songs`}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', opacity: '0.7' }}>1</span>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <div className="dual-range-background" style={{
                        width: '100%',
                        height: '6px',
                        background: 'var(--hunter-green)',
                        border: '1px solid var(--fern-green)',
                        borderRadius: '3px',
                        padding: '12px 1px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div className="dual-range-slider" style={{ 
                          width: '100%',
                          height: '6px',
                          position: 'relative',
                          marginTop: '14px'
                        }}>
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
                          className="range-min ratio-config-slider"
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
                          className="range-max ratio-config-slider"
                        />
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', opacity: '0.7' }}>8</span>
                  </div>
                  
                  <div style={{ fontSize: '12px', opacity: '0.8', textAlign: 'center' }}>
                    🎲 Priority: {(() => {
                      const weight = config.weight || 20;
                      const totalWeight = Object.values(ratioConfig).reduce((sum, cfg) => sum + (cfg.weight || 20), 0);
                      const percentage = Math.round((weight / totalWeight) * 100);
                      
                      if (weight <= 20) return `Low (${weight}) - ~${percentage}% of mix`;
                      if (weight <= 40) return `Normal (${weight}) - ~${percentage}% of mix`;
                      if (weight <= 60) return `High (${weight}) - ~${percentage}% of mix`;
                      if (weight <= 80) return `Top (${weight}) - ~${percentage}% of mix`;
                      return `Max (${weight}) - ~${percentage}% of mix`;
                    })()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', opacity: '0.7' }}>Low</span>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={config.weight}
                      onChange={(e) => handleConfigChange(playlist.id, 'weight', e.target.value)}
                      className="ratio-config-slider"
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: '10px', opacity: '0.7' }}>High</span>
                  </div>
                </div>
                
                <button
                  onClick={() => onPlaylistRemove && onPlaylistRemove(playlist.id)}
                  style={{
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
                    transition: 'background-color 0.2s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#cc0000'}
                  onMouseLeave={(e) => e.target.style.background = '#ff4444'}
                  title={`Remove ${playlist.name}`}
                >
                  ×
                </button>
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
              
              // Use global balance method instead of checking individual playlists
              const hasTimeBalanced = globalBalanceMethod === 'time';
              
              const exampleTitle = hasTimeBalanced ? 'Example Mix (per 60 minutes):' : 'Example Mix (per 100 songs):';
              const baseAmount = hasTimeBalanced ? 60 : 100; // 60 minutes or 100 songs
              
              return (
                <>
                  <strong>🎯 {exampleTitle}</strong>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>
                    {selectedPlaylists.map(playlist => {
                      const config = ratioConfig[playlist.id] || { weight: 1, weightType: 'frequency' };
                      const percentage = Math.round((config.weight / totalWeight) * 100);
                      const weightTypeText = globalBalanceMethod === 'time' ? 'same play time' : 'same song count';
                      
                      let displayText;
                      
                      if (hasTimeBalanced && globalBalanceMethod === 'time' && playlist.realAverageDurationSeconds) {
                        // Time-balanced calculation: distribute 60 minutes based on weight percentage
                        const playlistAvgMinutes = playlist.realAverageDurationSeconds / 60;
                        const playlistMinutes = (percentage / 100) * baseAmount; // percentage of 60 minutes
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