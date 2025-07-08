# Yossi Grunwald Portfolio Website

A modern, minimalist portfolio website for showcasing video editing work.

## Features

- **Modern Design**: Clean, minimalist aesthetic with smooth animations
- **Video Gallery**: Interactive grid layout with modal video playback
- **Responsive**: Fully responsive design that works on all devices
- **Smooth Scrolling**: Seamless navigation with scroll animations
- **Loading Screen**: Professional loading animation
- **Mobile Menu**: Hamburger menu for mobile devices

## How to Add More Videos

### Adding Videos to the Gallery

To add more videos to the home page gallery, edit the `index.html` file and replace any placeholder video items:

```html
<!-- Replace a placeholder with your video -->
<div class="video-item" data-video="https://www.youtube.com/embed/YOUR_VIDEO_ID">
  <div class="video-thumbnail">
    <img src="https://img.youtube.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg" alt="Video Title">
    <div class="play-overlay">
      <i class="fas fa-play"></i>
    </div>
  </div>
</div>
```

Replace `YOUR_VIDEO_ID` with the YouTube video ID (the part after `v=` in the YouTube URL).

### Adding Videos to Featured Work

To add videos to the Featured Work section, add a new work item:

```html
<div class="work-item">
  <div class="work-video">
    <iframe src="https://www.youtube.com/embed/YOUR_VIDEO_ID" title="Video Title" allowfullscreen></iframe>
  </div>
  <div class="work-info">
    <h3>Project Title</h3>
    <p>Description of your video project.</p>
  </div>
</div>
```

## Customization

### Changing Colors

Edit the CSS variables in `style.css`:

```css
:root {
  --primary-color: #000;      /* Main text color */
  --secondary-color: #333;    /* Secondary text */
  --text-light: #666;         /* Light text */
  --bg-color: #fff;           /* Background */
  --bg-light: #f8f8f8;        /* Light background */
  --accent-color: #007bff;    /* Accent color */
}
```

### Updating Social Links

Find the social links section in `index.html` and update the href attributes:

```html
<a href="https://instagram.com/yourusername" aria-label="Instagram">
  <i class="fab fa-instagram"></i>
</a>
<a href="https://linkedin.com/in/yourusername" aria-label="LinkedIn">
  <i class="fab fa-linkedin"></i>
</a>
```

### Changing Fonts

The website uses Inter font by default. To change it, update the font import in `index.html` and the font-family in `style.css`.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## Performance Tips

1. Optimize images before uploading
2. Use YouTube's thumbnail service for video previews
3. Keep the number of videos reasonable for faster loading

## Deployment

This website is designed for GitHub Pages. Simply push your changes to the repository and they will be live at `yossigrunwald.github.io`.

## Contact

For any questions or issues, contact: grunwaldyossi@gmail.com