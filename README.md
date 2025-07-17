# 🎵 Spotify Playlist Mixer

Create custom playlists with perfect ratios from your favorite Spotify playlists! Mix genres with intelligent popularity strategies and time balancing.

## ✨ Features

### 🎯 **Quick Start Templates**
- **💃 Karimctiva**: Smart bachata/salsa mixing with dance flow (5 hours, mid-peak)
- **💪 Workout Mix**: High energy with consistent tempo (1 hour, front-loaded)
- **🚗 Road Trip**: Build to epic finale with sing-along hits (3 hours, crescendo)
- **Smart Detection**: Automatically detects bachata/salsa playlists for optimal ratios

### 🎛️ **Advanced Custom Ratios**
- Set min-max songs per group (e.g., exactly 2 bachata songs, then 1-2 salsa)
- Dual-range sliders with granular control (10-point frequency scale)
- **Time-based balancing**: Ensures equal playtime per genre (accounts for different song lengths)
- **Frequency-based balancing**: Traditional song count approach

### 🎯 **Smart Popularity Strategies**
- **Mixed**: Random selection from all popularity levels
- **Front-loaded**: Popular songs first, fade to deep cuts
- **Mid-peak**: Build to popular songs in middle (perfect for parties!)
- **Crescendo**: Build from deep cuts to biggest hits at the end

### ⏰ **Flexible Playlist Sizing**
- Create by song count (e.g., 100 songs)
- Or by time duration (e.g., 4 hours for a party)
- Smart preview system shows exactly what you'll get

### 🎨 **Enhanced User Experience**
- **Playlist cover images**: Visual identification throughout the interface
- **Live preview**: See your mix before creating the full playlist
- **Toast notifications**: Non-intrusive error handling
- **Smart scroll indicator**: Never miss newly created playlists
- **Rich playlist info**: Track counts and average song lengths

### 🚀 **Advanced Features**
- **Relative popularity**: Each playlist's hits are ranked within that genre
- **Recency boost**: Newer songs get popularity bonus
- **Intelligent time balancing**: Accounts for salsa (~4.5min) vs bachata (~3.5min) song lengths
- **URL-based input**: Add any public Spotify playlist via URL
- **Real-time ratio calculations**: See exact percentages and song estimates

## 🎉 Perfect For
- **Party DJs**: Create energy curves that build and peak at the right time
- **Genre mixing**: Blend bachata, salsa, reggaeton, pop, etc. with perfect ratios
- **Event planning**: Set exact durations for weddings, parties, workouts
- **Music discovery**: Find the perfect balance between hits and hidden gems

## 🚀 Getting Started

### Prerequisites
1. Create a Spotify app at [developer.spotify.com](https://developer.spotify.com/dashboard)
2. Add your domain as a redirect URI
3. Copy your Client ID

### Setup
1. Clone this repository
2. Install dependencies: `npm install`
3. Update `src/config.js` with your Spotify Client ID
4. Start the app: `npm start`

### Usage
1. **Connect Spotify**: Authorize the app with your Spotify account
2. **Add Playlists**: Paste Spotify playlist URLs (2-10 playlists)
3. **Configure Ratios**: Set song ranges and frequency for each playlist
4. **Choose Strategy**: Select popularity strategy (Mid-peak recommended for parties)
5. **Set Duration**: Choose song count or time limit
6. **Create Mix**: Generate your custom playlist!

## 🎵 Example Use Case

**Party Playlist Setup:**
- **Bachata**: 2-4 songs per group, High frequency, Time-balanced
- **Salsa**: 1-2 songs per group, Normal frequency, Time-balanced  
- **Reggaeton**: 1-3 songs per group, High frequency, Time-balanced
- **Strategy**: Mid-peak (builds energy in the middle)
- **Duration**: 4 hours

**Result**: A perfectly balanced party playlist that starts accessible, peaks with the biggest hits when everyone's dancing, and maintains great energy throughout!

## 🛠️ Built With
- React
- Spotify Web API
- Modern CSS with custom green theme
- Advanced playlist mixing algorithms

## 📝 License
MIT License - feel free to use and modify!

## 🤝 Contributing
Pull requests welcome! This tool was built for music lovers who want perfect playlist control.

---

*Mix your music, not your genres randomly!* 🎶