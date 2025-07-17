import React from 'react';

const PresetTemplates = ({ selectedPlaylists, onApplyPreset }) => {
  const presets = [
    {
      id: 'house-party',
      name: '🏠 House Party',
      description: 'High energy with popular hits throughout',
      strategy: 'mixed',
      ratios: (playlists) => playlists.map(() => ({ min: 2, max: 4, weight: 2, weightType: 'frequency' })),
      settings: { recencyBoost: true, shuffleWithinGroups: true }
    },
    {
      id: 'wedding-reception',
      name: '💒 Wedding Reception',
      description: 'Build energy to peak in middle, then wind down',
      strategy: 'mid-peak',
      ratios: (playlists) => playlists.map(() => ({ min: 1, max: 3, weight: 2, weightType: 'time' })),
      settings: { recencyBoost: false, shuffleWithinGroups: true }
    },
    {
      id: 'workout-mix',
      name: '💪 Workout Mix',
      description: 'Front-loaded energy with consistent high tempo',
      strategy: 'front-loaded',
      ratios: (playlists) => playlists.map(() => ({ min: 3, max: 5, weight: 3, weightType: 'frequency' })),
      settings: { recencyBoost: true, shuffleWithinGroups: true }
    },
    {
      id: 'dinner-party',
      name: '🍽️ Dinner Party',
      description: 'Smooth flow with moderate energy throughout',
      strategy: 'mixed',
      ratios: (playlists) => playlists.map(() => ({ min: 1, max: 2, weight: 1, weightType: 'time' })),
      settings: { recencyBoost: false, shuffleWithinGroups: false }
    },
    {
      id: 'road-trip',
      name: '🚗 Road Trip',
      description: 'Build to epic finale with sing-along hits',
      strategy: 'crescendo',
      ratios: (playlists) => playlists.map(() => ({ min: 2, max: 3, weight: 2, weightType: 'frequency' })),
      settings: { recencyBoost: true, shuffleWithinGroups: true }
    },
    {
      id: 'latin-night',
      name: '💃 Latin Night',
      description: 'Perfect for bachata/salsa mixing with dance flow',
      strategy: 'mid-peak',
      ratios: (playlists) => playlists.map((_, index) => {
        // First playlist (usually bachata) gets higher weight
        if (index === 0) return { min: 2, max: 4, weight: 3, weightType: 'time' };
        // Second playlist (usually salsa) gets moderate weight
        if (index === 1) return { min: 1, max: 2, weight: 2, weightType: 'time' };
        // Others get lower weight
        return { min: 1, max: 2, weight: 1, weightType: 'time' };
      }),
      settings: { recencyBoost: true, shuffleWithinGroups: true }
    }
  ];

  const handleApplyPreset = (preset) => {
    if (selectedPlaylists.length === 0) {
      alert('Please add some playlists first!');
      return;
    }

    const ratioConfig = {};
    selectedPlaylists.forEach((playlist, index) => {
      ratioConfig[playlist.id] = preset.ratios(selectedPlaylists)[index] || { min: 1, max: 2, weight: 2, weightType: 'frequency' };
    });

    onApplyPreset({
      ratioConfig,
      strategy: preset.strategy,
      settings: preset.settings,
      presetName: preset.name
    });
  };

  if (selectedPlaylists.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <h2>🎯 Quick Start Templates</h2>
      <p>Apply proven mixing patterns for different occasions</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '12px', 
        marginTop: '16px' 
      }}>
        {presets.map(preset => (
          <div 
            key={preset.id}
            style={{
              background: 'var(--hunter-green)',
              border: '1px solid var(--fern-green)',
              borderRadius: '8px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => handleApplyPreset(preset)}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--fern-green)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'var(--hunter-green)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--moss-green)' }}>
              {preset.name}
            </h3>
            <p style={{ 
              margin: '0 0 12px 0', 
              fontSize: '14px', 
              opacity: '0.9',
              lineHeight: '1.4'
            }}>
              {preset.description}
            </p>
            <div style={{ fontSize: '12px', opacity: '0.7' }}>
              Strategy: {preset.strategy} • {selectedPlaylists.length} playlists
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        background: 'rgba(144, 169, 85, 0.1)', 
        borderRadius: '6px',
        fontSize: '12px',
        opacity: '0.8'
      }}>
        💡 <strong>Tip:</strong> These templates will automatically configure ratios and settings. You can still adjust them afterwards!
      </div>
    </div>
  );
};

export default PresetTemplates;