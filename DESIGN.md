# Kabayan — Design Document

> Community marketplace + job board for the Philippines.
> Cross-platform (iOS, Android, Web) · Expo / React Native · Express / PostgreSQL · NVIDIA NIM AI

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Mobile App                           │
│  Expo (React Native) · Expo Router · NativeWind             │
│                                                             │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────────┐ │
│  │  Home   │ │  Jobs    │ │ Market  │ │  Kabayan AI       │ │
│  │  Tab    │ │  Tab     │ │  Tab    │ │  Chat Interface   │ │
│  └────┬────┘ └────┬─────┘ └────┬────┘ └────────┬─────────┘ │
│       │           │            │                │           │
│  ┌────┴───────────┴────────────┴────────────────┴──────┐    │
│  │              Unified API Client (utils/api.ts)       │    │
│  │         JWT in SecureStore · fetch-based · typed      │    │
│  └─────────────────────────┬────────────────────────────┘    │
│                            │                                  │
│  ┌─────────────────────────┴────────────────────────────┐    │
│  │           Socket.IO Client (chatRoom)                 │    │
│  └─────────────────────────┬────────────────────────────┘    │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTP REST + WebSocket
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                    Render (Singapore)                        │
│                                                              │
│  ┌──────────────────────────┴──────────────────────────┐     │
│  │              Express.js Server (port 4000)           │     │
│  │  cors · json body parser · Socket.IO · JWT middleware│     │
│  └──┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──┘     │
│     │      │      │      │      │      │      │      │        │
│  ┌──┴┐ ┌───┴──┐ ┌─┴──┐ ┌─┴──┐ ┌─┴──┐ ┌─┴──┐ ┌─┴──┐ ┌┴──┐    │
│  │Auth│ │ Jobs │ │App- │ │Mkt- │ │Msg  │ │Conv │ │Pro-│ │AI │    │
│  │    │ │      │ │lica-│ │place│ │     │ │     │ │file│ │Asst│    │
│  │    │ │      │ │tions│ │     │ │     │ │     │ │    │ │   │    │
│  └────┘ └──────┘ └────┘ └─────┘ └─────┘ └─────┘ └────┘ └───┘    │
│                           │                                       │
│                    ┌──────┴──────┐                                │
│                    │  PostgreSQL  │                                │
│                    │   (pg)      │                                │
│                    └─────────────┘                                │
│                           │                                       │
│                    ┌──────┴──────┐                                │
│                    │   NVIDIA    │                                │
│                    │  NIM API    │                                │
│                    │ (Llama 3.3  │                                │
│                    │  70B)       │                                │
│                    └─────────────┘                                │
└──────────────────────────────────────────────────────────────────┘
```

### Layers

| Layer | Technology | Purpose |
|---|---|---|
| **Presentation** | React Native + NativeWind | Screens, components, animations |
| **Routing** | Expo Router v6 | File-based navigation, deep links |
| **State** | React Context + MMKV | Auth state, theme, ephemeral UI |
| **API** | Custom fetch wrapper | JWT-authenticated REST calls |
| **Realtime** | Socket.IO client | Chat messaging |
| **Server** | Express.js + Socket.IO | REST API + WebSocket server |
| **Database** | PostgreSQL (Render) | Relational persistence |
| **AI** | NVIDIA NIM (Llama 3.3 70B) | Natural-language job/market discovery |

---

## 2. Frontend Architecture

### 2.1 Directory Map

```
app/                          # Expo Router file-based routes
├── _layout.tsx               # Root: Drawer + context providers
├── index.tsx                 # Landing page / redirect
├── (ProtectedRoutes)/        # Auth-gated screens
│   ├── _layout.tsx
│   ├── AuthenticationPage.tsx
│   ├── onBoarding.tsx
│   ├── profile.tsx
│   └── Register.tsx
├── (tabs)/                   # Main tab navigator
│   ├── _layout.tsx           # 5-tab layout
│   ├── home.tsx              # Dashboard
│   ├── jobs.tsx              # Job listings
│   ├── assistant.tsx         # Kabayan AI chat
│   ├── marketPlace.tsx       # Marketplace listings
│   └── message.tsx           # Inbox
├── assistant/live.tsx        # Voice assistant
├── chatRoom/chatRoom.tsx     # Real-time chat screen
├── job/
│   ├── JobView.tsx           # Job detail
│   └── EditJob.tsx           # Job create/edit
├── map/mapView.tsx           # Full-screen map
├── marketPlace/marketPlaceView.tsx  # Listing detail
├── profile/
│   ├── EditProfile.tsx       # Profile editor
│   ├── JobApplicants.tsx     # Employer: view applicants
│   ├── MyApplications.tsx    # Worker: view applications
│   ├── PeopleConnect.tsx     # User directory
│   └── ProfiletView.tsx      # Public profile view
└── search/search.tsx         # Global search

