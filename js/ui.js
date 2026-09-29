// ===================================
// UI Utilities — النخبة الطبية
// Toast, Bottom Sheet, Loader, Splash
// ===================================

// ===================================
// TOAST NOTIFICATIONS
// ===================================
export const toast = {
  container: null,
  
  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },
  
  show(message, type = 'info', duration = 3000) {
    this.init();
    
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <span class="toast-message">${this.escape(message)}</span>
    `;
    
    this.container.appendChild(el);
    
    if (duration > 0) {
      setTimeout(() => this.hide(el), duration);
    }
    
    return el;
  },
  
  hide(el) {
    if (!el || !el.parentNode) return;
    el.classList.add('hiding');
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
  },
  
  success(message, duration) {
    return this.show(message, 'success', duration);
  },
  
  error(message, duration) {
    return this.show(message, 'error', duration);
  },
  
  warning(message, duration) {
    return this.show(message, 'warning', duration);
  },
  
  info(message, duration) {
    return this.show(message, 'info', duration);
  },
  
  escape(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
};

// ===================================
// LOADER
// ===================================
export const loader = {
  el: null,
  count: 0,
  
  init() {
    if (this.el) return;
    this.el = document.createElement('div');
    this.el.className = 'loader-overlay';
    this.el.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(this.el);
  },
  
  show() {
    this.init();
    this.count++;
    this.el.classList.add('active');
  },
  
  hide() {
    if (!this.el) return;
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0) {
      this.el.classList.remove('active');
    }
  },
  
  forceHide() {
    if (!this.el) return;
    this.count = 0;
    this.el.classList.remove('active');
  }
};

// ===================================
// BOTTOM SHEET
// ===================================
export const sheet = {
  overlay: null,
  el: null,
  currentResolve: null,
  
  init() {
    if (this.el) return;
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'sheet-overlay';
    this.overlay.addEventListener('click', () => this.close());
    
    this.el = document.createElement('div');
    this.el.className = 'bottom-sheet';
    this.el.innerHTML = `
      <div class="sheet-handle"></div>
      <div class="sheet-body"></div>
    `;
    
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.el);
  },
  
  open({ title = '', content = '', actions = [] } = {}) {
    this.init();
    
    const body = this.el.querySelector('.sheet-body');
    body.innerHTML = '';
    
    if (title) {
      const titleEl = document.createElement('h3');
      titleEl.className = 'sheet-title';
      titleEl.textContent = title;
      body.appendChild(titleEl);
    }
    
    if (typeof content === 'string') {
      const contentEl = document.createElement('div');
      contentEl.innerHTML = content;
      body.appendChild(contentEl);
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    }
    
    if (actions.length > 0) {
      const actionsEl = document.createElement('div');
      actionsEl.style.display = 'flex';
      actionsEl.style.gap = '10px';
      actionsEl.style.marginTop = '20px';
      actionsEl.style.flexDirection = 'column';
      
      actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = `btn ${action.variant || 'btn-outline'} btn-block`;
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
          if (action.onClick) action.onClick();
          if (action.close !== false) this.close();
        });
        actionsEl.appendChild(btn);
      });
      
      body.appendChild(actionsEl);
    }
    
    document.body.classList.add('no-scroll');
    
    requestAnimationFrame(() => {
      this.overlay.classList.add('active');
      this.el.classList.add('active');
    });
  },
  
  close() {
    if (!this.el) return;
    this.el.classList.remove('active');
    this.overlay.classList.remove('active');
    document.body.classList.remove('no-scroll');
    
    if (this.currentResolve) {
      this.currentResolve(null);
      this.currentResolve = null;
    }
  },
  
  confirm({ title, message, confirmText = 'تأكيد', cancelText = 'إلغاء', variant = 'btn-primary' }) {
    return new Promise((resolve) => {
      this.currentResolve = resolve;
      
      const content = document.createElement('div');
      content.style.textAlign = 'center';
      content.innerHTML = `
        <p style="color: var(--gray); font-size: 15px; line-height: 1.7; margin-bottom: 8px;">${this.escape(message)}</p>
      `;
      
      this.open({
        title,
        content,
        actions: [
          {
            label: confirmText,
            variant,
            onClick: () => resolve(true)
          },
          {
            label: cancelText,
            variant: 'btn-ghost',
            onClick: () => resolve(false)
          }
        ]
      });
    });
  },
  
  escape(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
};

// ===================================
// SPLASH SCREEN
// ===================================
export const splash = {
  el: null,
  
  init() {
    if (document.querySelector('.splash')) {
      this.el = document.querySelector('.splash');
      return;
    }
    
    this.el = document.createElement('div');
    this.el.className = 'splash';
    this.el.innerHTML = `
      <div class="splash-logo">🏥</div>
      <div class="splash-title">النخبة <span>الطبية</span></div>
      <div class="splash-subtitle">ELITE MEDICAL</div>
      <div class="splash-loader"></div>
    `;
    
    document.body.appendChild(this.el);
  },
  
  async hide(delay = 1200) {
    this.init();
    await new Promise(r => setTimeout(r, delay));
    this.el.classList.add('hidden');
    setTimeout(() => {
      if (this.el && this.el.parentNode) {
        this.el.parentNode.removeChild(this.el);
      }
    }, 600);
  }
};

// ===================================
// HAPTIC FEEDBACK
// ===================================
export const haptic = {
  light() {
    if (navigator.vibrate) navigator.vibrate(10);
  },
  medium() {
    if (navigator.vibrate) navigator.vibrate(20);
  },
  heavy() {
    if (navigator.vibrate) navigator.vibrate([30, 10, 30]);
  },
  success() {
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
  },
  error() {
    if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 50]);
  }
};

// ===================================
// PULL TO REFRESH
// ===================================
export const pullToRefresh = {
  init(onRefresh) {
    let startY = 0;
    let pulling = false;
    const threshold = 80;
    
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%) translateY(-60px);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--gold);
      color: var(--black);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      z-index: 99;
      transition: transform 0.3s ease;
      box-shadow: 0 4px 16px rgba(201, 169, 97, 0.4);
    `;
    indicator.innerHTML = '↓';
    document.body.appendChild(indicator);
    
    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
      if (!pulling) return;
      const delta = e.touches[0].clientY - startY;
      if (delta > 0 && window.scrollY === 0) {
        const progress = Math.min(delta / threshold, 1);
        indicator.style.transform = `translateX(-50%) translateY(${-60 + progress * 80}px)`;
        if (progress >= 1) indicator.innerHTML = '↻';
      }
    }, { passive: true });
    
    document.addEventListener('touchend', async () => {
      if (!pulling) return;
      const rect = indicator.getBoundingClientRect();
      if (rect.top > 20) {
        indicator.innerHTML = '⏳';
        haptic.medium();
        if (onRefresh) await onRefresh();
        haptic.success();
      }
      indicator.style.transform = 'translateX(-50%) translateY(-60px)';
      indicator.innerHTML = '↓';
      pulling = false;
    });
  }
};

// ===================================
// HELPERS
// ===================================
export const helpers = {
  // Fade-in on scroll
  initFadeIn() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
  },
  
  // Format date in Arabic
  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ar-AE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  },
  
  // Format time
  formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr;
  },
  
  // Format currency
  formatPrice(price) {
    if (!price && price !== 0) return '';
    return new Intl.NumberFormat('ar-AE').format(price);
  },
  
  // Get status badge
  getStatusBadge(status) {
    const map = {
      pending: { text: 'قيد الانتظار', class: 'badge-warning' },
      confirmed: { text: 'مؤكد', class: 'badge-success' },
      completed: { text: 'مكتمل', class: 'badge-info' },
      cancelled: { text: 'ملغي', class: 'badge-danger' }
    };
    return map[status] || { text: status, class: 'badge-gray' };
  },
  
  // Escape HTML
  escape(str) {
    const div = document.createElement('div');
    div.textContent = String(str || '');
    return div.innerHTML;
  },
  
  // Debounce
  debounce(fn, delay = 300) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
};

// ===================================
// Export Default
// ===================================
export default {
  toast,
  loader,
  sheet,
  splash,
  haptic,
  pullToRefresh,
  helpers
};
