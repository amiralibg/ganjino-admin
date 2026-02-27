import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import {
  DashboardStats,
  SecurityInsightsResponse,
  SignInUserResponse,
  UserFilters,
  UserDetailsResponse,
  UsersResponse,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const ACCESS_TOKEN_KEY = 'ganjino_admin_access_token';
const REFRESH_TOKEN_KEY = 'ganjino_admin_refresh_token';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export const tokenStore = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

const isUnauthorizedError = (error: unknown): error is AxiosError => {
  return axios.isAxiosError(error) && error.response?.status === 401;
};

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) {
    throw new Error('Missing refresh token');
  }

  const { data } = await client.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
    refreshToken,
  });

  tokenStore.setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
};

const authorizedRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const accessToken = tokenStore.getAccessToken();
  if (!accessToken) {
    throw new Error('Missing access token');
  }

  try {
    const response = await client.request<T>({
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    if (!isUnauthorizedError(error)) {
      throw error;
    }

    const newToken = await refreshAccessToken();
    const response = await client.request<T>({
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${newToken}`,
      },
    });
    return response.data;
  }
};

export interface SignInResponse {
  user: SignInUserResponse;
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  async signIn(email: string, password: string): Promise<SignInResponse> {
    const { data } = await client.post<SignInResponse>('/auth/signin', {
      email,
      password,
      platform: 'web',
      deviceName: 'Ganjino Admin Dashboard',
      deviceId: 'ganjino-admin-web',
    });
    return data;
  },
  async logout(): Promise<void> {
    const refreshToken = tokenStore.getRefreshToken();
    if (refreshToken) {
      await client.post('/auth/logout', { refreshToken });
    }
    tokenStore.clear();
  },
  getMe(): Promise<{
    user: {
      id: string;
      name: string;
      email: string;
      role: 'admin' | 'super_admin' | 'user';
    };
  }> {
    return authorizedRequest({
      method: 'GET',
      url: '/auth/me',
    });
  },
};

export const adminApi = {
  getStats(): Promise<DashboardStats> {
    return authorizedRequest<DashboardStats>({
      method: 'GET',
      url: '/admin/stats',
    });
  },
  getUsers(params: { page: number; limit: number; search?: string }): Promise<UsersResponse> {
    return authorizedRequest<UsersResponse>({
      method: 'GET',
      url: '/admin/users',
      params,
    });
  },
  getUsersWithFilters(params: {
    page: number;
    limit: number;
    search?: string;
    role?: UserFilters['role'];
    status?: UserFilters['status'];
    sortBy?: UserFilters['sortBy'];
    sortOrder?: UserFilters['sortOrder'];
  }): Promise<UsersResponse> {
    return authorizedRequest<UsersResponse>({
      method: 'GET',
      url: '/admin/users',
      params,
    });
  },
  getUserDetails(userId: string): Promise<UserDetailsResponse> {
    return authorizedRequest<UserDetailsResponse>({
      method: 'GET',
      url: `/admin/users/${userId}`,
    });
  },
  toggleUserStatus(userId: string): Promise<void> {
    return authorizedRequest<void>({
      method: 'PATCH',
      url: `/admin/users/${userId}/toggle-status`,
    });
  },
  promoteToAdmin(userId: string): Promise<void> {
    return authorizedRequest<void>({
      method: 'PATCH',
      url: `/admin/users/${userId}/promote`,
    });
  },
  demoteToUser(userId: string): Promise<void> {
    return authorizedRequest<void>({
      method: 'PATCH',
      url: `/admin/users/${userId}/demote`,
    });
  },
  getSecurityInsights(): Promise<SecurityInsightsResponse> {
    return authorizedRequest<SecurityInsightsResponse>({
      method: 'GET',
      url: '/admin/security/insights',
    });
  },
};
