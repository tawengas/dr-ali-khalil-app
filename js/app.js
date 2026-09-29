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
    // Splash screen
    await splash.hide(1200);
    
    // Cache header
    this.header = document.querySelector('.app-header');
    
    // Setup features
    this.setupScrollBehavior();
    this.setupNavHighlight();
    this.setupPWAInstall();
    this.setupServiceWorker();
    this.setupBackButton();
    
    // Fade-in animations
    helpers.initFadeIn();
    
    // Log auth status
    if (auth.isLoggedIn()) {
      console.log('✅ Logged in as:', auth.getUser()?.full_name);
    }
  }
  
  // ===================================
  // Hide/Show Header on Scroll
  // ===================================
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
  
  // ===================================
  // Highlight Active Nav Item
  // ===================================
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
      
      if (isActive) {
        item.classList.add('active');
      }
    });
  }
  
  // ===================================
  // PWA Install Prompt
  // ===================================
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
  
  // ===================================
  // Service Worker Registration
  // ===================================
  setupServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ SW registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast.info('يتوفر تحديث جديد. أغلق التطبيق وأعد فتحه.', 5000);
            }
          });
        });
      } catch (error) {
        console.warn('SW registration failed:', error);
      }
    });
  }
  
  // ===================================
  // Handle Back Button (Android)
  // ===================================
  setupBackButton() {
    window.addEventListener('popstate', () => {
      // Close any open sheet
      const sheet = document.querySelector('.bottom-sheet.active');
      if (sheet) {
        sheet.classList.remove('active');
        document.querySelector('.sheet-overlay')?.classList.remove('active');
        document.body.classList.remove('no-scroll');
      }
    });
  }
  
  // ===================================
  // Helpers
  // ===================================
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
// Export + Auto Init
// ===================================
const app = new App();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Expose globally for inline handlers
window.app = app;
window.haptic = haptic;
window.toast = toast;

export default app;
