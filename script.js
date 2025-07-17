

// Loading Screen
let resourcesLoaded = false;
let minimumTimeElapsed = false;

// Check if all critical resources are loaded
function checkResourcesLoaded() {
  const heroVideo = document.getElementById('hero-bg-video');
  const workVideo = document.getElementById('work-bg-video');
  const profileImage = document.querySelector('img[src="image 2.png"]');
  
  // Check if videos are ready to play
  const heroVideoReady = !heroVideo || heroVideo.readyState >= 3;
  const workVideoReady = !workVideo || workVideo.readyState >= 3;
  const profileImageReady = !profileImage || profileImage.complete;
  
  return heroVideoReady && workVideoReady && profileImageReady;
}

// Hide loading screen when everything is ready
function hideLoadingScreen() {
  if (resourcesLoaded && minimumTimeElapsed) {
    document.getElementById('loading-screen').classList.add('hidden');
    // Start parallax effects after loading
    initParallax();
  }
}

// Set a minimum time of 200ms to prevent flashing
setTimeout(() => {
  minimumTimeElapsed = true;
  hideLoadingScreen();
}, 200);

// Check resources on load
window.addEventListener('load', () => {
  resourcesLoaded = checkResourcesLoaded();
  
  if (!resourcesLoaded) {
    // If not all resources are loaded, keep checking
    const checkInterval = setInterval(() => {
      if (checkResourcesLoaded()) {
        resourcesLoaded = true;
        hideLoadingScreen();
        clearInterval(checkInterval);
      }
    }, 100);
    
    // Maximum wait time of 3 seconds
    setTimeout(() => {
      resourcesLoaded = true;
      hideLoadingScreen();
      clearInterval(checkInterval);
    }, 3000);
  } else {
    hideLoadingScreen();
  }
});

// Parallax Scrolling System
class ParallaxController {
  constructor() {
    this.elements = [];
    this.isScrolling = false;
    this.lastScrollY = 0;
    this.ticking = false;
    
    this.init();
  }
  
  init() {
    this.setupElements();
    this.bindEvents();
    this.update();
  }
  
  setupElements() {
    // Hero section parallax
    const heroVideo = document.querySelector('.hero-bg-video');
    const heroContent = document.querySelector('.hero-content');
    
    if (heroVideo) {
      this.elements.push({
        element: heroVideo,
        speed: 0.5,
        type: 'background'
      });
    }
    
    if (heroContent) {
      this.elements.push({
        element: heroContent,
        speed: 0.8,
        type: 'content'
      });
    }
    
    // Video gallery parallax
    const videoItems = document.querySelectorAll('.video-item');
    videoItems.forEach((item, index) => {
      this.elements.push({
        element: item,
        speed: 0.9 + (index % 3) * 0.05,
        type: 'item'
      });
    });
    
    // About section parallax
    const aboutImage = document.querySelector('.about-image');
    const aboutText = document.querySelector('.about-text');
    
    if (aboutImage) {
      this.elements.push({
        element: aboutImage,
        speed: 0.7,
        type: 'image'
      });
    }
    
    if (aboutText) {
      this.elements.push({
        element: aboutText,
        speed: 0.9,
        type: 'text'
      });
    }
    
    // Work section background
    const workBg = document.querySelector('.work::before');
    const workVideo = document.querySelector('.work-bg-video');
    
    if (workVideo) {
      this.elements.push({
        element: workVideo,
        speed: 0.3,
        type: 'background'
      });
    }
    
    // Skill items staggered animation
    const skillItems = document.querySelectorAll('.skill-item');
    skillItems.forEach((item, index) => {
      this.elements.push({
        element: item,
        speed: 0.95,
        type: 'skill',
        delay: index * 0.1
      });
    });
  }
  
  bindEvents() {
    window.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
    window.addEventListener('resize', this.onResize.bind(this));
  }
  
  onScroll() {
    this.lastScrollY = window.pageYOffset;
    this.requestTick();
  }
  
  onResize() {
    this.setupElements();
  }
  
  requestTick() {
    if (!this.ticking) {
      requestAnimationFrame(this.update.bind(this));
      this.ticking = true;
    }
  }
  
  update() {
    const scrollY = this.lastScrollY;
    const windowHeight = window.innerHeight;
    
    this.elements.forEach(item => {
      const { element, speed, type, delay = 0 } = item;
      const rect = element.getBoundingClientRect();
      const elementTop = rect.top + scrollY;
      const elementHeight = rect.height;
      
      // Check if element is in viewport
      if (rect.bottom >= 0 && rect.top <= windowHeight) {
        const yPos = -(scrollY - elementTop) * speed;
        
        // Apply different transforms based on type
        switch (type) {
          case 'background':
            element.style.transform = `translateY(${yPos}px) scale(1.1)`;
            break;
          case 'content':
            element.style.transform = `translateY(${yPos * 0.3}px)`;
            break;
          case 'item':
            element.style.transform = `translateY(${yPos * 0.1}px)`;
            break;
          case 'image':
            element.style.transform = `translateY(${yPos * 0.2}px) scale(1.02)`;
            break;
          case 'text':
            element.style.transform = `translateY(${yPos * 0.1}px)`;
            break;
          case 'skill':
            const skillOffset = yPos * 0.05;
            element.style.transform = `translateY(${skillOffset}px)`;
            element.style.transitionDelay = `${delay}s`;
            break;
        }
      }
    });
    
    this.ticking = false;
  }
}

