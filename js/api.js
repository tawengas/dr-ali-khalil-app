// ===================================
// API Client — النخبة الطبية
// التواصل مع Cloudflare Worker
// ===================================

const API_BASE = 'https://medical-app-api.gomanji-00.workers.dev';

// ===================================
// Token Management
// ===================================
const TOKEN_KEY = 'elite_token';
const USER_KEY = 'elite_user';

export const auth = {
  getToken() {
    try { return localStorage.getItem(TOKEN_KEY); }
    catch { return null; }
  },
  
  setToken(token) {
    try { localStorage.setItem(TOKEN_KEY, token); }
    catch {}
  },
  
  getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  
  setUser(user) {
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); }
    catch {}
  },
  
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  },
  
  isLoggedIn() {
    return !!this.getToken();
  },
  
  isDoctor() {
    const user = this.getUser();
    return user && user.role === 'doctor';
  },
  
  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  },
  
  isPatient() {
    const user = this.getUser();
    return user && user.role === 'patient';
  }
};

// ===================================
// Core Fetch Wrapper
// ===================================
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const token = auth.getToken();
  if (token && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { success: response.ok, error: await response.text() };
    }
    
    if (!response.ok) {
      // 401 — token expired
      if (response.status === 401) {
        auth.clear();
      }
      
      const error = new Error(data.error || data.message || `خطأ ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    
    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const netError = new Error('لا يوجد اتصال بالإنترنت');
      netError.isNetwork = true;
      throw netError;
    }
    throw error;
  }
}

// ===================================
// Auth API
// ===================================
export const authAPI = {
  async login(email, password) {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true
    });
    
    if (data.success && data.token) {
      auth.setToken(data.token);
      auth.setUser(data.user);
    }
    
    return data;
  },
  
  async register(payload) {
    const data = await request('/api/auth/register', {
      method: 'POST',
      body: payload,
      skipAuth: true
    });
    
    if (data.success && data.token) {
      auth.setToken(data.token);
      auth.setUser(data.user);
    }
    
    return data;
  },
  
  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {}
    auth.clear();
  },
  
  async me() {
    return request('/api/auth/me');
  }
};

// ===================================
// Clinics API
// ===================================
export const clinicsAPI = {
  async list() {
    return request('/api/clinics', { skipAuth: true });
  },
  
  async get(id) {
    return request(`/api/clinics/${id}`, { skipAuth: true });
  }
};

// ===================================
// Services API
// ===================================
export const servicesAPI = {
  async list() {
    return request('/api/services', { skipAuth: true });
  }
};

// ===================================
// Appointments API
// ===================================
export const appointmentsAPI = {
  async create(payload) {
    return request('/api/appointments', {
      method: 'POST',
      body: payload,
      skipAuth: true
    });
  },
  
  async doctorList(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.date) params.append('date', filters.date);
    const query = params.toString();
    return request(`/api/doctor/appointments${query ? '?' + query : ''}`);
  },
  
  async doctorUpdate(id, updates) {
    return request(`/api/doctor/appointments/${id}`, {
      method: 'PATCH',
      body: updates
    });
  },
  
  async patientList() {
    return request('/api/patient/appointments');
  }
};

// ===================================
// Doctor API
// ===================================
export const doctorAPI = {
  async stats() {
    return request('/api/doctor/stats');
  }
};

// ===================================
// Patient API
// ===================================
export const patientAPI = {
  async records() {
    return request('/api/patient/records');
  }
};

// ===================================
// Health Check
// ===================================
export const systemAPI = {
  async health() {
    return request('/api/health', { skipAuth: true });
  }
};

// ===================================
// Export Default
// ===================================
export default {
  auth,
  authAPI,
  clinicsAPI,
  servicesAPI,
  appointmentsAPI,
  doctorAPI,
  patientAPI,
  systemAPI
};
