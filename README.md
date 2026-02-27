# Ganjino Admin Dashboard

Admin web dashboard for operational visibility and account management.

## Features (MVP)

- Shadcn-style reusable UI component structure under `src/components/ui`
- Light/Dark mode toggle with persisted theme preference
- React Query for all reads/mutations with cache invalidation
- Admin authentication using existing `/api/auth/signin` and token refresh flow
- Dashboard summary cards for users, goals, and active sessions
- User management table with search + pagination
- User actions: activate/deactivate and promote to admin
- User detail panel with active sessions and goal/session stats
- Security insights panel for suspicious sessions and recent login stats
- Role-aware actions:
  - `super_admin`: can promote users and toggle user status
  - `admin`: read-only for sensitive user role/status actions

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Update `VITE_API_BASE_URL` if backend is not on `http://localhost:3000/api`.

4. Run:

```bash
npm run dev
```

## Notes

- This project assumes backend CORS allows the admin app origin.
- This dashboard is intentionally scoped as Phase 3 MVP and should be extended with charts, audit logs, and exports for release hardening.