// Intersection Observer for animations
class ScrollAnimations {
  constructor() {
    this.animatedElements = [];
    this.init();
  }
  
  init() {
    this.setupObserver();
    this.setupElements();
  }
  
  setupObserver() {
    const options = {
      root: null,
      rootMargin: '-10% 0px -10% 0px',
      threshold: 0.1
    };
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          this.observer.unobserve(entry.target);
        }
      });
    }, options);
  }
  
  setupElements() {
    // Add fade-in animations
    const fadeElements = document.querySelectorAll('.about-text h2, .about-text p, .work h2, .contact h2');
    fadeElements.forEach(el => {
      el.classList.add('fade-in');
      this.observer.observe(el);
    });
    
    // Add slide-in animations
    const slideLeftElements = document.querySelectorAll('.about-image');
    slideLeftElements.forEach(el => {
      el.classList.add('slide-in-left');
      this.observer.observe(el);
    });
    
    const slideRightElements = document.querySelectorAll('.about-text');
    slideRightElements.forEach(el => {
      el.classList.add('slide-in-right');
      this.observer.observe(el);
    });
    
    // Add scale-in animations
    const scaleElements = document.querySelectorAll('.video-item, .skill-item, .stat-item, .contact-item');
    scaleElements.forEach((el, index) => {
      el.classList.add('scale-in');
      el.style.transitionDelay = `${index * 0.1}s`;
      this.observer.observe(el);
    });
  }
}

// Smooth scroll enhancement
class SmoothScroll {
  constructor() {
    this.init();
  }
  
  init() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
      link.addEventListener('click', this.handleClick.bind(this));
    });
  }
  
  handleClick(e) {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    const target = document.querySelector(href);
    
    if (target) {
      const offsetTop = target.offsetTop - 80; // Account for fixed navbar
      
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  }
}

// Video background controller
class VideoController {
  constructor() {
    this.videos = [];
    this.init();
  }
  
  init() {
    this.setupVideos();
    this.bindEvents();
  }
  
  setupVideos() {
    const heroVideo = document.getElementById('hero-bg-video');
    const workVideo = document.getElementById('work-bg-video');
    
    if (heroVideo) {
      this.videos.push({
        element: heroVideo,
        section: 'hero',
        autoplay: true
      });
    }
    
    if (workVideo) {
      this.videos.push({
        element: workVideo,
        section: 'work',
        autoplay: false
      });
    }
    
    this.videos.forEach(video => {
      video.element.addEventListener('loadeddata', () => {
        if (video.autoplay) {
          video.element.play().catch(e => console.log('Autoplay prevented:', e));
        }
      });
    });
  }
  
  bindEvents() {
    window.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
  }
  
  onScroll() {
    const scrollY = window.pageYOffset;
    const windowHeight = window.innerHeight;
    
    this.videos.forEach(video => {
      const section = document.querySelector(`.${video.section}`);
      if (section) {
        const rect = section.getBoundingClientRect();
        const isVisible = rect.top < windowHeight && rect.bottom > 0;
        
        if (isVisible && video.element.paused) {
          video.element.play().catch(e => console.log('Video play failed:', e));
        } else if (!isVisible && !video.element.paused) {
          video.element.pause();
        }
      }
    });
  }
}

// Mouse parallax effect
class MouseParallax {
  constructor() {
    this.mouseX = 0;
    this.mouseY = 0;
    this.init();
  }
  
  init() {
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.setupElements();
  }
  
  onMouseMove(e) {
    this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    
    requestAnimationFrame(this.update.bind(this));
  }
  
  setupElements() {
    this.parallaxElements = document.querySelectorAll('.video-gallery::before, .work::before');
  }
  
  update() {
    this.parallaxElements.forEach(element => {
      const speed = 0.05;
      const x = this.mouseX * speed * 50;
      const y = this.mouseY * speed * 50;
      
      element.style.transform = `translate(${x}px, ${y}px)`;
    });
  }
}

// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.fps = 0;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.init();
  }
  
  init() {
    this.measureFPS();
    this.optimizeBasedOnPerformance();
  }
  
  measureFPS() {
    const now = performance.now();
    this.frameCount++;
    
    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
      
      // Adjust effects based on FPS
      if (this.fps < 30) {
        this.reduceEffects();
      }
    }
    
    requestAnimationFrame(this.measureFPS.bind(this));
  }
  
  optimizeBasedOnPerformance() {
    // Reduce motion for users who prefer it
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.classList.add('reduced-motion');
    }
    
    // Optimize for mobile devices
    if (window.innerWidth < 768) {
      document.body.classList.add('mobile-optimized');
    }
  }
  
  reduceEffects() {
    // Reduce parallax intensity for better performance
    const parallaxElements = document.querySelectorAll('.parallax-element');
    parallaxElements.forEach(el => {
      el.style.willChange = 'auto';
    });
  }
}

