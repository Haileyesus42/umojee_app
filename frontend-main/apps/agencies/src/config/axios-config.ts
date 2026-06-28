import axios, { AxiosError } from 'axios';
import { HTTP_RESPONSE, TOKEN } from '../constants/general';

const frontEndUrl = (import.meta as any).env.VITE_FRONTEND_URL;
const baseURL = (import.meta as any).env.VITE_BACKEND_URL;

const API = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'Application/json',
  },
  timeout: 120000,
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN);
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log(JSON.stringify(error)); //TODO: it needs to replace by third party logger like Sentry
    const e = error as AxiosError;
    // if (e.status === HTTP_RESPONSE.UNAUTHORIZED) {
    //   localStorage.clear();
    //   window.location.href = `${frontEndUrl}/login`;
    // } else {
    //   window.location.href = `${frontEndUrl}/error`;
    // }
  },
);

export default API;
