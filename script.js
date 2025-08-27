

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
    // Everything is already loaded
    hideLoadingScreen();
  }
});

// Mobile Menu Toggle
const mobileMenu = document.getElementById('mobile-menu');
const navMenu = document.querySelector('.nav-menu');

mobileMenu.addEventListener('click', () => {
  navMenu.classList.toggle('active');
  
  // Animate hamburger menu
  const bars = mobileMenu.querySelectorAll('.bar');
  bars.forEach((bar, index) => {
    if (navMenu.classList.contains('active')) {
      if (index === 0) bar.style.transform = 'rotate(45deg) translate(5px, 5px)';
      if (index === 1) bar.style.opacity = '0';
      if (index === 2) bar.style.transform = 'rotate(-45deg) translate(7px, -6px)';
    } else {
      bar.style.transform = 'none';
      bar.style.opacity = '1';
    }
  });
});

// Smooth Scrolling for Navigation Links (Updated)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    // Skip if it's skills or resume link
    if (this.id === 'skills-link' || this.id === 'resume-link') {
      return;
    }
    
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      // Close mobile menu if open
      navMenu.classList.remove('active');
      document.querySelectorAll('.bar').forEach(bar => {
        bar.style.transform = 'none';
        bar.style.opacity = '1';
      });
    }
  });
});

// Navbar Scroll Effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;
  
  if (currentScroll > 100) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  
  lastScroll = currentScroll;
});

// Video Modal
const videoModal = document.getElementById('video-modal');
const modalVideo = document.getElementById('modal-video');
const closeModal = document.querySelector('.close-modal');

// Open modal when video thumbnail is clicked
document.querySelectorAll('.video-item:not(.placeholder)').forEach(item => {
  item.addEventListener('click', function() {
    const videoUrl = this.getAttribute('data-video');
    modalVideo.src = videoUrl + '?autoplay=1';
    videoModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  });
});

// Close modal
function closeVideoModal() {
  videoModal.style.display = 'none';
  modalVideo.src = '';
  document.body.style.overflow = 'auto';
}

closeModal.addEventListener('click', closeVideoModal);

videoModal.addEventListener('click', function(e) {
  if (e.target === videoModal) {
    closeVideoModal();
  }
});

// Escape key to close modal
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && videoModal.style.display === 'block') {
    closeVideoModal();
  }
});

// Fade In Animation on Scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

// Observe all sections and elements with fade-in class
document.querySelectorAll('section').forEach(section => {
  section.classList.add('fade-in');
  observer.observe(section);
});

// Active Navigation Link
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
  let current = '';
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (window.pageYOffset >= (sectionTop - 200)) {
      current = section.getAttribute('id');
    }
  });
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href').slice(1) === current) {
      link.classList.add('active');
    }
  });
});

// Parallax Effect for Hero Section (optional)
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const hero = document.querySelector('.hero');
  if (hero && scrolled < window.innerHeight) {
    hero.style.transform = `translateY(${scrolled * 0.5}px)`;
  }
});

// Skills Modal
const skillsLink = document.getElementById('skills-link');
const skillsModal = document.getElementById('skills-modal');
const resumeLink = document.getElementById('resume-link');
const resumeModal = document.getElementById('resume-modal');

skillsLink.addEventListener('click', function(e) {
  e.preventDefault();
  skillsModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
});

resumeLink.addEventListener('click', function(e) {
  e.preventDefault();
  resumeModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
});

// Close modals
document.querySelectorAll('.modal .close-modal').forEach(closeBtn => {
  closeBtn.addEventListener('click', function() {
    this.closest('.modal').style.display = 'none';
    document.body.style.overflow = 'auto';
  });
});

// Close modal on outside click
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
});

// Escape key to close any modal
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal').forEach(modal => {
      if (modal.style.display === 'block') {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
      }
    });
  }
});




// Enhanced Scroll Transition Animation for smooth transitions
const enhancedObserverOptions = {
  threshold: 0.3,
  rootMargin: '0px 0px -50px 0px'
};

const enhancedObserver = new IntersectionObserver(function(entries) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      
      // Special effect when about section comes into view
      if (entry.target.id === 'about') {
        // Add extra visual effects
        setTimeout(() => {
          entry.target.style.transform = 'scale(1.001)';
          setTimeout(() => {
            entry.target.style.transform = 'scale(1)';
          }, 200);
        }, 800);
      }
    }
  });
}, enhancedObserverOptions);

// Observe all sections for enhanced animations
document.querySelectorAll('section').forEach(section => {
  enhancedObserver.observe(section);
});

// Enhanced Parallax Effect for Smooth Section Transitions
let lastScrollY = 0;
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const windowHeight = window.innerHeight;
  
  // Hero section parallax with fade out
  const hero = document.querySelector('.hero');
  if (hero && scrolled < windowHeight) {
    const parallaxSpeed = scrolled * 0.5;
    hero.style.transform = `translateY(${parallaxSpeed}px)`;
    
    // Fade out hero content as we scroll
    const heroContent = hero.querySelector('.hero-content');
    if (heroContent) {
      const opacity = Math.max(0, 1 - (scrolled / windowHeight) * 1.5);
      heroContent.style.opacity = opacity;
    }
  }
  
  // About section entrance effect
  const about = document.querySelector('.about');
  if (about) {
    const aboutTop = about.offsetTop;
    const scrollPercent = Math.max(0, Math.min(1, (scrolled - aboutTop + windowHeight) / windowHeight));
    
    if (scrolled > aboutTop - windowHeight && scrolled < aboutTop + about.offsetHeight) {
      // Subtle parallax for about section
      about.style.transform = `translateY(${(scrollPercent - 1) * 30}px)`;
    }
  }
  
  lastScrollY = scrolled;
});

// Hero Background Video
document.addEventListener('DOMContentLoaded', function() {
  const heroVideo = document.getElementById('hero-bg-video');
  const workVideo = document.getElementById('work-bg-video');
  
  // Function to play video when ready
  function playVideoWhenReady(video) {
    if (video) {
      if (video.readyState >= 3) {
        // Video is ready, play it
        video.play().catch(() => {
          console.log('Video autoplay was blocked');
        });
      } else {
        // Wait for video to be ready
        video.addEventListener('canplay', function() {
          video.play().catch(() => {
            console.log('Video autoplay was blocked');
          });
        }, { once: true });
      }
    }
  }
  
  // Initialize hero video
  if (heroVideo) {
    playVideoWhenReady(heroVideo);
    
    // When video ends, keep it on the last frame (don't restart)
    heroVideo.addEventListener('ended', function() {
      // Ensure video stays on last frame and is paused
      heroVideo.pause();
      heroVideo.currentTime = heroVideo.duration;
    });
    
    // Additional safety: ensure video doesn't loop even if somehow it tries to
    heroVideo.addEventListener('timeupdate', function() {
      if (heroVideo.currentTime >= heroVideo.duration - 0.1) {
        heroVideo.pause();
        heroVideo.currentTime = heroVideo.duration;
      }
    });
  }
  
  // Initialize work video (if it should autoplay)
  if (workVideo) {
    // Work video has loop attribute in HTML, so just ensure it plays
    playVideoWhenReady(workVideo);
  }
});