// Initialize all systems
function initParallax() {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    new ParallaxController();
    new MouseParallax();
  }
  
  new ScrollAnimations();
  new SmoothScroll();
  new VideoController();
  new PerformanceMonitor();
}

// Navigation functionality
const navbar = document.querySelector('.navbar');
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

// Navbar scroll effect
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Mobile menu toggle
if (navToggle) {
  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    navToggle.classList.toggle('active');
  });
}

// Close mobile menu when clicking on links
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('active');
    navToggle.classList.remove('active');
  });
});

// Video modal functionality
const videoModal = document.querySelector('.video-modal');
const videoModalContent = document.querySelector('.video-modal-content');
const closeModal = document.querySelector('.close-modal');

// Open video modal
document.querySelectorAll('.video-item:not(.placeholder)').forEach(item => {
  item.addEventListener('click', () => {
    const videoUrl = item.dataset.video;
    if (videoUrl) {
      videoModalContent.innerHTML = `<iframe src="${videoUrl}?autoplay=1" frameborder="0" allowfullscreen></iframe>`;
      videoModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  });
});

// Close video modal
if (closeModal) {
  closeModal.addEventListener('click', () => {
    videoModal.style.display = 'none';
    videoModalContent.innerHTML = '';
    document.body.style.overflow = 'auto';
  });
}

// Close modal when clicking outside
if (videoModal) {
  videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) {
      videoModal.style.display = 'none';
      videoModalContent.innerHTML = '';
      document.body.style.overflow = 'auto';
    }
  });
}

// Skills and Resume modal functionality
const skillsModal = document.querySelector('.skills-modal');
const resumeModal = document.querySelector('.resume-modal');
const skillsLink = document.getElementById('skills-link');
const resumeLink = document.getElementById('resume-link');

// Open skills modal
if (skillsLink) {
  skillsLink.addEventListener('click', (e) => {
    e.preventDefault();
    skillsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
}

// Open resume modal
if (resumeLink) {
  resumeLink.addEventListener('click', (e) => {
    e.preventDefault();
    resumeModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });
}

// Close modals
document.querySelectorAll('.modal-close').forEach(closeBtn => {
  closeBtn.addEventListener('click', () => {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
  });
});

// Close modals when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
});

// Typing effect for hero title
function typeWriter(element, text, speed = 100) {
  let i = 0;
  element.innerHTML = '';
  
  function type() {
    if (i < text.length) {
      element.innerHTML += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }
  
  type();
}

// Initialize typing effect after page load
window.addEventListener('load', () => {
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    const originalText = heroTitle.textContent;
    setTimeout(() => {
      typeWriter(heroTitle, originalText, 150);
    }, 1000);
  }
});

// Add sound effect to interactions (optional)
function playSound(soundFile) {
  const audio = new Audio(soundFile);
  audio.volume = 0.3;
  audio.play().catch(e => console.log('Sound play failed:', e));
}

// Add sound to button clicks
document.querySelectorAll('.hero-button, .nav-link, .video-item').forEach(element => {
  element.addEventListener('click', () => {
    // Uncomment the line below to add sound effects
    // playSound('swoosh sound effect.mp3');
  });
});

// Lazy loading for images
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.classList.remove('lazy');
      imageObserver.unobserve(img);
    }
  });
});

document.querySelectorAll('img[data-src]').forEach(img => {
  imageObserver.observe(img);
});

// Preload critical resources
function preloadResources() {
  const resources = [
    'image 2.png',
    '488741_Colorful Communication Multicolor Cyber_By_Jmg-visuals_Artlist_HD.mp4'
  ];
  
  resources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    link.as = resource.includes('.mp4') ? 'video' : 'image';
    document.head.appendChild(link);
  });
}

// Initialize preloading
preloadResources();

// Add CSS custom properties for dynamic effects
function updateCSSVariables() {
  const scrollY = window.pageYOffset;
  const windowHeight = window.innerHeight;
  
  document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
  document.documentElement.style.setProperty('--window-height', `${windowHeight}px`);
  document.documentElement.style.setProperty('--parallax-offset-slow', `${scrollY * 0.5}px`);
  document.documentElement.style.setProperty('--parallax-offset-medium', `${scrollY * 0.3}px`);
  document.documentElement.style.setProperty('--parallax-offset-fast', `${scrollY * 0.1}px`);
}

window.addEventListener('scroll', updateCSSVariables, { passive: true });
window.addEventListener('resize', updateCSSVariables);

// Initialize on page load
updateCSSVariables();
