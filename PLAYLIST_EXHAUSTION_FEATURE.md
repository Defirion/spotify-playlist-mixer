# Playlist Exhaustion Handling Feature

## Overview
This feature addresses the issue where the playlist mixer would continue adding songs from remaining playlists when one playlist runs out of songs, without notifying the user or giving them control over this behavior.

## What's New

### 1. New Mixing Option: "Continue when playlist empty"
- **Location**: Mixing Behavior section in the PlaylistMixer component
- **Default**: Enabled (maintains backward compatibility)
- **Purpose**: Controls what happens when a playlist runs out of songs during mixing

### 2. Behavior Options

#### When Enabled (Default)
- If a playlist runs out of songs, mixing continues with the remaining playlists
- The final mix will reach the target length using available songs from other playlists
- User gets a notification about which playlists were exhausted

#### When Disabled
- If any playlist runs out of songs, mixing stops immediately
- The final playlist will be shorter than the target length
- User gets a warning about early termination

### 3. Visual Feedback

#### Preview Mode
- Shows warnings when playlists are exhausted
- Different colors for different scenarios:
  - **Blue info**: Playlists exhausted but mixing continued
  - **Yellow warning**: Mixing stopped early due to exhaustion

#### Console Logging (Development)
- Detailed logs about playlist exhaustion
- Information about which playlists ran out of songs
- Confirmation of mixing behavior (continue vs stop)

## Technical Implementation

### Core Changes

1. **playlistMixer.js**:
   - Added `continueWhenPlaylistEmpty` option
   - Added `playlistExhausted` tracking object
   - Enhanced `getNextPlaylistId()` to skip exhausted playlists
   - Added `shouldStopDueToExhaustion()` helper function
   - Added metadata to return value (`exhaustedPlaylists`, `stoppedEarly`)

2. **PlaylistMixer.js**:
   - Added new UI control in "Mixing Behavior" section
   - Added exhaustion warnings in preview mode
   - Enhanced preview stats to show exhaustion information

3. **App.js**:
   - Added `continueWhenPlaylistEmpty: true` to default mix options
   - Updated preset handling to preserve the setting

### Data Flow

1. User toggles the "Continue when playlist empty" checkbox
2. Setting is passed to `mixPlaylists()` function
3. During mixing, algorithm tracks which playlists are exhausted
4. Based on setting, either continues or stops when exhaustion occurs
5. Result includes metadata about exhausted playlists
6. UI displays appropriate warnings and information

## User Experience

### Before
- Playlists would silently continue mixing when one ran out
- No indication that ratios were no longer being maintained
- Users might not realize their mix was imbalanced

### After
- Clear visual feedback about playlist exhaustion
- User control over mixing behavior
- Informed decision-making about playlist creation
- Better understanding of mixing limitations

## Use Cases

### Continue Enabled (Default)
- **Best for**: Users who want to reach their target playlist length
- **Example**: "I want a 4-hour playlist and don't mind if some playlists contribute more when others run out"

### Continue Disabled
- **Best for**: Users who want strict ratio adherence
- **Example**: "I want equal representation from all playlists, even if it means a shorter final playlist"

## Future Enhancements

Potential improvements could include:
- Playlist-specific exhaustion handling
- Advanced balancing algorithms when playlists are exhausted
- Automatic ratio adjustment suggestions
- Pre-mixing exhaustion predictions with recommendations