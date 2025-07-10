

// Loading Screen
window.addEventListener('load', () => {
  // Play swoosh sound effect for intro
  const swooshSound = new Audio('swoosh sound effect.mp3');
  swooshSound.volume = 0.3;
  swooshSound.play().catch(() => {
    // Ignore if autoplay is blocked
  });
  
  // Hide intro animation after 2.5 seconds
  setTimeout(() => {
    document.getElementById('intro-animation').style.display = 'none';
  }, 2500);
  
  // Hide loading screen
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
  }, 500);
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

// Enhanced Scroll Transition Animation
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

// Legacy fade-in observer for backward compatibility
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

// Observe elements with fade-in class
document.querySelectorAll('.fade-in').forEach(element => {
  observer.observe(element);
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

// Enhanced Parallax Effect for Smooth Section Transitions
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const windowHeight = window.innerHeight;
  
  // Hero section parallax
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

// Timeline Transition Animation
let isTransitioning = false;
const timelineTransition = document.getElementById('timeline-transition');
let lastSection = 'home';

// Update timecode animation
function updateTimecode() {
  const timecode = document.querySelector('.timeline-timecode');
  if (timecode) {
    let frame = 0;
    setInterval(() => {
      frame = (frame + 1) % 30;
      const seconds = Math.floor(frame / 30) % 60;
      const minutes = Math.floor(frame / 1800) % 60;
      const hours = Math.floor(frame / 108000) % 24;
      const frameStr = String(frame % 30).padStart(2, '0');
      const secondsStr = String(seconds).padStart(2, '0');
      const minutesStr = String(minutes).padStart(2, '0');
      const hoursStr = String(hours).padStart(2, '0');
      timecode.textContent = `${hoursStr}:${minutesStr}:${secondsStr}:${frameStr}`;
    }, 33); // ~30fps
  }
}
updateTimecode();

// Detect section transitions
window.addEventListener('scroll', () => {
  const scrollPosition = window.pageYOffset + window.innerHeight / 2;
  
  // Find current section
  let currentSection = 'home';
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionBottom = sectionTop + section.offsetHeight;
    
    if (scrollPosition >= sectionTop && scrollPosition <= sectionBottom) {
      currentSection = section.id;
    }
  });
  
  // Trigger transition animation when moving from home to about
  if (lastSection === 'home' && currentSection === 'about' && !isTransitioning) {
    isTransitioning = true;
    timelineTransition.classList.add('active');
    
    // Reset and play animation
    const clips = timelineTransition.querySelectorAll('.timeline-clip');
    clips.forEach((clip, index) => {
      clip.style.animation = 'none';
      setTimeout(() => {
        clip.style.animation = `clipReveal 0.3s ease ${index * 0.1}s forwards`;
      }, 10);
    });
    
    // Hide transition after animation
    setTimeout(() => {
      timelineTransition.classList.remove('active');
      isTransitioning = false;
    }, 2000);
  }
  
  lastSection = currentSection;
});