components/                   # Reusable UI
├── Auth/
├── CustomComponents/         # Shared: map, sheets, camera, etc.
├── JobComponents/            # JobCard, JobModal, edit modal
├── MarketPlace/              # MarketModals
├── PermissionModal/
├── ProfileComponents/
└── ProtectRoutesComponents/

context/                      # React contexts
├── AccounContext.tsx
├── DocumentPickerContext.tsx
└── ImagePicker.tsx

hooks/                        # Custom hooks
├── useAccountHooks.tsx
├── useCamera.tsx
├── useFlashMessage.ts
├── useLandingPage.tsx
└── useTheme.tsx

schema/                       # Zod validation schemas
utils/                        # API client, AI, MMKV, geocode
```

### 2.2 Navigation Tree

```
Root (_layout.tsx)
├── Drawer
│   ├── index → Landing page
│   ├── (tabs)
│   │   ├── Home
│   │   ├── Jobs → JobView / EditJob
│   │   ├── Kabayan AI → Live Voice
│   │   ├── Market → MarketPlaceView
│   │   └── Message → ChatRoom
│   └── (ProtectedRoutes)
│       ├── AuthenticationPage
│       ├── onBoarding
│       ├── profile
│       └── Register
├── Search
├── Map
└── Profile sub-routes
```

### 2.3 Theme System

- Custom `useTheme` hook reads from a config object toggled by dark/light mode.
- Persisted via `react-native-mmkv` (`storage.set("darkMode", bool)`).
- All screens use `const { t } = useTheme()` where `t` provides:
  - `t.bgPage`, `t.bgCard`, `t.bgSurface` — background colors
  - `t.text`, `t.textMuted` — text colors
  - `t.border`, `t.icon`, `t.accent`, `t.brand` — UI element colors
  - `t.isDarkMode` — boolean for conditional rendering

### 2.4 Auth State

- Auth token stored in **`expo-secure-store`** (keychain/keystore).
- In-memory token cache avoids redundant SecureStore reads.
- `utils/api.ts` exports `signIn`, `signUp`, `signOut` which auto-manage token + user persistence.
- Every API call injects `Authorization: Bearer <token>` via the `request()` helper.
- No global auth context wrapping — each screen calls `getToken()` / `getStoredUser()` as needed.

---

## 3. Backend Architecture

### 3.1 Route Map

```
POST   /api/auth/signup           Register new user
POST   /api/auth/signin           Login, returns JWT
GET    /api/auth/me               Current user info (auth)

GET    /api/jobs                  List all jobs
GET    /api/jobs/:id              Job detail
POST   /api/jobs                  Create job (auth)
PUT    /api/jobs/:id              Update job (auth, owner)
PATCH  /api/jobs/:id/status       Open/close job (auth, owner)
GET    /api/jobs/:id/applicants   List applicants (auth, owner)
POST   /api/jobs/:id/apply        Apply to job (auth)

GET    /api/applications          My applications (auth)
PATCH  /api/applications/:id/status  Update application status (auth)

