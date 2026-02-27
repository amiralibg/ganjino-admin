# Ganjino Admin Dashboard

Web-based operations console for Ganjino (گنجینو). This project provides admin and super admin access to user management, platform health visibility, and security-focused account actions through a React and Vite interface.

## Highlights

- Admin sign-in using the shared backend authentication flow
- Role-aware permissions for `admin` and `super_admin`
- Dashboard statistics for users, goals, and sessions
- Filterable and paginated user management table
- User detail panel with activity and session context
- Security insights view for suspicious sessions and recent login activity
- Theme toggle with persisted light and dark mode support

## Tech Stack

- React 19
- TypeScript
- Vite
- TanStack Query
- Axios
- Tailwind CSS 4
- Lightweight reusable UI primitives under `src/components/ui`

## Project Structure

```text
.
├── src/
│   ├── components/
│   │   ├── ui/          # Shared UI building blocks
│   │   └── theme-toggle.tsx
│   ├── lib/             # API client, types, and utilities
│   ├── App.tsx          # Main dashboard application
│   ├── main.tsx         # React bootstrap
│   └── globals.css      # Global styles
├── .env.example
├── package.json
├── vite.config.ts
└── README.md
```

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- A running instance of the Ganjino backend API
- An account with `admin` or `super_admin` role in the backend

## Getting Started

1. Install dependencies:

```bash
npm install
```

If you prefer pnpm, a lockfile is included and `pnpm install` will also work.

2. Create a local environment file:

```bash
cp .env.example .env
```

3. Set the backend API base URL:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

4. Start the dev server:

```bash
npm run dev
```

By default, Vite will print the local URL in the terminal after startup.

## Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
```

## Permission Model

- `super_admin`: can manage user status and role changes
- `admin`: can access dashboards and read operational data, but cannot perform privileged user mutations

The UI enforces this in the client, and the backend should still be treated as the source of truth for authorization.

## Backend Dependencies

This project expects the backend API to provide:

- Auth endpoints for sign-in, token refresh, and current user lookup
- Admin stats endpoints
- Filterable user listing endpoints
- User detail and security insight endpoints
- User activation and role management endpoints for privileged accounts

Update `VITE_API_BASE_URL` if the API is hosted anywhere other than local development defaults.

## Development Notes

- The main application state and views are currently composed in `src/App.tsx`.
- Shared request helpers and token storage live in `src/lib/api.ts`.
- Shared data contracts are defined in `src/lib/types.ts`.

## Related Projects

- Backend API: [github.com/amiralibg/ganjino-backend](https://github.com/amiralibg/ganjino-backend)
- Mobile app: [github.com/amiralibg/ganjino-app](https://github.com/amiralibg/ganjino-app)

## Contributing

Useful contributions usually include:

- Clear notes about affected admin workflows
- Screenshots for dashboard UI changes
- Confirmation that backend endpoint changes are coordinated
- Passing `build` and `typecheck` results

## License

No license file is currently included in this repository. Add one before publishing the project as open source.
