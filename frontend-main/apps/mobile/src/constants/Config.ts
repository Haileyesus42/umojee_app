// frontend-main/apps/mobile/src/constants/Config.ts

export const API_BASE_URL = 
  process.env.EXPO_PUBLIC_NODE_BACKEND_URL || 
  process.env.EXPO_PUBLIC_BACKEND_URL || 
  'http://localhost:3001';

export const PYTHON_AI_BASE_URL = 
  process.env.EXPO_PUBLIC_AI_BACKEND_URL || 
  process.env.EXPO_PUBLIC_FASTAPI_BACKEND_URL || 
  'http://localhost:8000'; 