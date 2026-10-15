# TCG Stats frontend

Vue 3 frontend for recording TCG matches and understanding player performance.

## API configuration

Copy `.env.example` to `.env` before starting the dev server:

```powershell
Copy-Item .env.example .env
npm run dev
```

`VITE_API_BASE_URL` selects the API base URL used by the browser. Keep `/api`
when using the local Vite proxy, or set the full API URL for a deployment.
`VITE_API_PROXY_TARGET` configures where that local proxy forwards `/api`
requests. Restart Vite after changing environment values. Frontend variables
prefixed with `VITE_` are bundled into browser code, so never put secrets in
this `.env`.

Auth requests send browser cookies with `credentials: 'include'`. The frontend expects:

- `POST /users` to create an account.
- `POST /users/login` to establish an HttpOnly session cookie.
- `GET /users/me` to return `{ "uuid": "...", "name": "...", "email": "..." }` using the session cookie.
- `POST /users/refresh` to renew the session cookie.
- `POST /users/logout` to invalidate the session and clear its cookies.

The frontend only attempts to restore a session on startup after a successful login was recorded in local storage. It then loads `/users/me` and calls `/users/refresh` only if `/users/me` returns `401`. The marker stores no credentials; access and refresh tokens remain in HttpOnly cookies. For cross-origin deployments, configure CORS to allow the frontend origin with credentials and set cookie attributes appropriate for that deployment.

## Languages

The interface supports Portuguese, Spanish, and English. It detects the browser language on first visit and remembers a manually selected language in local storage.

## Frontend structure

- `src/components/` contains the page sections, navigation, dashboard illustration, and authentication dialog.
- `src/composables/` contains reusable Vue state and behavior for authentication and locale selection.
- `src/services/` contains the API integration for signup, login, session refresh, logout, and the current user.
- `src/types/` contains shared auth and locale types; translated copy lives in `src/locales/`.
- `src/styles/` separates foundation, navigation, landing sections, auth dialog, and responsive rules. `src/style.css` imports those modules.
