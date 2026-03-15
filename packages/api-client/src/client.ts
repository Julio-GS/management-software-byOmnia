import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  getToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
}

export class ApiClient {
  private axios: AxiosInstance;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;

    this.axios = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - inject token
    this.axios.interceptors.request.use(async (config) => {
      if (this.config.getToken) {
        const token = await this.config.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Response interceptor - handle errors
    this.axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.config.onUnauthorized?.();
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axios.get<T>(url, config);
    return response.data;
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    console.log('🔍 ApiClient.post - URL:', url);
    console.log('🔍 ApiClient.post - Data:', data);
    const response = await this.axios.post<T>(url, data, config);
    console.log('🔍 ApiClient.post - Full response:', response);
    console.log('🔍 ApiClient.post - response.data:', response.data);
    console.log('🔍 ApiClient.post - response.status:', response.status);
    return response.data;
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axios.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axios.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axios.delete<T>(url, config);
    return response.data;
  }
}
