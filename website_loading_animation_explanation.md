# Website Loading Animation Explanation

## What You're Seeing

When you open your website, you're experiencing a **two-part loading sequence** that consists of:

### 1. Intro Animation (Main Animation)
This is the primary animation that appears when your website loads. It features:

**Visual Elements:**
- **Dark Background**: A radial gradient from dark gray (#111) to black (#000)
- **Timeline Bars**: 5 white horizontal bars that slide in from left to right with staggered timing (0s, 0.1s, 0.2s, 0.3s, 0.4s delays)
- **Red Playhead**: A thin red vertical line that moves across the timeline bars (mimicking video editing software)
- **Main Text**: "YOSSI GRUNWALD" with a glitch effect and fade-in animation
- **Subtitle**: "VIDEO EDITOR" that fades in below the main text

**Audio:**
- A swoosh sound effect plays during the animation (if autoplay is allowed by the browser)

**Duration:**
- The entire intro animation lasts **2.5 seconds**
- After 2.5 seconds, it completely disappears (`display: none`)

### 2. Loading Screen (Secondary)
Behind the intro animation, there's also a simpler loading screen with:
- A white background
- A spinning circular loader (black border with animated rotation)
- This disappears after **0.5 seconds**

## Technical Details

### Animation Sequence:
1. **0s**: Timeline bars start sliding in (staggered over 0.5s)
2. **0.5s**: Red playhead starts moving across
3. **0.8s**: Main text "YOSSI GRUNWALD" fades in from bottom
4. **1s**: Subtitle "VIDEO EDITOR" fades in
5. **1.5s**: Glitch effect triggers on the main text
6. **2s**: Fade-out animation begins
7. **2.5s**: Intro animation completely disappears

### Design Purpose:
This animation is designed to reflect your profession as a video editor by:
- Mimicking a video editing timeline interface
- Using a red playhead (common in editing software)
- Creating a professional, cinematic entrance
- Building anticipation before revealing your portfolio

## Files Involved:
- **HTML**: Contains the intro animation structure (lines 20-32 in `index.html`)
- **CSS**: Contains all animation keyframes and styling (lines 729-860 in `style.css`)
- **JavaScript**: Controls timing and sound effects (lines 3-15 in `script.js`)
- **Audio**: `swoosh sound effect.mp3` plays during the animation

The animation is well-crafted and professionally represents your video editing expertise through visual metaphors from the editing world!