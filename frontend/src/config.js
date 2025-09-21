export const API_BASE_URL = 'https://medtestai-backend-1067292712875.us-central1.run.app';
export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  apiHealth: `${API_BASE_URL}/api/health`,
  workflow: `${API_BASE_URL}/api/workflow/complete`,
  export: `${API_BASE_URL}/api/tests/export`
};