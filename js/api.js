// ===================================
// API Client — النخبة الطبية
// Cookie + localStorage fallback
// ===================================

const API_BASE = 'https://medical-app-api.gomanji-00.workers.dev';

// ===================================
// Token Management
// ===================================
const TOKEN_KEY = 'elite_token';
const USER_KEY = 'elite_user';

// ============ Cookie Helpers ============
function setCookie(name, value, days = 30) {
  try {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (e) {
    console.warn('setCookie failed:', e);
  }
}

function getCookie(name) {
  try {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch (e) {
    return null;
  }
}

function deleteCookie(name) {
  try {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  } catch (e) {}
}

// ============ Storage with Cookie Fallback ============
function storageGet(key) {
  // Try localStorage first
  try {
    const val = localStorage.getItem(key);
    if (val) return val;
  } catch {}
  // Fallback to cookie
  return getCookie(key);
}

function storageSet(key, value) {
  // Try localStorage
  try {
    localStorage.setItem(key, value);
  } catch {}
  // Always set cookie too (redundancy)
  setCookie(key, value);
}

function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
  deleteCookie(key);
}

// ============ Auth ============
export const auth = {
  getToken() {
    return storageGet(TOKEN_KEY);
  },
  
  setToken(token) {
    storageSet(TOKEN_KEY, token);
  },
  
  getUser() {
    const raw = storageGet(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch { return null; }
  },
  
  setUser(user) {
    storageSet(USER_KEY, JSON.stringify(user));
  },
  
  clear() {
    storageRemove(TOKEN_KEY);
    storageRemove(USER_KEY);
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
  async list(clinicId = null) {
    const query = clinicId ? `?clinic_id=${clinicId}` : '';
    return request(`/api/services${query}`, { skipAuth: true });
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
  },
  
  async searchByPhone(phone) {
    return request(`/api/appointments/search?phone=${encodeURIComponent(phone)}`, { skipAuth: true });
  }
};

// ===================================
// Admin API
// ===================================
export const adminAPI = {
  async doctors() {
    return request('/api/admin/doctors');
  },
  
  async createDoctor(payload) {
    return request('/api/admin/doctors', {
      method: 'POST',
      body: payload
    });
  },
  
  async changePassword(userId, newPassword) {
    return request('/api/admin/doctors/password', {
      method: 'POST',
      body: { user_id: userId, new_password: newPassword }
    });
  },
  
  async appointments(filters = {}) {
    const params = new URLSearchParams();
    if (filters.clinic_id) params.append('clinic_id', filters.clinic_id);
    if (filters.status) params.append('status', filters.status);
    const query = params.toString();
    return request(`/api/admin/appointments${query ? '?' + query : ''}`);
  },
  
  async deleteAppointment(id) {
    return request(`/api/admin/appointments/${id}`, { method: 'DELETE' });
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
  adminAPI,
  doctorAPI,
  patientAPI,
  systemAPI
};
