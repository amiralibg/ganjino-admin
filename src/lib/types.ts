export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin' | 'user';
  isActive: boolean;
  createdAt: string;
}

export interface SignInUserResponse {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin' | 'user';
}

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
    superAdmins?: number;
  };
  goals: {
    total: number;
    wishlisted: number;
  };
  sessions: {
    active: number;
  };
}

export interface UsersResponse {
  users: AdminUser[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export interface UserFilters {
  role?: 'all' | 'user' | 'admin' | 'super_admin';
  status?: 'all' | 'active' | 'inactive';
  sortBy?: 'createdAt' | 'name' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface SessionInfo {
  _id: string;
  createdAt: string;
  expiresAt: string;
  deviceInfo: {
    deviceId: string;
    deviceName: string;
    platform: string;
  };
  securityInfo: {
    ipAddress?: string;
    suspiciousActivity: boolean;
    lastUsedAt: string;
    usageCount: number;
  };
}

export interface UserDetailsResponse {
  user: AdminUser;
  stats: {
    activeSessions: number;
    goalCount: number;
  };
  sessions: SessionInfo[];
}

export interface SecurityInsightsResponse {
  stats: {
    totalActiveSessions: number;
    suspiciousSessions: number;
    last24hLogins: number;
  };
  suspiciousSessions: Array<{
    _id: string;
    createdAt: string;
    userId: {
      _id: string;
      name: string;
      email: string;
    };
    deviceInfo: {
      deviceName: string;
      platform: string;
    };
    securityInfo: {
      ipAddress?: string;
    };
  }>;
  loginTimeline24h?: Array<{
    label: string;
    count: number;
  }>;
}
