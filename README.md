# spotify-playlist-mixer

## Testing

Tests run on CRA's Jest setup. MSW has been removed from this repository —
tests use local mocks (under `src/test-utils/mocks`) or stub `global.fetch`
directly when network behavior needs to be simulated. Centralized hook mocks
for the mixing hooks are registered in `src/setupTests.ts`.

Quick commands:

```powershell
# Run all tests
npm test

# Run only integration tests (fast check)
npm test -- --testPathPattern=src/__tests__/integration --watchAll=false
```

# 🎵 Spotify Playlist Mixer v1.0

**The Ultimate Spotify Playlist Mixing Tool** - Create perfectly balanced custom playlists with professional-grade controls, intelligent algorithms, and real-time preview capabilities.

![Version](https://img.shields.io/badge/version-1.0.0-brightgreen)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 What Makes This Special

Transform your music experience with **studio-quality playlist mixing** that rivals professional DJ software (not really though :P). Whether you're planning a party, workout session, or road trip, create the perfect soundtrack with precision controls and intelligent automation.

## ✨ Key Features

### 🎯 **Smart Preset Templates**

**One-click professional mixing patterns:**

- **💃 Karimctiva**: Intelligent bachata/salsa mixing with dance flow optimization
  - Automatically detects bachata/salsa playlists
  - Uses time-based balancing for perfect genre transitions
  - 5-hour duration with mid-peak energy curve
- **💪 Workout Mix**: High-energy consistency with front-loaded hits (1 hour)
- **🚗 Road Trip**: Epic crescendo build-up for sing-along moments (3 hours)

### 🎛️ **Advanced Inline Slider Controls**

**Revolutionary space-optimized interface:**

- **Adaptive Grid Layout**: Maximizes horizontal space usage with CSS Grid
- **Dual-Range Sliders**: Set precise "Play Together" ranges (1-8 songs per group)
- **High-Precision Priority**: 100-step granular control (vs. traditional 10-step)
- **Real-Time Percentages**: See exact mix distribution as you adjust
- **Inline Positioning**: Sliders positioned between playlist info and controls
- **Professional Styling**: Consistent visual design with proper padding/borders

### ⚖️ **Intelligent Balance Methods**

**Two sophisticated balancing approaches:**

- **Same Play Time**: Perfect for mixing genres with different song lengths
  - Accounts for salsa (~4.5min) vs bachata (~3.5min) differences
  - Ensures equal listening time per genre
- **Same Song Count**: Traditional approach for consistent track distribution
- **Auto-Detection**: Presets automatically select optimal balance method

### 🎯 **Advanced Popularity Strategies**

**Four professional mixing algorithms:**

- **🎲 Random Mix**: Evenly distributed across all popularity levels
- **🔥 Hits First**: Popular tracks upfront, fade to deep cuts
- **🎉 Party Mode**: Build to biggest hits in the middle (perfect for events!)
- **📈 Build Up**: Crescendo from deep cuts to bangers at the end
- **Recency Boost**: Optional newer song prioritization

### 🎨 **Professional Preview System**

**Full playlist preview with studio-grade controls:**

- **Track Reordering**: Drag & drop track positioning powered by dnd-kit
- **Album Artwork Display**: 40x40px covers for easy track identification
- **Real-Time Statistics**: Live updates as you modify tracks
- **Track Removal**: One-click removal with red X buttons
- **Source Identification**: Color-coded playlist origins
- **Duration Calculations**: Exact timing for each playlist contribution

### 📊 **Real-Time Analytics**

**Live feedback and calculations:**

- **Mix Distribution**: See exact percentages for each playlist
- **Duration Breakdown**: Time contribution per source
- **Track Count Analysis**: Song distribution across playlists
- **Example Mix Calculations**: Preview exactly what you'll get
- **Availability Warnings**: Smart alerts when requesting more than available

## 🚀 Getting Started

### Prerequisites

1. **Spotify Developer Account**: Create an app at [developer.spotify.com](https://developer.spotify.com/dashboard)
2. **Client ID**: Copy your Spotify app's Client ID
3. **Redirect URI**: Add your domain to your Spotify app settings

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/spotify-playlist-mixer.git
cd spotify-playlist-mixer

# Install dependencies
npm install

# Configure Spotify credentials
# Create a .env file with: REACT_APP_SPOTIFY_CLIENT_ID=your_client_id

# Start the application
npm start
```

### Authentication

The app uses Spotify's **Authorization Code with PKCE** flow (the Implicit
Grant flow was removed by Spotify). Make sure your Spotify app's Redirect URI
exactly matches the app origin with a trailing slash, e.g.
`http://127.0.0.1:3000/` for local development. Tokens are kept in memory
only and refreshed automatically before they expire.

### First Mix in 60 Seconds

1. **🔗 Connect**: Authorize with your Spotify account
2. **📋 Add Playlists**: Paste 2-10 Spotify playlist URLs
3. **🎯 Choose Template**: Select Karimctiva, Workout, or Road Trip
4. **👀 Preview**: Generate and customize your mix
5. **✨ Create**: Save your perfect playlist to Spotify!

## 🎵 Professional Use Cases

### 🎉 **Party DJ Setup**

```
Bachata Playlist: 2-2 songs per group, Max Priority (100), Time-balanced
Salsa Playlist: 1-2 songs per group, High Priority (80), Time-balanced
Reggaeton Playlist: 1-3 songs per group, High Priority (75), Time-balanced
Pop Hits: 1-2 songs per group, Normal Priority (40), Time-balanced

Strategy: Party Mode (Mid-Peak)
Duration: 4 hours
Result: Perfect energy curve that peaks when everyone's dancing!
```

### 💪 **Fitness Instructor**

```
High Energy: 3-5 songs per group, Max Priority (100)
Motivation: 2-4 songs per group, High Priority (80)
Cool Down: 1-2 songs per group, Low Priority (20)

Strategy: Hits First (Front-loaded)
Duration: 1 hour
Result: Maximum energy start with gradual cool-down!
```

### 🚗 **Road Trip Organizer**

```
Classic Rock: 2-3 songs per group, Normal Priority (50)
Sing-Alongs: 2-3 songs per group, Normal Priority (50)
Deep Cuts: 2-3 songs per group, Normal Priority (50)

Strategy: Build Up (Crescendo)
Duration: 3 hours
Result: Epic finale with everyone singing along!
```

## 🛠️ Technical Excellence

### **Architecture**

- **React 18.3.1**: Modern hooks and concurrent features
- **Spotify Web API**: Full integration with official API
- **Advanced Algorithms**: Custom playlist mixing logic
- **CSS Grid**: Responsive, adaptive layouts
- **Cross-Browser**: Chrome, Firefox, Safari support

### **Performance Features**

- **Lazy Loading**: Components load on demand
- **Real-Time Updates**: Instant feedback without page refreshes
- **Efficient API Calls**: Optimized Spotify API usage
- **Memory Management**: Clean component lifecycle handling

### **Code Quality**

- **TypeScript Ready**: Type definitions included
- **ESLint Configuration**: Consistent code standards
- **Modern JavaScript**: ES6+ features throughout
- **Component Architecture**: Reusable, maintainable code

## 🎨 Design System

### **Color Palette**

```css
--dark-green: #132a13 /* Deep backgrounds */ --hunter-green: #31572c
  /* Card backgrounds */ --fern-green: #4f772d /* Borders and accents */
  --moss-green: #90a955 /* Interactive elements */ --mindaro: #ecf39e
  /* Text and highlights */;
```

### **UI Components**

- **Adaptive Sliders**: Professional dual-range and single controls
- **Interactive Cards**: Hover effects and smooth transitions
- **Toast Notifications**: Success feedback with timestamps
- **Loading States**: Smooth loading indicators
- **Error Handling**: User-friendly error messages

## 📈 Advanced Features

### **Intelligent Automation**

- **Genre Detection**: Automatic bachata/salsa playlist recognition
- **Balance Method Selection**: Smart time vs. frequency balancing
- **Popularity Analysis**: Relative ranking within your music collection
- **Duration Optimization**: Perfect timing for any event length

### **Customization Options**

- **Manual Override**: Full control over all automated settings
- **Fine-Tuning**: 100-step precision on all controls
- **Visual Feedback**: Real-time percentage and duration updates
- **Flexible Input**: Support for any public Spotify playlist

### **Professional Controls**

- **Track Reordering**: Drag & drop track positioning powered by dnd-kit
- **Bulk Operations**: Multi-track selection and management
- **Preview System**: Full playlist preview before creation
- **Export Options**: Save configurations for future use

## 🤝 Contributing

## Developer note — setting UI errors

When setting errors that should be displayed to users, prefer the exported
helper from the store rather than calling the raw setter directly. Use:

```ts
import { setUIError } from './src/store';

// Pass any unknown/error shape — it will be normalized to the app's
// DisplayError structure before being stored and shown in the UI.
setUIError(err);
```

This ensures consistent error labels, details, retry metadata, and suggestions
across the app. Avoid calling `useAppStore(state => state.setError)` from
components so callers don't bypass normalization.


We welcome contributions from music lovers and developers!

### **Development Setup**

```bash
# Fork the repository
git clone https://github.com/yourusername/spotify-playlist-mixer.git

# Create feature branch
git checkout -b feature/amazing-feature

# Make your changes
npm start  # Test locally

# Submit pull request
git push origin feature/amazing-feature
```

### **Areas for Contribution**

- 🎵 New preset templates
- 🎨 UI/UX improvements
- 🔧 Performance optimizations
- 📱 Mobile responsiveness
- 🌐 Internationalization

## 📄 License

MIT License - Use, modify, and distribute freely!

## 🙏 Acknowledgments

- **Spotify Web API**: For the incredible music platform
- **React Community**: For the amazing ecosystem
- **Music Lovers**: Who inspired this tool's creation
- **Beta Testers**: Who helped perfect the user experience

---

## 🎶 Ready to Mix?

**Transform your music experience today!**

[🚀 **Get Started Now**](#getting-started) | [📖 **View Documentation**](#features) | [🐛 **Report Issues**](https://github.com/yourusername/spotify-playlist-mixer/issues)

_"Mix your music, not your genres randomly!"_ 🎵✨

---

**Built with ❤️ for music lovers who demand perfection in their playlists.**