GET    /api/marketplace           List listings
POST   /api/marketplace           Create listing (auth)
PUT    /api/marketplace/:id       Update listing (auth, owner)
PATCH  /api/marketplace/:id       Partial update (auth, owner)
DELETE /api/marketplace/:id       Delete listing (auth, owner)
GET    /api/marketplace/:id/reviews       Get reviews
POST   /api/marketplace/:id/reviews       Add review (auth)
POST   /api/marketplace/:id/orders        Place order (auth)

GET    /api/messages/:roomId      Get message history
POST   /api/messages              Send message (auth)

GET    /api/conversations         List user conversations (auth)
POST   /api/conversations/job     Create job-related room
POST   /api/conversations/direct  Create direct message room

GET    /api/profiles/:userId      Get profile
PUT    /api/profiles/:userId      Update profile (auth)
GET    /api/profiles/:userId/drawer  Minimal profile for drawer
POST   /api/profiles/:userId/verify  Submit verification (auth)

GET    /api/people/search         Search users

POST   /api/assistant/query       Kabayan AI query (auth) (NVIDIA NIM)

GET    /api/entities              count entities (jobs + listings)
GET    /api/jobs                  count/map overlays
GET    /api/listings              count/map overlays

GET    /api/health                Health check
```

### 3.2 JWT Auth Flow

```
signUp / signIn
  → bcryptjs hash / compare
  → jwt.sign({ sub: userId }, SECRET, { expiresIn: "30d" })
  → Response: { token, user: { id, email } }
  → Client stores token in SecureStore

authenticate middleware
  → Extract "Bearer xxx" from Authorization header
  → jwt.verify → req.userId = payload.sub
  → 401 on missing / invalid / expired token
```

### 3.3 Socket.IO Events

```
Client → Server:
  join:room(roomId)     Subscribe to room
  leave:room(roomId)    Unsubscribe from room
  message:send(data)    Broadcast new message

Server → Client:
  message:new(data)     New message in subscribed room
```

No authentication on WebSocket connection (relies on API for message persistence auth).

---

## 4. Database Schema

### 4.1 Entity Relationships

```
users (1) ── (1) profiles
users (1) ── (*) jobs [as employer]
jobs (1) ── (*) job_applications
  job_applications (*) ── (1) users [as applicant]

users (1) ── (*) marketplace_listings [as vendor]
marketplace_listings (1) ── (*) vendor_reviews
marketplace_listings (1) ── (*) marketplace_orders

messages (*) ── rooms (logical, no table)
conversation_reads (*) ── users
app_notifications (*) ── users
user_blocks (M:M) ── users
```

### 4.2 Table Summary

| Table | Key Columns | Purpose |
|---|---|---|
| `users` | `id`, `email`, `password_hash` | Auth identities |
| `profiles` | `user_id`, `display_name`, `avatar_url`, `bio`, `location_label`, `job_role`, `market_role`, `id_verification_status` | User details & verification |
| `jobs` | `employer_id`, `title`, `description`, `requirements[]`, `budget_min/max`, `location_label`, `lat/lng`, `is_urgent`, `status` | Job postings |
| `job_applications` | `job_id`, `applicant_id`, `cover_letter`, `expected_rate`, `answers(jsonb)`, `status` | Job applications (unique per job+applicant) |
| `marketplace_listings` | `vendor_id`, `store_name`, `name`, `category`, `price`, `location_label`, `lat/lng`, `is_open` | Store items |
| `vendor_reviews` | `listing_id`, `buyer_id`, `rating(1-5)`, `comment` | Reviews |
| `marketplace_orders` | `listing_id`, `vendor_id`, `buyer_id`, `quantity`, `delivery_mode(pickup/delivery)`, `total_amount`, `status(pending→...)` | Purchase orders |
| `messages` | `room_id`, `sender_id`, `content` | Chat messages |
| `conversation_reads` | `room_id`, `user_id`, `last_read_at` | Read receipts |
| `app_notifications` | `user_id`, `category`, `title`, `body`, `entity_type`, `entity_id` | In-app notifications |
| `user_blocks` | `blocker_id`, `blocked_user_id` | Block list |

---

## 5. Key Data Flows

### 5.1 Job Lifecycle

```
Employer:                  Worker:
  Create Job (POST /api/jobs)
                            View Jobs (GET /api/jobs)
                            Apply (POST /api/jobs/:id/apply)
  View Applicants (GET /api/jobs/:id/applicants)
                            Status update visible
  Close Job (PATCH /api/jobs/:id/status)
  Or start Chat (POST /api/conversations/job)
                            ↔ Real-time messages via Socket.IO
