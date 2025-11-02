// frontend/src/config/api.config.js
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:3001/api',
    timeout: 30000
  },
  production: {
    baseURL: 'https://medtestai-backend-1067292712875.us-central1.run.app/api',
    timeout: 30000
  }
};

const ENV = process.env.NODE_ENV || 'development';

export const API_BASE_URL = API_CONFIG[ENV].baseURL;
export const API_TIMEOUT = API_CONFIG[ENV].timeout;

export default API_CONFIG[ENV];