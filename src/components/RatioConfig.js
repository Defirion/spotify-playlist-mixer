import React from 'react';

const RatioConfig = ({ selectedPlaylists, ratioConfig, onRatioUpdate }) => {
  const handleConfigChange = (playlistId, field, value) => {
    const currentConfig = ratioConfig[playlistId] || { min: 1, max: 2, weight: 1, weightType: 'frequency' };
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
              <h4>{playlist.name}</h4>
              
              <div className="input-group">
                <label>Min songs in sequence:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.min}
                  onChange={(e) => handleConfigChange(playlist.id, 'min', e.target.value)}
                />
              </div>
              
              <div className="input-group">
                <label>Max songs in sequence:</label>
                <input
                  type="number"
                  min={config.min}
                  max="10"
                  value={config.max}
                  onChange={(e) => handleConfigChange(playlist.id, 'max', e.target.value)}
                />
              </div>
              
              <div className="input-group">
                <label>Playlist Limit (optional):</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={config.limitType || 'none'}
                    onChange={(e) => handleConfigChange(playlist.id, 'limitType', e.target.value)}
                    style={{ flex: '0 0 auto', width: '120px' }}
                  >
                    <option value="none">No limit</option>
                    <option value="songs">Max songs</option>
                    <option value="time">Max minutes</option>
                  </select>
                  
                  {config.limitType && config.limitType !== 'none' && (
                    <input
                      type="number"
                      min="1"
                      max={config.limitType === 'songs' ? '200' : '300'}
                      value={config.limitValue || ''}
                      onChange={(e) => handleConfigChange(playlist.id, 'limitValue', e.target.value)}
                      placeholder={config.limitType === 'songs' ? 'Songs' : 'Minutes'}
                      style={{ flex: 1 }}
                    />
                  )}
                </div>
                <div style={{ fontSize: '12px', opacity: '0.7', marginTop: '4px' }}>
                  Set a maximum for this specific playlist (e.g., "max 30 bachata songs" or "max 60 minutes of salsa")
                </div>
              </div>
              
              <div className="input-group">
                <label>Weighting Strategy:</label>
                <select
                  value={config.weightType || 'frequency'}
                  onChange={(e) => handleConfigChange(playlist.id, 'weightType', e.target.value)}
                >
                  <option value="frequency">By Frequency (song count)</option>
                  <option value="time">By Time (equal playtime)</option>
                </select>
              </div>
              
              <div className="input-group">
                <label>
                  {config.weightType === 'time' ? 'Time Weight:' : 'Frequency:'}
                </label>
                <select
                  value={config.weight}
                  onChange={(e) => handleConfigChange(playlist.id, 'weight', e.target.value)}
                >
                  <option value="1">Low (1x)</option>
                  <option value="2">Normal (2x)</option>
                  <option value="3">High (3x)</option>
                  <option value="4">Very High (4x)</option>
                </select>
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
            const frequencyText = {
              1: 'Low',
              2: 'Normal', 
              3: 'High',
              4: 'Very High'
            }[config.weight] || 'Normal';
            
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
                
                return selectedPlaylists.map(playlist => {
                  const config = ratioConfig[playlist.id] || { weight: 1, weightType: 'frequency' };
                  const percentage = Math.round((config.weight / totalWeight) * 100);
                  const avgSongs = Math.round((config.min + config.max) / 2);
                  const estimatedSongs = Math.round((percentage / 100) * 100);
                  const weightTypeText = config.weightType === 'time' ? 'time-balanced' : 'frequency-based';
                  
                  return (
                    <div key={playlist.id}>
                      • <strong>{playlist.name}:</strong> ~{estimatedSongs} songs ({percentage}%) in groups of {avgSongs} ({weightTypeText})
                    </div>
                  );
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