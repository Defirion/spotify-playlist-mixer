# 🎵 Spotify Playlist Mixer

Create custom playlists with perfect ratios from your favorite Spotify playlists! Mix genres with intelligent popularity strategies and time balancing.

## ✨ Features

### 🎛️ **Custom Ratios**
- Set min-max songs per group (e.g., 2-4 bachata songs, then 1-2 salsa)
- Dual-range sliders for intuitive control
- Time-based balancing ensures equal playtime per genre

### 🎯 **Smart Popularity Strategies**
- **Mixed**: Random selection from all popularity levels
- **Front-loaded**: Popular songs first, fade to deep cuts
- **Mid-peak**: Build to popular songs in middle (perfect for parties!)
- **Crescendo**: Build from deep cuts to biggest hits at the end

### ⏰ **Flexible Playlist Sizing**
- Create by song count (e.g., 100 songs)
- Or by time duration (e.g., 4 hours for a party)

### 🚀 **Advanced Features**
- **Relative popularity**: Each playlist's hits are ranked within that genre
- **Recency boost**: Newer songs get popularity bonus
- **Time balancing**: Automatically adds extra songs to balance total playtime
- **URL-based input**: Add any public Spotify playlist via URL

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