// ===================================
// App Core — النخبة الطبية
// منطق التطبيق العام
// ===================================

import { toast, splash, haptic, helpers } from './ui.js';
import { auth } from './api.js';

// ===================================
// App Initialization
// ===================================
class App {
  constructor() {
    this.header = null;
    this.lastScrollY = 0;
    this.scrollThreshold = 50;
  }
  
  async init() {
    try {
      // Splash screen - hide after short delay
      if (splash && typeof splash.hide === 'function') {
        await splash.hide(1000);
      } else {
        // Fallback: remove splash element directly
        const splashEl = document.querySelector('.splash');
        if (splashEl) {
          splashEl.classList.add('hidden');
          setTimeout(() => splashEl.remove(), 600);
        }
      }
    } catch (err) {
      console.warn('Splash error:', err);
      const splashEl = document.querySelector('.splash');
      if (splashEl) splashEl.remove();
    }
    
    // Cache header
    this.header = document.querySelector('.app-header');
    
    // Setup features (each in try/catch to prevent one failure from stopping others)
    try { this.setupScrollBehavior(); } catch (e) { console.warn(e); }
    try { this.setupNavHighlight(); } catch (e) { console.warn(e); }
    try { this.setupPWAInstall(); } catch (e) { console.warn(e); }
    try { this.setupServiceWorker(); } catch (e) { console.warn(e); }
    try { this.setupBackButton(); } catch (e) { console.warn(e); }
    
    // Fade-in animations
    try { helpers.initFadeIn(); } catch (e) { console.warn(e); }
    
    // Log auth status
    try {
      if (auth.isLoggedIn()) {
        console.log('✅ Logged in as:', auth.getUser()?.full_name);
      }
    } catch (e) { console.warn(e); }
  }
  
  setupScrollBehavior() {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this.handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }
  
  handleScroll() {
    const y = window.scrollY;
    if (this.header) {
      if (y > this.scrollThreshold && y > this.lastScrollY) {
        this.header.classList.add('hidden');
      } else {
        this.header.classList.remove('hidden');
      }
      if (y > 10) {
        this.header.classList.add('scrolled');
      } else {
        this.header.classList.remove('scrolled');
      }
    }
    this.lastScrollY = y;
  }
  
  setupNavHighlight() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      const href = item.getAttribute('href');
      if (!href) return;
      const isActive = 
        href === currentPath ||
        (href === '/' && currentPath === '/') ||
        (href !== '/' && currentPath.startsWith(href.replace('.html', '')));
      if (isActive) item.classList.add('active');
    });
  }
  
  setupPWAInstall() {
    let deferredPrompt = null;
    const installBtn = document.querySelector('[data-pwa-install]');
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) installBtn.style.display = 'inline-flex';
    });
    
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) {
          toast.info('التطبيق مثبت بالفعل أو غير مدعوم');
          return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        haptic.medium();
        if (outcome === 'accepted') {
          toast.success('تم تثبيت التطبيق بنجاح! 🎉');
        }
        deferredPrompt = null;
        installBtn.style.display = 'none';
      });
    }
    
    window.addEventListener('appinstalled', () => {
      toast.success('تم تثبيت التطبيق! 🎉');
    });
  }
  
  setupServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ SW registered:', registration.scope);
      } catch (error) {
        console.warn('SW registration failed:', error);
      }
    });
  }
  
  setupBackButton() {
    window.addEventListener('popstate', () => {
      const sheetEl = document.querySelector('.bottom-sheet.active');
      if (sheetEl) {
        sheetEl.classList.remove('active');
        document.querySelector('.sheet-overlay')?.classList.remove('active');
        document.body.classList.remove('no-scroll');
      }
    });
  }
  
  goBack() {
    haptic.light();
    if (history.length > 1) {
      history.back();
    } else {
      window.location.href = '/';
    }
  }
  
  navigate(url) {
    haptic.light();
    window.location.href = url;
  }
}

// ===================================
// Global Error Handler
// ===================================
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// ===================================
// Global Functions (for inline handlers)
// ===================================
window.goBack = function() {
  haptic.light();
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = '/';
  }
};

// ===================================
// Export + Auto Init
// ===================================
const app = new App();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Expose globally
window.app = app;
window.haptic = haptic;
window.toast = toast;

export default app;
