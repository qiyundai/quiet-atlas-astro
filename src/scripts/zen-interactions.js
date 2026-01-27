/**
 * Zen Interactions for Quiet Atlas
 * Subtle, peaceful interactions that feel good
 */

// Smooth parallax effect on scroll
function initParallax() {
  const parallaxElements = document.querySelectorAll('.float');
  
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    
    parallaxElements.forEach(el => {
      const rate = 0.05;
      const yPos = -(scrolled * rate);
      el.style.transform = `translateY(${yPos}px)`;
    });
  }, { passive: true });
}

// Gentle cursor trail effect (optional, zen-like)
function initCursorBreath() {
  const cursor = document.createElement('div');
  cursor.className = 'cursor-breath';
  cursor.style.cssText = `
    position: fixed;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(139, 115, 85, 0.15) 0%, transparent 70%);
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    transition: transform 0.3s ease, opacity 0.3s ease;
    opacity: 0;
  `;
  document.body.appendChild(cursor);
  
  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.opacity = '1';
  });
  
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
  });
  
  function animate() {
    const dx = mouseX - cursorX;
    const dy = mouseY - cursorY;
    
    cursorX += dx * 0.1;
    cursorY += dy * 0.1;
    
    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

// Text reveal on scroll
function initTextReveal() {
  const reveals = document.querySelectorAll('.fade-in, .stagger-children');
  
  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -100px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Optional: unobserve after animation
        // observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  reveals.forEach(el => observer.observe(el));
}

// Smooth anchor scrolling
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Page transition effect
function initPageTransitions() {
  // Fade in on load
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.5s ease';
  
  window.addEventListener('load', () => {
    document.body.style.opacity = '1';
  });
  
  // Fade out on navigation
  document.querySelectorAll('a:not([target="_blank"]):not([href^="#"])').forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('http')) {
        e.preventDefault();
        document.body.style.opacity = '0';
        setTimeout(() => {
          window.location.href = href;
        }, 300);
      }
    });
  });
}

// Keyboard focus styles
function initAccessibleFocus() {
  document.body.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('using-keyboard');
    }
  });
  
  document.body.addEventListener('mousedown', () => {
    document.body.classList.remove('using-keyboard');
  });
}

// Subtle hover sound (optional - disabled by default)
function initHoverSounds() {
  // Uncomment to enable subtle hover sounds
  /*
  const hoverSound = new Audio('/sounds/hover.mp3');
  hoverSound.volume = 0.1;
  
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => {
      hoverSound.currentTime = 0;
      hoverSound.play().catch(() => {});
    });
  });
  */
}

// Initialize all interactions
document.addEventListener('DOMContentLoaded', () => {
  initTextReveal();
  initSmoothScroll();
  initPageTransitions();
  initAccessibleFocus();
  
  // Optional enhancements (uncomment to enable)
  // initParallax();
  // initCursorBreath();
  // initHoverSounds();
});

// Export for potential module usage
export {
  initParallax,
  initCursorBreath,
  initTextReveal,
  initSmoothScroll,
  initPageTransitions,
  initAccessibleFocus
};