```

### 5.2 Marketplace Order Flow

```
Vendor:                    Buyer:
  Create Listing (POST /api/marketplace)
                            Browse listings (GET /api/marketplace)
                            Place Order (POST /api/marketplace/:id/orders)
  View Orders
  Accept → Prepare → Ready
                            Receive / Pickup → Complete
  Cancel / Reject
```

### 5.3 AI Assistant Flow

```
User types question
  → loadAssistantContext() fetches:
      - GET /api/jobs (all open jobs)
      - GET /api/marketplace (all open listings)
      - GET /api/profiles/:id/drawer (user location)
  → POST /api/assistant/query { message }
      → Server fetches live data from DB
      → Builds system prompt with context
      → Calls NVIDIA NIM (Llama 3.3 70B, temp=0.25, max_tokens=320)
      → Returns { reply, model }
  → Client renders reply in chat UI
  → On NIM failure: local keyword fallback (buildLocalReply)
```

The fallback (`utils/aiAssistant.ts`) performs client-side matching:
- Joins all relevant fields (title, description, location, category)
- Checks if query text is contained in the concatenated fields
- Returns formatted results with Philippine peso formatting
- Supports English, Filipino, and Taglish through NIM (not the local fallback)

### 5.4 Chat Messaging Flow

```
User A opens conversation
  → Client emits join:room(roomId)
  → Loads history via GET /api/messages/:roomId
User A sends message
  → POST /api/messages saves to DB
  → Client emits message:send(data)
  → Server broadcasts message:new to all room members
User B receives message:new in real-time
User A/B leaves → leave:room(roomId)
```

---

## 6. Component Design

### 6.1 Shared Components

| Component | File | Props | Notes |
|---|---|---|---|
| `CustomSearchComponent` | `CustomComponents/CustomSearchComponent.tsx` | `value`, `onSearch`, `placeholder`, `onNavigateToMap` | Reused in Jobs, Market, Search |
| `CustomMapComponents` | `CustomComponents/CustomMapComponents.tsx` | `mode: "preview" | "full"` | Google Maps wrapper |
| `CustomBottomSheet` | `CustomComponents/CustomBottomSheet.tsx` | — | Bottom sheet wrapper |
| `JobCardComponent` | `JobComponents/JobCardComponent.tsx` | N/A | Used inside `LegendList` |
| `CustomCamera` | `CustomComponents/CustomCamera.tsx` | — | Vision Camera wrapper |
| `EntityHeroBanner` | `CustomComponents/EntityHeroBanner.tsx` | — | Hero banners |
| `CustomDrawerContent` | `CustomComponents/CustomDrawerContent.tsx` | Standard drawer props | Drawer menu |
| `AppPermissionsModal` | `PermissionModal/AppPermissionsModal.tsx` | `visible`, `onDone` | Initial permissions |

### 6.2 Pattern: Virtualized List

Jobs and Market tabs use `@legendapp/list` (`LegendList`) for performant scrolling with `estimatedItemSize`. The LegendList is preferred over `@shopify/flash-list` for its simpler API and built-in `RefreshControl` support.

### 6.3 Pattern: Modal Forms

Job and Marketplace creation/editing use modal forms (`JobModal`, `JobEditModal`, `MarketEditModal`, `MarketModal`). These are opened via a floating action button (FAB) in the respective tab.

---

## 7. Security Model

| Concern | Mechanism |
|---|---|
| **Auth tokens** | JWT (HMAC-SHA256), 30-day expiry, stored in SecureStore |
| **Password storage** | bcryptjs hash (no plaintext) |
| **Ownership checks** | Server compares `req.userId` against entity's owner field |
| **Route protection** | `authenticate` middleware on all mutating endpoints |
| **Input validation** | Zod schemas on server; Zod schemas in `schema/` on client |
| **AI API key** | Server-side only (NVIDIA_NIM_API_KEY), never in client bundle |
| **Chat** | No WS-level auth (messages persisted via authenticated REST) |
| **Block system** | `user_blocks` table with unique constraint on `(blocker_id, blocked_user_id)` |

---

## 8. Deployment Architecture

```
┌─────────────────────┐
│    EAS Build        │  iOS/Android builds
│  (expo.dev)         │
└─────────────────────┘
        │
