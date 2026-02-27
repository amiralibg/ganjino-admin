import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { ThemeToggle } from './components/theme-toggle';
import { adminApi, authApi, tokenStore } from './lib/api';
import { AdminUser, SecurityInsightsResponse, SessionInfo, SignInUserResponse, UserDetailsResponse } from './lib/types';
import { cn } from './lib/utils';

const PAGE_SIZE = 10;

const formatDate = (value: string | undefined): string => {
  if (!value) {
    return 'N/A';
  }
  return new Date(value).toLocaleString();
};

function App() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(Boolean(tokenStore.getAccessToken()));
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin' | 'super_admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'email'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.getMe,
    enabled: isAuthed,
  });

  const isAdmin = meQuery.data?.user.role === 'admin' || meQuery.data?.user.role === 'super_admin';
  const canManageUsers = meQuery.data?.user.role === 'super_admin';

  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
    enabled: isAuthed && isAdmin,
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users', page, search, roleFilter, statusFilter, sortBy, sortOrder],
    queryFn: () =>
      adminApi.getUsersWithFilters({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        role: roleFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
      }),
    enabled: isAuthed && isAdmin,
  });

  const securityQuery = useQuery({
    queryKey: ['admin-security-insights'],
    queryFn: adminApi.getSecurityInsights,
    enabled: isAuthed && isAdmin,
  });

  const userDetailsQuery = useQuery({
    queryKey: ['admin-user-details', selectedUserId],
    queryFn: () => adminApi.getUserDetails(selectedUserId as string),
    enabled: isAuthed && isAdmin && Boolean(selectedUserId),
  });

  const signInMutation = useMutation({
    mutationFn: ({ emailValue, passwordValue }: { emailValue: string; passwordValue: string }) =>
      authApi.signIn(emailValue, passwordValue),
    onSuccess: (result: { user: SignInUserResponse; accessToken: string; refreshToken: string }) => {
      if (result.user.role !== 'admin' && result.user.role !== 'super_admin') {
        tokenStore.clear();
        setAuthError('Your account is not an admin account.');
        return;
      }

      tokenStore.setTokens(result.accessToken, result.refreshToken);
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setPage(1);
      setSearch('');
      setSearchInput('');
      setRoleFilter('all');
      setStatusFilter('all');
      setSortBy('createdAt');
      setSortOrder('desc');
      setSelectedUserId(null);
      setAuthError(null);
      setActionError(null);
      setIsAuthed(true);
      void queryClient.invalidateQueries();
    },
    onError: () => {
      setAuthError('Sign in failed. Check credentials and try again.');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (userId: string) => adminApi.toggleUserStatus(userId),
    onSuccess: async (_unused: void, userId: string) => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-security-insights'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-user-details', userId] }),
      ]);
    },
    onError: () => {
      setActionError('Could not update user status.');
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (userId: string) => adminApi.promoteToAdmin(userId),
    onSuccess: async (_unused: void, userId: string) => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-user-details', userId] }),
      ]);
    },
    onError: () => {
      setActionError('Could not promote user.');
    },
  });

  const demoteMutation = useMutation({
    mutationFn: (userId: string) => adminApi.demoteToUser(userId),
    onSuccess: async (_unused: void, userId: string) => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-user-details', userId] }),
      ]);
    },
    onError: () => {
      setActionError('Could not demote admin.');
    },
  });

  const onSignIn = (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    signInMutation.mutate({ emailValue: email, passwordValue: password });
  };

  const onLogout = async () => {
    await authApi.logout();
    setIsAuthed(false);
    setSelectedUserId(null);
    queryClient.clear();
  };

  const onSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const onToggleStatus = (user: AdminUser) => {
    if (!canManageUsers) {
      return;
    }
    toggleStatusMutation.mutate(user._id);
  };

  const onPromote = (user: AdminUser) => {
    if (!canManageUsers) {
      return;
    }
    promoteMutation.mutate(user._id);
  };

  const onDemote = (user: AdminUser) => {
    if (!canManageUsers) {
      return;
    }
    demoteMutation.mutate(user._id);
  };

  const isLoadingDashboard =
    meQuery.isLoading || statsQuery.isLoading || usersQuery.isLoading || securityQuery.isLoading;
  const hasDashboardError = meQuery.isError || statsQuery.isError || usersQuery.isError || securityQuery.isError;

  const pageInfo = useMemo(() => usersQuery.data?.pagination, [usersQuery.data?.pagination]);
  const users = usersQuery.data?.users || [];
  const suspiciousSessions = securityQuery.data?.suspiciousSessions || [];
  const userDetails = userDetailsQuery.data as UserDetailsResponse | undefined;
  const securityData = securityQuery.data as SecurityInsightsResponse | undefined;
  const loginTimeline = securityData?.loginTimeline24h || [];
  const maxTimelineCount = Math.max(...loginTimeline.map((point) => point.count), 1);
  const activeCount = statsQuery.data?.users.active || 0;
  const inactiveCount = statsQuery.data?.users.inactive || 0;
  const totalUsersCount = Math.max(activeCount + inactiveCount, 1);

  if (!isAuthed) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-end">
              <ThemeToggle />
            </div>
            <div>
              <CardTitle>Ganjino Admin</CardTitle>
              <CardDescription>Admin access for users, sessions, and platform health.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSignIn}>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {authError ? <p className="text-sm text-destructive">{authError}</p> : null}
              <Button type="submit" className="w-full" disabled={signInMutation.isPending}>
                {signInMutation.isPending ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
            <CardDescription>This account does not have admin dashboard access.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void onLogout()}>Logout</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background xl:h-screen xl:overflow-hidden">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] grid-rows-[auto_auto_auto] gap-3 p-3 sm:p-4 xl:h-full xl:min-h-0 xl:grid-rows-[auto_auto_1fr]">
        <header className="rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Ganjino Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Release readiness visibility: users, activity, and operational risks.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={canManageUsers ? 'default' : 'secondary'}>
                {canManageUsers ? 'Super Admin' : 'Admin'}
              </Badge>
              <ThemeToggle />
              <Button variant="outline" onClick={() => void queryClient.invalidateQueries()}>
                Refresh
              </Button>
              <Button variant="secondary" onClick={() => void onLogout()}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-2xl">{statsQuery.data?.users.total ?? '-'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{statsQuery.data?.users.active ?? '-'} active</p>
            </CardContent>
          </Card>
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardDescription>Admin Accounts</CardDescription>
              <CardTitle className="text-2xl">{statsQuery.data?.users.admins ?? '-'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{statsQuery.data?.users.superAdmins ?? '-'} super admins</p>
            </CardContent>
          </Card>
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardDescription>Total Goals</CardDescription>
              <CardTitle className="text-2xl">{statsQuery.data?.goals.total ?? '-'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{statsQuery.data?.goals.wishlisted ?? '-'} wishlisted</p>
            </CardContent>
          </Card>
          <Card className="w-full">
            <CardHeader className="pb-3">
              <CardDescription>Active Sessions</CardDescription>
              <CardTitle className="text-2xl">{statsQuery.data?.sessions.active ?? '-'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Current valid refresh sessions</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 xl:min-h-0 xl:grid-cols-[1.5fr_1fr]">
          <Card className="flex min-w-0 w-full flex-col xl:min-h-0">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>Full-height table to monitor all accounts.</CardDescription>
                </div>
                <div className="flex min-w-0 w-full max-w-4xl flex-col gap-2">
                  <form onSubmit={onSearchSubmit} className="flex w-full min-w-0 gap-2">
                    <Input
                      className="min-w-0 flex-1"
                      placeholder="Search by name or email"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                    />
                    <Button type="submit" variant="outline">
                      Search
                    </Button>
                  </form>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={roleFilter}
                      onChange={(event) => {
                        setPage(1);
                        setRoleFilter(event.target.value as 'all' | 'user' | 'admin' | 'super_admin');
                      }}
                    >
                      <option value="all">All Roles</option>
                      <option value="user">Users</option>
                      <option value="admin">Admins</option>
                      <option value="super_admin">Super Admins</option>
                    </select>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={statusFilter}
                      onChange={(event) => {
                        setPage(1);
                        setStatusFilter(event.target.value as 'all' | 'active' | 'inactive');
                      }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={sortBy}
                      onChange={(event) => {
                        setPage(1);
                        setSortBy(event.target.value as 'createdAt' | 'name' | 'email');
                      }}
                    >
                      <option value="createdAt">Sort: Created</option>
                      <option value="name">Sort: Name</option>
                      <option value="email">Sort: Email</option>
                    </select>
                    <div className="flex gap-2">
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={sortOrder}
                        onChange={(event) => {
                          setPage(1);
                          setSortOrder(event.target.value as 'asc' | 'desc');
                        }}
                      >
                        <option value="desc">Desc</option>
                        <option value="asc">Asc</option>
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPage(1);
                          setRoleFilter('all');
                          setStatusFilter('all');
                          setSortBy('createdAt');
                          setSortOrder('desc');
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              {!canManageUsers ? (
                <p className="text-xs text-muted-foreground">Role actions are restricted to super admin accounts.</p>
              ) : null}
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-3 p-0 xl:min-h-0 xl:flex-1">
              <div className="max-h-[58vh] min-w-0 xl:min-h-0 xl:max-h-none xl:flex-1">
                <Table className="min-w-[980px]">
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: AdminUser) => (
                      <TableRow
                        key={user._id}
                        data-state={selectedUserId === user._id ? 'selected' : undefined}
                        className="cursor-pointer"
                        onClick={() => setSelectedUserId(user._id)}
                      >
                        <TableCell>{user.name}</TableCell>
                        <TableCell className="font-mono text-xs sm:text-sm">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'warning'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex min-w-max flex-nowrap justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canManageUsers || toggleStatusMutation.isPending}
                              onClick={(event) => {
                                event.stopPropagation();
                                onToggleStatus(user);
                              }}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            {user.role === 'user' ? (
                              <Button
                                size="sm"
                                disabled={!canManageUsers || promoteMutation.isPending}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onPromote(user);
                                }}
                              >
                                Promote
                              </Button>
                            ) : null}
                            {user.role === 'admin' ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={!canManageUsers || demoteMutation.isPending}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onDemote(user);
                                }}
                              >
                                Demote
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pageInfo ? (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    Page {pageInfo.page} / {Math.max(pageInfo.pages, 1)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pageInfo.page <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pageInfo.page >= pageInfo.pages}
                      onClick={() => setPage((value) => Math.min(pageInfo.pages, value + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid min-w-0 w-full gap-3 xl:min-h-0 xl:grid-rows-2">
            <Card className="flex min-w-0 w-full flex-col xl:min-h-0">
              <CardHeader>
                <CardTitle>User Detail</CardTitle>
                <CardDescription>Inspect active sessions and user-level stats.</CardDescription>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                {selectedUserId && userDetailsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading user details...</p>
                ) : null}
                {userDetails ? (
                  <>
                    <div className="rounded-lg border p-3">
                      <p className="font-medium">
                        {userDetails.user.name} ({userDetails.user.email})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Active Sessions: {userDetails.stats.activeSessions}
                      </p>
                      <p className="text-sm text-muted-foreground">Goal Count: {userDetails.stats.goalCount}</p>
                    </div>
                    <div className="space-y-2">
                      {userDetails.sessions.map((session: SessionInfo) => (
                        <div key={session._id} className="rounded-lg border p-3 text-sm">
                          <p>{session.deviceInfo.deviceName || 'Unknown device'}</p>
                          <p className="text-muted-foreground">
                            {session.deviceInfo.platform} • Last used {formatDate(session.securityInfo.lastUsedAt)}
                          </p>
                          <p className="text-muted-foreground">IP: {session.securityInfo.ipAddress || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a user row to inspect details and sessions.</p>
                )}
              </CardContent>
            </Card>

            <Card className="flex min-w-0 w-full flex-col overflow-hidden xl:min-h-0">
              <CardHeader>
                <CardTitle>Security Insights</CardTitle>
                <CardDescription>Suspicious sessions and login volume.</CardDescription>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-lg font-semibold">{securityData?.stats.suspiciousSessions ?? '-'}</p>
                    <small className="text-muted-foreground">Suspicious sessions</small>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-lg font-semibold">{securityData?.stats.last24hLogins ?? '-'}</p>
                    <small className="text-muted-foreground">Logins (24h)</small>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-lg font-semibold">{securityData?.stats.totalActiveSessions ?? '-'}</p>
                    <small className="text-muted-foreground">Total active sessions</small>
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">User Composition</p>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-3 bg-primary"
                      style={{ width: `${(activeCount / totalUsersCount) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Active {activeCount}</span>
                    <span>Inactive {inactiveCount}</span>
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">24h Login Trend</p>
                  <div className="overflow-x-auto pb-1">
                    <div className="grid h-24 min-w-[420px] grid-cols-12 items-end gap-1">
                      {loginTimeline.slice(-12).map((point) => (
                        <div key={point.label} className="flex min-w-0 flex-col items-center gap-1">
                          <div
                            className="w-full rounded-sm bg-primary/70"
                            style={{ height: `${Math.max((point.count / maxTimelineCount) * 100, 6)}%` }}
                            title={`${point.label}: ${point.count}`}
                          />
                          <span className="text-[10px] text-muted-foreground">{point.label.slice(0, 2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {suspiciousSessions.slice(0, 10).map((session: SecurityInsightsResponse['suspiciousSessions'][0]) => (
                  <div key={session._id} className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                    <p>
                      {session.userId.name} ({session.userId.email})
                    </p>
                    <p className="text-muted-foreground">
                      {session.deviceInfo.deviceName} • {session.deviceInfo.platform}
                    </p>
                    <p className="text-muted-foreground">
                      IP {session.securityInfo.ipAddress || 'N/A'} • {formatDate(session.createdAt)}
                    </p>
                  </div>
                ))}
                {!suspiciousSessions.length ? (
                  <p className="text-sm text-muted-foreground">No suspicious sessions found.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </section>

        {(hasDashboardError || actionError || isLoadingDashboard) && (
          <div
            className={cn(
              'fixed bottom-4 left-4 right-4 rounded-lg border bg-card px-3 py-2 text-sm shadow sm:left-auto sm:right-4',
              hasDashboardError || actionError ? 'border-destructive/50 text-destructive' : 'text-muted-foreground'
            )}
          >
            {hasDashboardError ? 'Failed to load some dashboard data.' : null}
            {actionError ? actionError : null}
            {isLoadingDashboard ? 'Syncing latest data...' : null}
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
