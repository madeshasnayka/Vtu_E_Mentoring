import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Automatically resolve PC's current LAN IP dynamically from Expo host URI for local dev
const getDynamicIp = () => {
  const debuggerHost = 
    Constants.expoConfig?.hostUri || 
    Constants.manifest?.debuggerHost || 
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost) {
    return debuggerHost.split(':')[0];
  }
  return '10.122.149.182';
};

// Production Render URL vs Local LAN URL toggle
const isProduction = true; // Set to false if you are testing locally on your machine with Expo Go

const getBaseUrl = () => {
  if (isProduction) {
    return 'https://vtu-e-mentoring.onrender.com/api/v1';
  }
  const BACKEND_LAN_IP = getDynamicIp();
  return `http://${BACKEND_LAN_IP}:5000/api/v1`;
};

export const BASE_URL = getBaseUrl();

console.log('[API Client Initialized] Base URL:', BASE_URL);

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, // 45 seconds to accommodate Render free-tier cold starts
});

// Request Interceptor: Automatically injects JWT from SecureStore
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('oms_jwt_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[SecureStore Interceptor Error]:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Logs HTTP errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.log(`[API Response Error] ${error.config?.url} -> Status: ${error.response.status}`);
    } else {
      console.log(`[API Network Drop] ${error.config?.url} -> Message: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

export default apiClient;