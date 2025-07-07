window.addEventListener('load', () => {
  const splash = document.getElementById('splash-screen');
  const siteContent = document.getElementById('site-content');

  setTimeout(() => {
    splash.style.transition = 'opacity 1.5s ease';
    splash.style.opacity = '0';
    splash.addEventListener('transitionend', () => {
      splash.style.display = 'none';
      siteContent.classList.add('visible');
    });
  }, 4000);

  const sections = document.querySelectorAll('.fade-section');

  const revealOnScroll = () => {
    const windowBottom = window.innerHeight + window.scrollY;
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      if (windowBottom > sectionTop + 100) {
        section.classList.add('visible');
      }
    });
  };

  revealOnScroll();
  window.addEventListener('scroll', revealOnScroll);
});
window.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('swoosh-sound');
  if (audio) {
    audio.play().catch((e) => {
      console.warn('Audio play was blocked:', e);
    });
  }

  // Show the main content after the splash screen delay
  setTimeout(() => {
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('site-content').classList.add('visible');
  }, 3000);
});

