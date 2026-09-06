# Dev setup — what changed from the original repo

Two kinds of changes: **code changes** (committed, affect everyone) and **local machine
setup** (not in git, needed on this Mac only — note them if setting up a new machine).

## Code changes (in the repo, on `main`)

### 1. `utils/MMKVConfig.ts` — replaced `react-native-mmkv`
`react-native-mmkv` uses Nitro native modules, which **Expo Go cannot run at all** — hard
platform limitation, not fixable by config. Swapped it for a shim backed by
`@react-native-async-storage/async-storage` (already a dependency): a synchronous
in-memory `Map` hydrated once from AsyncStorage at startup. Same `getBoolean`/`set` API,
so no call site had to change its logic — only its timing.

**Why it matters going forward:** the shim is async under the hood. A value written by
`storage.set()` is available synchronously right after (cache-first), but a value that
was persisted on a previous run isn't available until the exported `ready` promise
resolves. Any new code reading a flag before first paint must `await ready` first (see
below) or it'll silently get `undefined` and fall back to a default.

If you later build a real dev client (not Expo Go) for testing, `react-native-mmkv`
would work fine there — this shim is specifically an Expo-Go compromise. Revert to MMKV
if Expo Go support stops mattering.

### 2. `hooks/useTheme.tsx`, `app/_layout.tsx` — wired up `ready`
Three read sites depended on MMKV's synchronous storage:
- `useTheme` — dark mode flag, read in a `useState` initializer (no chance to await
  anything there, so it now defaults to `false` and corrects itself in a `useEffect`
  once `ready` resolves — one-frame flash on cold start, not a bug).
- `app/_layout.tsx` — first-open flag and permissions-modal-seen flag, both already read
  inside `useEffect`, just wrapped the existing logic in `ready.then(...)`.

### 3. Backend security fixes (`backend/src/routes/`)
Found by an automated security review while setting up the local backend, unrelated to
the Expo Go work but fixed in the same pass since they're small and clearly broken:

- **`auth.js`** — `POST /signup` hashed the password then never saved the hash to the
  `users` row. Login (`POST /signin`) compares against `password_hash`, so this meant
  no account could ever actually log in with its real password. Fixed: hash is now
  persisted on insert.
- **`jobs.js`** — `GET /:id/applicants` had no ownership check: any authenticated user
  could view any job's applicant list (names, resumes, cover letters), not just their
  own job postings. Fixed: 403 if the caller isn't the job's `employer_id`.
- **`messages.js`** — `GET /:roomId` and `POST /` had no room-membership check: any
  authenticated user could read or send messages in any chat room by guessing/knowing
  its `room_id`. Fixed: both now check the `conversation_reads` table (which already
  gets a row per participant when a room is created) before allowing read or write.

## Local machine setup (not committed — needed to actually run this on this Mac)

None of this is a code change; it's what had to be true about *this machine* to get the
app running via `npx expo start --go` in the iOS Simulator.

1. **Xcode + iOS Simulator runtime installed** — the Mac had Xcode but no simulator
   runtime downloaded (`xcodebuild -downloadPlatform iOS`, ~8.5GB) and needed
   `sudo xcodebuild -runFirstLaunch` once to let Xcode discover simulator devices at all.
2. **Postgres running locally** — `brew services start postgresql@16`, created a
   `kabayan` database, ran `backend/src/migrate.js` against it.
3. **`backend/.env`** (gitignored, not in repo) —
   ```
   DATABASE_URL=postgresql://<your-mac-username>@localhost:5432/kabayan
   JWT_SECRET=kabayan-dev-secret
   PORT=4000
   ```
4. **`.env`** at repo root (gitignored) —
   ```
   EXPO_PUBLIC_GOOGLE_MAPS_KEY=<key from app.json's committed value, or your own>
   EXPO_PUBLIC_API_URL=http://<your Mac's LAN IP>:4000
   ```
   Must be the Mac's LAN IP, not `localhost` — the Simulator/phone needs to reach it
   over the network, not just the Mac's own loopback.
5. **A Node 26 + Expo CLI incompatibility**, patched directly in
   `node_modules/expo/node_modules/@expo/cli/build/src/utils/downloadAppAsync.js`
   (removed a `dispatcher: new Agent(...)` option) — Node 26 ships its own internal
   `undici`, and passing it a dispatcher built from the separately-installed `undici`
   npm package (a different, older version) breaks with `invalid onError method`. This
   patch **does not survive `npm install`** since it's inside `node_modules` — if Expo
   Go ever fails to download again with a bare `TypeError: fetch failed`, this is why;
   reapply by deleting the `dispatcher: ...` block from that file, or use an older Node
   (18/20/22) instead.

## Known remaining gaps (not fixed, flagged for later)

- **Physical iPhone can't run this via Expo Go** — your phone's Expo Go app only
  supports the latest SDK (57), this project targets SDK 54, and Expo Go on iOS can't be
  downgraded. Only the Simulator (which installs a matching Expo Go build per-SDK) works
  for now. Fixing this for real means either upgrading the project to SDK 57, or
  building a real dev client for the phone (needs Apple ID sign-in in Xcode for code
  signing — not done here).
- **`react-native-vision-camera`, `react-native-agora`, `@react-native-ml-kit`** aren't
  imported anywhere in the app yet (checked), so they haven't caused an Expo Go crash —
  but they're the same class of native-module problem as MMKV was. The moment any screen
  actually imports one of them, expect the same "NitroModules are not supported in Expo
  Go" crash, and it'll need either a similar workaround or a real dev client.
