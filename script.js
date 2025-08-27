

// Loading Screen - Progressive Loading Strategy
let heroSectionLoaded = false;
let minimumTimeElapsed = false;

// Check if hero section critical resources are loaded
function checkHeroSectionLoaded() {
  const heroVideo = document.getElementById('hero-bg-video');
  
  // Only check hero video for initial loading
  const heroVideoReady = !heroVideo || heroVideo.readyState >= 3;
  
  return heroVideoReady;
}

// Check if all resources are loaded (for fallback)
function checkAllResourcesLoaded() {
  const heroVideo = document.getElementById('hero-bg-video');
  const workVideo = document.getElementById('work-bg-video');
  const profileImage = document.querySelector('img[src="image 2.png"]');
  
  const heroVideoReady = !heroVideo || heroVideo.readyState >= 3;
  const workVideoReady = !workVideo || workVideo.readyState >= 3;
  const profileImageReady = !profileImage || profileImage.complete;
  
  return heroVideoReady && workVideoReady && profileImageReady;
}

// Hide loading screen when hero section is ready
function hideLoadingScreen() {
  if (heroSectionLoaded && minimumTimeElapsed) {
    document.getElementById('loading-screen').classList.add('hidden');
    // Start loading other sections after hero is ready
    initializeLazyLoading();
  }
}

// Set a minimum time of 150ms to prevent flashing (reduced from 200ms)
setTimeout(() => {
  minimumTimeElapsed = true;
  hideLoadingScreen();
}, 150);

// Check hero section resources on load
window.addEventListener('load', () => {
  heroSectionLoaded = checkHeroSectionLoaded();
  
  if (!heroSectionLoaded) {
    // If hero section is not loaded, keep checking
    const checkInterval = setInterval(() => {
      if (checkHeroSectionLoaded()) {
        heroSectionLoaded = true;
        hideLoadingScreen();
        clearInterval(checkInterval);
      }
    }, 50); // Check more frequently for hero section
    
    // Maximum wait time of 2 seconds for hero section (reduced from 3 seconds)
    setTimeout(() => {
      heroSectionLoaded = true;
      hideLoadingScreen();
      clearInterval(checkInterval);
    }, 2000);
  } else {
    // Hero section is already loaded
    hideLoadingScreen();
  }
});

// Initialize lazy loading for non-hero sections
function initializeLazyLoading() {
  // Lazy load work section video
  const workVideo = document.getElementById('work-bg-video');
  if (workVideo && workVideo.readyState < 3) {
    // Load work video in background
    workVideo.load();
  }
  
  // Lazy load about section image
  const profileImage = document.querySelector('img[src="image 2.png"]');
  if (profileImage && !profileImage.complete) {
    // Image will load naturally, but we can add intersection observer for more control
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Image is about to be visible, ensure it's loading
          const img = entry.target;
          if (!img.complete) {
            img.src = img.src; // Trigger reload if needed
          }
          imageObserver.unobserve(img);
        }
      });
    }, { rootMargin: '100px' }); // Start loading 100px before it's visible
    
    imageObserver.observe(profileImage);
  }
  
  // Lazy load contact video when user scrolls near contact section
  const contactVideo = document.getElementById('contact-bg-video');
  const contactSection = document.getElementById('contact');
  
  if (contactVideo && contactSection) {
    const contactObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && contactVideo.readyState < 3) {
          contactVideo.load();
          contactObserver.unobserve(contactSection);
        }
      });
    }, { rootMargin: '200px' }); // Start loading 200px before contact section
    
    contactObserver.observe(contactSection);
  }
}

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
  const contactVideo = document.getElementById('contact-bg-video');
  
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
    
    // Pause video when user scrolls away from hero section
    let heroVideoPaused = false;
    window.addEventListener('scroll', function() {
      const heroSection = document.getElementById('home');
      const nextSection = document.getElementById('video-gallery');
      
      if (heroSection && nextSection && !heroVideoPaused) {
        const heroHeight = heroSection.offsetHeight;
        const scrollPosition = window.pageYOffset;
        
        // Calculate 30% into the next section
        const nextSectionTop = nextSection.offsetTop;
        const pauseTrigger = nextSectionTop + (nextSection.offsetHeight * 0.3);
        
        // Pause video when scrolled 30% into next section OR after half a second of scrolling
        if (scrollPosition >= heroHeight * 0.5 || scrollPosition >= pauseTrigger) {
          if (!heroVideo.paused && heroVideo.currentTime < heroVideo.duration) {
            heroVideo.pause();
            heroVideoPaused = true;
          }
        }
      }
    });
  }
  
  // Initialize work video with intersection observer for better performance
  if (workVideo) {
    const workSection = document.getElementById('work');
    if (workSection) {
      const workObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Load and play work video when section is visible
            if (workVideo.readyState < 3) {
              workVideo.load();
            }
            playVideoWhenReady(workVideo);
            workObserver.unobserve(workSection);
          }
        });
      }, { rootMargin: '100px' }); // Start loading 100px before visible
      
      workObserver.observe(workSection);
    } else {
      // Fallback: play immediately if section not found
      playVideoWhenReady(workVideo);
    }
  }
  
  // Initialize contact video with scroll-triggered playback
  if (contactVideo) {
    let videoHasPlayed = false;
    
    // Create intersection observer to detect when contact section is visible
    const contactSection = document.getElementById('contact');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !videoHasPlayed) {
          // Start playing video when contact section becomes visible
          playVideoWhenReady(contactVideo);
          videoHasPlayed = true;
        }
      });
    }, {
      threshold: 0.2 // Trigger when 20% of the section is visible
    });
    
    if (contactSection) {
      observer.observe(contactSection);
    }
    
    // Handle fade-out effect in the last 2 seconds
    contactVideo.addEventListener('timeupdate', function() {
      const duration = contactVideo.duration;
      const currentTime = contactVideo.currentTime;
      
      // Start fade-out 2 seconds before the end
      if (duration && currentTime >= duration - 2) {
        const fadeProgress = (duration - currentTime) / 2; // Goes from 1 to 0
        const opacity = fadeProgress; // From 1 to 0
        contactVideo.style.opacity = opacity;
      }
      
      // Ensure video stops and doesn't loop
      if (currentTime >= duration - 0.1) {
        contactVideo.pause();
        contactVideo.currentTime = duration;
        contactVideo.style.opacity = 0;
      }
    });
    
    // When video ends, ensure it stays paused and invisible
    contactVideo.addEventListener('ended', function() {
      contactVideo.pause();
      contactVideo.currentTime = contactVideo.duration;
      contactVideo.style.opacity = 0;
    });
  }
});
