import React from 'react';

const PresetTemplates = ({ selectedPlaylists, onApplyPreset }) => {
    const presets = [
        {
            id: 'karimctiva',
            name: '💃 Karimctiva',
            description: 'Perfect for bachata/salsa mixing with dance flow',
            strategy: 'mid-peak',
            ratios: (playlists) => playlists.map((playlist) => {
                const name = playlist.name.toLowerCase();
                if (name.includes('bachata')) {
                    return { min: 2, max: 2, weight: 10, weightType: 'time' }; // Maximum frequency (10)
                } else if (name.includes('salsa')) {
                    return { min: 1, max: 2, weight: 8, weightType: 'time' }; // Very High frequency (8)
                } else {
                    return { min: 1, max: 2, weight: 5, weightType: 'time' }; // Medium frequency (5)
                }
            }),
            settings: { recencyBoost: true, shuffleWithinGroups: true, useTimeLimit: true, targetDuration: 300 }
        },
        {
            id: 'workout-mix',
            name: '💪 Workout Mix',
            description: 'High energy with consistent tempo',
            strategy: 'front-loaded',
            ratios: (playlists) => playlists.map(() => ({ min: 3, max: 5, weight: 3, weightType: 'frequency' })),
            settings: { recencyBoost: true, shuffleWithinGroups: true, useTimeLimit: true, targetDuration: 60 }
        },
        {
            id: 'road-trip',
            name: '🚗 Road Trip',
            description: 'Build to epic finale with sing-along hits',
            strategy: 'crescendo',
            ratios: (playlists) => playlists.map(() => ({ min: 2, max: 3, weight: 2, weightType: 'frequency' })),
            settings: { recencyBoost: true, shuffleWithinGroups: true, useTimeLimit: true, targetDuration: 180 }
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '10px',
                marginTop: '16px'
            }}>
                {presets.map(preset => (
                    <div
                        key={preset.id}
                        className="preset-card"
                        onClick={() => handleApplyPreset(preset)}
                    >
                        <h3 style={{ margin: '0 0 6px 0', color: 'var(--moss-green)', fontSize: '16px' }}>
                            {preset.name}
                        </h3>
                        <p style={{
                            margin: '0 0 8px 0',
                            fontSize: '13px',
                            opacity: '0.9',
                            lineHeight: '1.3'
                        }}>
                            {preset.description}
                        </p>
                        <div style={{ fontSize: '11px', opacity: '0.7' }}>
                            Strategy: {preset.strategy} • {selectedPlaylists.length} playlists
                        </div>
                    </div>
                ))}
            </div>

            <div style={{
                marginTop: '12px',
                padding: '8px',
                background: 'rgba(144, 169, 85, 0.1)',
                borderRadius: '6px',
                fontSize: '11px',
                opacity: '0.8'
            }}>
                💡 <strong>Tip:</strong> These templates will automatically configure ratios and settings. You can still adjust them afterwards!
            </div>
        </div>
    );
};

export default PresetTemplates;