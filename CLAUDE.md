# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

CleanBridge GH is a waste-collection app for Ghana with three roles: customer (household), collector (driver / aboboyaa rider) and admin (operations). This repo is the **frontend only**: a single-package pnpm workspace with the app in `artifacts/cleanbridge-gh/`. The API lives in the separate FullBackendd repo (`Desktop/VS Projects/FullBackendd-master/FullBackendd-master`, Express + MongoDB, `node app.js` on port 7004), namespaced under `/api/v1/cleanbridge/*`. That repo's `CLAUDE.md` has a CleanBridge section with the server-side rules: pricing, the status machine, payouts and Google sign-in.

## Commands

pnpm is required (a `preinstall` hook rejects npm and yarn). Node 24.

- `pnpm run dev`: Vite on http://localhost:5173. `strictPort` is on, so a stale Vite process holding 5173 makes startup fail.
- `pnpm run build` / `pnpm run serve`: production build to `artifacts/cleanbridge-gh/dist/`, and a preview of it.
- `VITE_API_URL` sets the backend origin (default `http://localhost:7004`).

There is no test runner, linter or typecheck. The source is plain JavaScript (`.jsx`/`.js`) on purpose; don't add TypeScript. Verify changes by running both servers and using the app.

`pnpm-workspace.yaml` sets `minimumReleaseAge: 1440` (pnpm refuses package versions published less than a day ago) and pins versions in `catalog:`. esbuild's install script is approved via `allowBuilds`; pnpm 11 refuses to run scripts until it is.

## Architecture (`artifacts/cleanbridge-gh/src`)

- `App.jsx`: providers (theme → toast → auth → wouter `Router`) and the route table. `PRIVATE_ROUTES` lists `[path, Page, roles]`, and every private page is lazy-loaded and wrapped in `<Protected roles>`. To add a page: add it here **and** add a nav entry in `components/Shell.jsx` `NAV[role]`.
- `lib/api.js`: `api.get/post/put/patch/del` against `${VITE_API_URL}/api/v1/cleanbridge`. The JWT lives in `localStorage['cleanbridge-token']`, and a 401 on an authenticated request logs the user out, **so the backend must return 400 (not 401) for ordinary validation failures**. Errors are thrown as `ApiError` with a user-readable `.message`. `googleSignInUrl(role)` starts Google OAuth through the backend's shared `/api/v1/auth/google?app=cleanbridge` route, which redirects back to `/auth/callback?token=`.
- `lib/auth.jsx`: `useAuth()` returns `{ user, login, signup, logout, acceptToken, setUser }`. `Protected` sends signed-out users to `/login?next=`, and users without a phone number (fresh Google sign-ups, `user.profileComplete === false`) to `/profile?complete=1`. `Profile` decides from `profileComplete` alone (never the URL) and goes to the dashboard once the phone is saved.
- `lib/hooks.js`: `useApi(path, { refreshMs })` returns `{ data, error, loading, reload, setData }` (pass `null` to skip; `reload({ quiet: true })` refetches without a spinner). Also `getCurrentPosition`, `useDebounced` and `useAction`. Render its result with `<Async state={...}>{(data) => …}</Async>` from `components/ui.jsx`.
- `lib/ghana.js` mirrors the backend's `utils/ghana.js`: waste types, time windows, regions, vehicle types, phone normalisation and MoMo network detection (MTN / Telecel / AirtelTigo), and GhanaPost GPS and DVLA plate regexes. Keep the two in sync.
- `lib/format.js`: `cedi()`, dates in `Africa/Accra` time, and status labels and badge tones.
- Maps (free, no API keys; Google Maps is not used because it needs a billing account):
  - `components/MapView.jsx`: Leaflet with OpenStreetMap tiles (dark mode is a CSS filter) or Esri satellite (`LayerToggle`), custom `divIcon` pins by `kind`. `ScrollGuard`: plain wheel scrolls the page (Ctrl+wheel zooms), touch-drag only after tapping the map. CARTO tiles need a key, so don't switch back to them.
  - `components/LocationPicker.jsx`: search-as-you-type via the backend's `/geo/search` (OpenStreetMap merged with ~28k Ghanaian businesses from Overture Maps; results carry `category`, `phone`, `website`), auto-locate with `getBestPosition` (best GPS fix within ~10 s, accuracy circle). Taps never move the pin: "Adjust pin" keeps a centre pin while the map moves, then `/geo/reverse` names the spot.
  - `components/PlacePreview.jsx`: card under the picker with an Esri satellite snapshot and nearby Wikimedia Commons photos (`/geo/photos`), plus phone/website. Keep its credit line (Esri, Wikimedia, OpenStreetMap, Overture) - the licences require it.
- The server computes prices from the pickup location (distance to the nearest hub). The frontend only displays `/pickups/quote` and never sends a price.
- Collectors share live GPS every 30 s from `Shell` while not `off_duty`, and customers see it on the pickup page.
- Live updates: `lib/live.js` keeps one Server-Sent Events stream (`/events?token=`) and fires a `cb:live` window event; `useApi(path, { live: true })` refetches on it. `Shell` shows a toast, plays a chime for new jobs and raises a system notification when the tab is hidden.
- `Shell`: the logo goes to the homepage (`/`); admins get an "Admin" badge in the top bar (`RoleBadge`).
- Password reset: `pages/PasswordReset.jsx` (`/forgot-password`, `/reset-password?token=&email=`) using the backend's shared reset flow; the emailed link comes back to this app because the request sends `redirect_uri`.
- Installable app: `public/manifest.webmanifest`, `public/sw.js` (network-first pages, cache-first hashed assets, never the API), `/download` serves the Android APK from `public/downloads/`; `public/.well-known/assetlinks.json` ties it to the `com.cleanbridgegh.app` package.
- Styling: tokens in `index.css` (`:root` / `:root[data-theme='dark']`); component classes for the live app in `app.css`. Use existing classes and `hsl(var(--token))`, not hard-coded colours. Keep adding `data-testid` to interactive elements.

## Device notifications (Web Push)

- `public/sw.js` has a `push` handler; bump `VERSION` whenever you change it.
- `src/lib/push.js` subscribes through FullBackendd `/api/v1/push/cleanbridge/*`, which uses the CleanBridge JWT. It also sets `localStorage['cleanbridge-push-on']`. While that flag is set, `live.js` `showSystemNotification` does nothing, so a device doesn't get alerted twice.
- `components/PushToggle.jsx` is the "Phone notifications" panel on Profile.
- `lib/auth.jsx` relinks the device after `/auth/me`.
- Every backend `notify()` is also pushed.