┌─────────────────────┐
│   Render Web        │  Express server + Socket.IO
│  Service (Free)     │
│  Singapore region   │
│  Health: /api/health│
└─────────┬───────────┘
          │
┌─────────┴───────────┐
│  Render PostgreSQL   │  Database
│  (Free, Singapore)   │
└─────────────────────┘
```

### 8.1 Environment Variables

**Client (.env / Expo)**
```
EXPO_PUBLIC_GOOGLE_MAPS_KEY=<key>
EXPO_PUBLIC_API_URL=http://localhost:4000
```

**Server (backend/.env or Render env)**
```
PORT=4000
JWT_SECRET=kabayan-dev-secret        # Change in production
DATABASE_URL=postgres://...
NVIDIA_NIM_API_KEY=<key>
NIM_MODEL=meta/llama-3.3-70b-instruct
```

---

## 9. Design Decisions

| Decision | Rationale |
|---|---|
| **No ORM** — raw SQL via `pg` | Minimal dependencies; the schema is small (10 tables); raw SQL gives full control over queries and indexes |
| **Custom fetch wrapper** instead of axios/tanstack-query | Simple enough for the existing API surface; avoids extra bundle weight; JWT injection is a one-liner |
| **React Context for state** instead of Redux/Zustand | App state is simple (auth, theme, image picker); no complex state interactions |
| **MMKV for persistence** | Faster than AsyncStorage; used for theme preference and permission flags |
| **LegendList over FlashList** | Simpler API, built-in RefreshControl, good enough performance |
| **NVIDIA NIM for AI** | Runs on NVIDIA cloud, no GPU needed on server; Llama 3.3 70B is capable for the constrained task (answering from a known context) |
| **Client-side AI fallback** | Graceful degradation when NIM is down; basic keyword matching keeps the assistant useful offline |
| **No pagination yet** | Acceptable for MVP scale; both jobs and market listings fetch all rows; easy to add LIMIT/OFFSET later |
| **Zod on both client and server** | Shared validation language; server Zod protects the DB, client Zod gives typed form errors via react-hook-form |

---

## 10. Future Considerations

- **Pagination**: Add `LIMIT/OFFSET` or cursor-based pagination on `GET /api/jobs`, `GET /api/marketplace`, `GET /api/messages`
- **Push notifications**: `expo-notifications` is already installed; wire up to `app_notifications` table
- **File uploads**: `resume_uri` and `id_photo_uri` currently expect URLs; add multipart upload endpoint + cloud storage (S3/Supabase)
- **Rate limiting**: Add `express-rate-limit` on auth and assistant endpoints
- **WebSocket auth**: Integrate JWT verification into Socket.IO `connection` event
- **Offline support**: Add MMKV-based request queue for form submissions when offline
- **E2E tests**: Add Detox or Maestro for critical flows (signup → post job → apply → chat)
