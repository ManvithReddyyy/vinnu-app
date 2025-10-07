import axios from 'axios';

// Get API base URL based on environment
const getApiBase = () => {
  const hostname = window.location.hostname;
  
  console.log('🌐 Current hostname:', hostname);
  console.log('🌐 Environment:', import.meta.env.MODE);
  
  // ✅ PRODUCTION (Vercel deployment)
  if (hostname.includes('vercel.app')) {
    const apiUrl = 'https://vinnu-app-1.onrender.com';
    console.log('🚀 Production mode - API URL:', apiUrl);
    return apiUrl;
  }
  
  // If accessing via IP address (mobile testing)
  if (hostname === '192.168.0.105') {
    const apiUrl = 'http://192.168.0.105:5000';
    console.log('📱 Mobile mode - API URL:', apiUrl);
    return apiUrl;
  }
  
  // If on localhost (desktop dev)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('💻 Desktop mode - using proxy');
    return ''; // Use Vite proxy
  }
  
  // Fallback to production
  console.log('⚠️ Unknown hostname, using production API');
  return 'https://vinnu-app-1.onrender.com';
};

const apiBase = getApiBase();

const api = axios.create({
  baseURL: `${apiBase}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ ADD TOKEN TO EVERY REQUEST
api.interceptors.request.use(request => {
  const token = localStorage.getItem('token');
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
    console.log('🔑 Added token to request');
  }
  console.log('🚀 API Request:', request.method.toUpperCase(), request.url);
  return request;
});

// Log all responses
api.interceptors.response.use(
  response => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  error => {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('❌ Response:', error.response.status, error.response.data);
    }
    return Promise.reject(error);
  }
);

export default api;
