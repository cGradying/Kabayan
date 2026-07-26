# Kabayan — UI/UX Improvement Specs

> Audit date: July 25, 2026  
> Stack: Expo / React Native · NativeWind (Tailwind) · Expo Router  
> Target: Android first, iOS parity

---

## 1. Design Audit Summary

The app has a solid foundation — dark/light theming, consistent card radius (`rounded-[24-30px]`), a clear blue brand (`#2563EB`), and a Filipino cultural identity. The issues are structural rather than cosmetic: **inconsistent visual hierarchy**, **missing empty/error states with personality**, **a flat tab bar that undercuts the floating AI button**, and **raw list-of-text cards** that don't use imagery or status color effectively.

The specs below are ordered by impact.

---

## 2. Design Tokens — Standardize First

All improvements depend on one consistent token set. The current `useTheme` returns a mix of Tailwind class strings and raw hex values — unify them.

### 2.1 Proposed Token Map

```ts
// hooks/useTheme.tsx — extended token set
const t = {
  // Backgrounds
  bgPage:    isDark ? 'bg-[#0B1120]' : 'bg-[#F6F8FB]',  // cooler off-white, not pure slate-50
  bgCard:    isDark ? 'bg-[#141C2E]' : 'bg-white',
  bgSurface: isDark ? 'bg-[#1A2540]' : 'bg-[#F1F5F9]',
  bgOverlay: isDark ? 'bg-[#0B1120]/90' : 'bg-white/90', // modals / sheets

  // Text
  text:      isDark ? 'text-[#F0F4FF]' : 'text-[#0F172A]',
  textMuted: isDark ? 'text-[#64748B]' : 'text-[#94A3B8]',
  textSubtle:isDark ? 'text-[#334155]' : 'text-[#CBD5E1]', // captions, timestamps

  // Brand
  brand:     'text-[#2563EB]',
  brandBg:   'bg-[#2563EB]',
  brandSoft: isDark ? 'bg-[#1D3461]' : 'bg-[#EFF6FF]',
  brandBorder: isDark ? 'border-[#1D3461]' : 'border-[#BFDBFE]',

  // Semantic
  success:   'text-[#10B981]',
  successBg: isDark ? 'bg-[#064E3B]' : 'bg-[#ECFDF5]',
  danger:    'text-[#EF4444]',
  dangerBg:  isDark ? 'bg-[#450A0A]' : 'bg-[#FEF2F2]',
  warning:   'text-[#F59E0B]',
  warningBg: isDark ? 'bg-[#451A03]' : 'bg-[#FFFBEB]',

  // Borders
  border:      isDark ? 'border-[#1E293B]' : 'border-[#E2E8F0]',
  borderStrong:isDark ? 'border-[#334155]' : 'border-[#CBD5E1]',

  // Raw hex (for RN style prop, icon colors, etc.)
  iconColor:  isDark ? '#64748B' : '#94A3B8',
  accent:     '#2563EB',
  accentWarm: '#E45C35',  // AI screen uses this — make it official

  // Typography scale (use these as fontSize style props for precision)
  // xs:10  sm:12  base:14  md:16  lg:18  xl:22  2xl:27  3xl:32  4xl:40
}
```

**Why:** Several screens hardcode raw hex that doesn't respond to theme toggling (e.g., `backgroundColor: "#183B4E"` in the AI banner). Moving these into the token set means one toggle changes every surface.

---

## 3. Navigation — Tab Bar & Header

### 3.1 Current Problems

- The floating AI button sits `top: -18` but has no shadow or border that separates it from the white tab bar background — on light mode it looks like it's floating in nothing.
- The tab bar uses `height: 65` with hardcoded `paddingBottom: 10` that ignores actual safe area — can clip on iPhone 14 Pro and some Android notch phones.
- The header is 100px tall but shows only a menu icon and bell — a lot of empty space that could show the current screen title with personality.
- "Message" tab has no unread badge.

### 3.2 Fixes

**Tab bar — add depth to the FAB:**
```tsx
// (tabs)/_layout.tsx
// FAB wrapper — add a white ring + drop shadow
<View
  style={{
    height: 68,
    width: 68,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',  // ring
    padding: 4,
    shadowColor: '#2563EB',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  }}
>
  <View className="flex-1 rounded-[18px] bg-blue-600 items-center justify-center">
    <MaterialCommunityIcons name="robot-excited-outline" color="#FFFFFF" size={28} />
  </View>
</View>
```

**Tab bar height — respect safe area properly:**
```tsx
tabBarStyle: {
  height: 60 + insets.bottom,
  paddingBottom: insets.bottom + 4,
  paddingTop: 6,
  // remove hardcoded marginBottom
}
```

**Header — add screen title:**
```tsx
headerTitle: ({ children }) => (
  <Text style={{ fontSize: 17, fontWeight: '800', color: t.isDarkMode ? '#F0F4FF' : '#0F172A' }}>
    {children}
  </Text>
),
```

**Message tab — unread dot badge:**
```tsx
tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 9, minWidth: 16, height: 16 },
```

---

## 4. Home Screen

### 4.1 Current Problems

- The greeting section ("Magandang umaga 🇵🇭" + "Nearby Opportunities") has no visual anchor — it floats above Quick Actions with no divider or spatial rhythm.
- Quick Action cards use a fixed `w-[48%]` which creates a jagged gap on wider Android tablets and 6.7" phones.
- The Map preview card has a hardcoded `border-slate-200` border that ignores the dark theme border token.
- Latest Jobs cards are visually identical regardless of urgency — both use the same card shape; the urgent flag is a tiny badge that's easy to miss.
- No personalization — the greeting doesn't show the user's name even though the profile API provides `display_name`.

### 4.2 Fixes

**Greeting with user name:**
```tsx
// Fetch minimal profile on mount (already available from /api/profiles/:id/drawer)
<Text className={`text-2xl font-black tracking-tight mt-1 ${t.text}`}>
  {displayName ? `Kumusta, ${displayName.split(' ')[0]}!` : 'Nearby Opportunities'}
</Text>
```

**Quick Actions — responsive 2-column grid:**
```tsx
// Replace fixed w-[48%] with flex-1 inside a row + gap
<View className="flex-row gap-3 mb-3">
  <QuickActionCard ... style={{ flex: 1 }} />
  <QuickActionCard ... style={{ flex: 1 }} />
</View>
<View className="flex-row gap-3">
  <QuickActionCard ... style={{ flex: 1 }} />
  <QuickActionCard ... style={{ flex: 1 }} />
</View>
```

**Urgent job card — add a left accent stripe:**
```tsx
// In job card rendering on home.tsx
{job.is_urgent && (
  <View
    className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-red-500"
  />
)}
```

**Map card — use theme border:**
```tsx
// Replace hardcoded border-slate-200
className={`h-52 rounded-[28px] overflow-hidden border ${t.border}`}
```

**Section header pattern — consistent across home:**
```tsx
// Standardize the accent-bar + title pattern already used but slightly varied
// Always: colored w-1 bar | section title | right action
// Colors:  amber-500 = Quick Actions, blue-600 = Map, emerald-500 = Jobs
// These are already set — just make sure new sections follow the same anatomy
```

---

## 5. Jobs Screen

### 5.1 Current Problems

- The urgency badge (`bg-red-50`) shows every card as a de-facto "urgent" red chip even for `status: "open"` non-urgent jobs because the component always renders the same chip shape with a red background.
- The FAB (post job button) overlaps the last list item — `paddingBottom: 140` is fine but the FAB has no label, reducing discoverability for first-time employers.
- The search bar is placed inside a `pt-5 pb-3` View with no card background — it visually merges with the page background and loses definition in light mode.

### 5.2 Fixes

**Status badge — semantic colors:**
```tsx
const badgeConfig = job.is_urgent
  ? { bg: 'bg-red-50', text: 'text-red-600', label: 'Urgent' }
  : job.status === 'open'
  ? { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Open' }
  : { bg: 'bg-slate-100', text: 'text-slate-500', label: job.status };

<View className={`self-start px-2 py-1 rounded-md mb-2 ${badgeConfig.bg}`}>
  <Text className={`font-black text-[9px] uppercase tracking-widest ${badgeConfig.text}`}>
    {badgeConfig.label}
  </Text>
</View>
```

**FAB — add extended label on first open (or always on tablet):**
```tsx
// Use an extended FAB pattern
<TouchableOpacity
  onPress={() => setShowModal(true)}
  className="absolute bottom-6 right-6 bg-blue-600 flex-row items-center
             px-5 h-14 rounded-full shadow-lg shadow-blue-500/30"
  activeOpacity={0.85}
>
  <MaterialIcons name="add" size={22} color="white" />
  <Text className="text-white font-black text-xs ml-2 uppercase tracking-widest">Post Job</Text>
</TouchableOpacity>
```

**Search bar — give it a surface background:**
```tsx
// Wrap in a card surface so it's distinct from the page
<View className={`px-4 pt-4 pb-3 ${t.bgCard} border-b ${t.border}`}>
  <CustomSearchComponent ... />
</View>
```

---

## 6. Marketplace Screen

### 6.1 Current Problems

- The avatar image that overlaps the hero (`absolute -top-12 left-5`) clips weirdly when there is no hero image because the `bgSurface` fallback block doesn't create the same height as an image — the avatar overlaps the title area.
- Category filter pills use `py-3` which makes them 44px+ tall — too large for a filter bar, pulls the content down.
- The "Tap to view" button inside the card is a dark `bg-slate-900` button that doesn't respond to dark mode — it should use the theme.
- When `image_url` is null the card header defaults to a surface-colored block with a small icon — missed opportunity for a branded placeholder with category color.

### 6.2 Fixes

**Category pills — tighter height:**
```tsx
className={`mr-2 px-4 py-2 rounded-2xl border ...`}  // py-3 → py-2
// Result: ~36px touch target (still accessible) vs 44px+
```

**Branded image placeholder — category-colored:**
```tsx
const CATEGORY_COLORS: Record<string, string> = {
  'Street Food': '#F59E0B',
  'Kakanin':     '#EC4899',
  'Ulam':        '#10B981',
  'Desserts':    '#8B5CF6',
  'Other':       '#64748B',
};
const placeholderColor = CATEGORY_COLORS[vendor.category] ?? '#64748B';

// In the no-image branch:
<View style={{ backgroundColor: placeholderColor + '20' }}
      className="w-full h-full px-5 pb-5 items-start justify-end">
  <View className="w-12 h-12 rounded-2xl items-center justify-center"
        style={{ backgroundColor: placeholderColor + '30' }}>
    <Feather name="shopping-bag" size={20} color={placeholderColor} />
  </View>
  <Text className={`mt-3 text-lg font-black tracking-tight ${t.text}`}>{vendor.store_name}</Text>
  <Text className="mt-1 text-xs font-bold" style={{ color: placeholderColor }}>{vendor.category}</Text>
</View>
```

**Fix overlapping avatar with no-image header:**
```tsx
// The avatar overlap only works when there's a real image giving the card a fixed h-40 top section.
// When using the no-image block, ensure it also has className="h-40".
// Already present — just make sure both branches have explicit h-40.
```

**"Tap to view" button — theme aware:**
```tsx
<TouchableOpacity
  className={`mt-2 px-5 py-3 rounded-2xl ${t.brandBg}`}
  onPress={onPress}
>
  <Text className="text-white font-black text-[10px] uppercase tracking-widest">
    {vendor.is_open ? "View & Order" : "View Item"}
  </Text>
</TouchableOpacity>
```

---

## 7. Kabayan AI Screen

### 7.1 Current Problems

- The hero banner uses raw hex colors (`#183B4E`, `#276176`, `#E45C35`) that are not in the theme token set, making it impossible to adjust with one toggle.
- The decorative circles (`absolute -right-10 -top-16`) can clip on narrow phones (< 360px width).
- When the message list is long, the starters section is hidden and there's no way to get fresh suggestions — no "clear chat" or "new conversation" affordance.
- The input border only turns orange when there's text (`input.trim()`) — the inactive state border is very faint on light mode.
- The loading state ("Kabayan AI is looking into it…") uses an inline activity indicator with no skeleton or typing indicator animation, which feels flat.

### 7.2 Fixes

**Add hero colors to theme tokens:**
```ts
// useTheme.tsx
aiBannerBg:     isDark ? '#183B4E' : '#1a3a50',
aiBannerAccent: '#E45C35',
aiBannerRing:   isDark ? '#276176' : '#276176',
```

**Typing indicator — three animated dots:**
```tsx
function TypingIndicator({ surface, mutedText }: { surface: string; mutedText: string }) {
  // Animate opacity of three dots with staggered Animated.loop
  // Each dot: 8px circle, 200ms stagger, opacity 0.2 → 1 → 0.2
  return (
    <View className="mb-4 flex-row items-center self-start rounded-2xl px-4 py-3.5"
          style={{ backgroundColor: surface, borderWidth: 1, borderColor: '...' }}>
      <Text className="text-xs font-bold mr-2" style={{ color: mutedText }}>Kabayan AI</Text>
      {[0, 1, 2].map(i => <AnimatedDot key={i} delay={i * 200} />)}
    </View>
  );
}
```

**Clear chat button:**
```tsx
// In the header row, next to the refresh button
{messages.length > 0 && (
  <TouchableOpacity
    onPress={() => setMessages([])}
    className="h-11 w-11 items-center justify-center rounded-2xl"
    style={{ backgroundColor: surface, borderWidth: 1, borderColor: '...' }}
    accessibilityLabel="Clear conversation"
  >
    <Feather name="trash-2" size={16} color={mutedText} />
  </TouchableOpacity>
)}
```

**Input — always-visible border:**
```tsx
borderColor: input.trim()
  ? '#E45C35'
  : t.isDarkMode ? '#26334A' : '#D1D5DB',  // was barely-visible #EBDDCF → use gray-300
```

---

## 8. Onboarding Screen

### 8.1 Current Problems

- The image backgrounds load from Unsplash CDN — on slow connections (likely in rural Philippines) they show a black screen for 1–2 seconds. No placeholder or shimmer.
- The auth form appears inside an `ImageBackground` with `bg-black/70` overlay — on slow devices the overlay renders before the image, showing a fully black screen with a form on it (no brand context).
- Dot indicators are `h-1.5` — very thin on Android where subpixel rendering can make them disappear.

### 8.2 Fixes

**Image loading placeholder:**
```tsx
<ImageBackground
  source={{ uri: item.bg }}
  style={{ width }}
  resizeMode="cover"
  defaultSource={require('@/assets/images/splash-icon.png')} // fallback
>
```

**Auth form screen — brand header even without image:**
```tsx
// Add a solid branded header above the form so it never looks like a blank form
<View className="mb-8 items-center">
  <View className="w-16 h-16 bg-blue-600 rounded-[22px] items-center justify-center mb-4 shadow-xl">
    <MaterialCommunityIcons name="handshake" size={30} color="white" />
  </View>
  <Text className="text-blue-400 font-black tracking-[4px] uppercase text-[11px] mb-1">Kabayan</Text>
  <Text className="text-3xl font-black text-white tracking-tight">
    {mode === "signIn" ? "Welcome back 👋" : "Join Kabayan 🇵🇭"}
  </Text>
</View>
```

**Dot indicators — increase height:**
```tsx
className="rounded-full"
style={{
  height: 4,           // was 1.5 → use 4 for visibility
  width: i === activeIndex ? 28 : 8,
  backgroundColor: i === activeIndex ? item.accent : 'rgba(255,255,255,0.35)',
}}
```

---

## 9. Landing Page (CustomLandingPage.tsx)

### 9.1 Current Problems

- The geometric blobs use `opacity-10` — nearly invisible on most phone screens with medium brightness; they're decorative but provide zero visual payoff.
- The "Made with ❤️ for Filipinos" text uses `text-slate-600` on a `bg-[#0D1B2A]` background — that's very low contrast (WCAG fail at ~2.1:1).
- Feature check icons (`Feather name="check"`) are `#10B981` green on a dark navy background — fine, but they're at the end of the row which means users have to read the entire label before reaching the confirmation. Move them to the left.

### 9.2 Fixes

**Blobs — increase opacity and add blur effect:**
```tsx
// Increase opacity-10 to opacity-20, and add a second smaller accent blob
<View className="absolute top-1/3 left-8 w-48 h-48 rounded-full opacity-20 bg-blue-400"
      style={{ transform: [{ scale: 1.2 }] }} />
```

**Footer text — increase contrast:**
```tsx
// text-slate-600 → text-slate-500 on #0D1B2A: still low. Use text-slate-400.
<Text className="text-slate-400 text-[10px] font-bold uppercase tracking-[3px]">
  Made with ❤️ for Filipinos
</Text>
```

**Feature list — check on the left:**
```tsx
{FEATURES.map((f) => (
  <View key={f.label} className="flex-row items-center">
    <View className="w-5 h-5 rounded-full bg-emerald-500/20 items-center justify-center mr-3">
      <Feather name="check" size={12} color="#10B981" />
    </View>
    <View className="w-8 h-8 bg-blue-600/20 rounded-xl items-center justify-center mr-3">
      <MaterialCommunityIcons name={f.icon} size={16} color="#60A5FA" />
    </View>
    <Text className="text-slate-300 font-semibold text-sm">{f.label}</Text>
  </View>
))}
```

---

## 10. Empty States — Give Them Character

Every screen currently uses a minimal empty state (icon + 1 line of text). These are fine functionally but miss an opportunity to reinforce the community brand.

### Pattern to adopt:

```tsx
function EmptyState({
  icon,
  title,
  subtitle,
  cta,
  onCta,
  t,
}: {
  icon: string;
  title: string;
  subtitle: string;
  cta?: string;
  onCta?: () => void;
  t: any;
}) {
  return (
    <View className={`mx-4 p-8 rounded-[28px] border ${t.border} ${t.bgCard} items-center`}>
      {/* Illustrated icon circle */}
      <View className={`w-20 h-20 rounded-[28px] ${t.brandSoft} items-center justify-center mb-4`}>
        <Ionicons name={icon as any} size={36} color="#2563EB" />
      </View>
      <Text className={`text-lg font-black text-center ${t.text}`}>{title}</Text>
      <Text className={`mt-2 text-sm text-center leading-5 ${t.textMuted}`}>{subtitle}</Text>
      {cta && onCta && (
        <TouchableOpacity
          onPress={onCta}
          className="mt-5 px-6 py-3 rounded-2xl bg-blue-600"
        >
          <Text className="text-white font-black text-xs uppercase tracking-widest">{cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

**Usage map:**

| Screen | Title | Subtitle | CTA |
|---|---|---|---|
| Jobs (no jobs) | "No open jobs yet" | "Check back soon, or be the first to post one." | "Post a Job" |
| Jobs (no search results) | "No matches found" | "Try a different title or location." | — |
| Marketplace (empty) | "No stores nearby" | "Be the first to list your products in this area." | "Add a Listing" |
| Home latest jobs | "Walang trabaho pa" | "Check back soon or post your own." | "Post a Job" |
| Messages (no conversations) | "No conversations yet" | "Apply to a job or message a vendor to start." | — |

---

## 11. Typography — Establish a Consistent Scale

The app mixes `text-[9px]` through `text-4xl` with no clear system. This causes visual noise where labels, metadata, and titles compete for attention.

### Recommended scale:

| Role | Size | Weight | Usage |
|---|---|---|---|
| `caption` | 10px | 700 (bold) | Timestamps, UPPERCASE labels |
| `label` | 11px | 800 (extrabold) | Status badges, tab bar |
| `body-sm` | 13px | 600 | Descriptions, subtitles |
| `body` | 15px | 400–600 | Message text, form text |
| `subhead` | 16px | 800 | Card titles (jobs, vendors) |
| `title` | 20–22px | 900 | Screen section headings |
| `hero` | 27–32px | 900 | Screen-level hero titles |
| `display` | 38–42px | 900 | Landing/onboarding hero |

The existing code is close to this — the main gap is `text-[9px]` labels (`UPPERCASE tracking-widest`) which are too small on budget Android screens. Bump to `text-[10px]` minimum across all status badges and metadata.

---

## 12. Micro-Interactions & Feedback

These are small but high-impact for perceived quality.

### 12.1 Button press feedback

All `TouchableOpacity` with `activeOpacity={0.85}` should add a subtle scale transform:
```tsx
// Custom PressableCard wrapper
<Pressable
  onPress={onPress}
  style={({ pressed }) => [
    pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }
  ]}
>
```

### 12.2 Skeleton loading (high priority)

Replace raw `<ActivityIndicator />` list loaders with skeleton cards that mirror the real card shape. This dramatically reduces perceived load time.

```tsx
function JobCardSkeleton({ t }: { t: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  return (
    <Animated.View style={{ opacity }} className={`p-5 rounded-[24px] mb-4 ${t.bgCard} border ${t.border}`}>
      <View className={`h-4 w-24 rounded-full ${t.bgSurface} mb-3`} />
      <View className={`h-5 w-48 rounded-full ${t.bgSurface} mb-2`} />
      <View className={`h-3 w-32 rounded-full ${t.bgSurface}`} />
    </Animated.View>
  );
}
```
Show 3 skeletons while `loading === true`.

### 12.3 Pull-to-refresh feedback

The current `RefreshControl` uses no `tintColor` or `colors`, so it shows a gray spinner that doesn't match the brand. Fix:
```tsx
<RefreshControl
  refreshing={loading}
  onRefresh={loadJobs}
  tintColor="#2563EB"       // iOS
  colors={["#2563EB"]}      // Android
/>
```

---

## 13. Accessibility

| Issue | Screen | Fix |
|---|---|---|
| No `accessibilityLabel` on icon-only buttons (menu, bell, map pin) | Tab header | Add descriptive labels |
| Job card `Pressable` has no `accessibilityRole` | Home, Jobs | Add `accessibilityRole="button"` |
| Color-only status indicators (open/closed pill) | Marketplace | Add text label to pill, not just color |
| `text-[9px]` / `text-[10px]` renders at ~10sp — below WCAG minimum for body text | All | Bump to 12px minimum for all non-decorative text |
| Missing `accessibilityHint` on send button in AI chat | Assistant | `accessibilityHint="Sends your message to Kabayan AI"` |

---

## 14. Priority Order for Implementation

| Priority | Item | Effort | Impact |
|---|---|---|---|
| 🔴 P0 | Skeleton loaders (Jobs, Market, Home) | Medium | High — first impression |
| 🔴 P0 | Status badge semantic colors (Jobs) | Low | High — clarity |
| 🟠 P1 | Empty states with EmptyState component | Medium | High — retention |
| 🟠 P1 | Pull-to-refresh brand color | Low | Medium |
| 🟠 P1 | FAB — labeled "Post Job" button | Low | Medium |
| 🟠 P1 | Tab bar safe area + FAB shadow ring | Low | Medium |
| 🟡 P2 | Theme token consolidation | Medium | High long-term |
| 🟡 P2 | Typing indicator in AI chat | Low | Medium |
| 🟡 P2 | Clear chat button in AI | Low | Low |
| 🟡 P2 | Marketplace category placeholder colors | Low | Medium |
| 🟢 P3 | Landing page contrast & blob visibility | Low | Low |
| 🟢 P3 | Onboarding dot height & image fallback | Low | Low |
| 🟢 P3 | Home — greeting with user name | Medium | Medium |
| 🟢 P3 | Press scale micro-interactions | Medium | Medium |
| 🟢 P3 | Accessibility labels across all screens | Medium | High (compliance) |

---

## 15. What NOT to Change

- The floating AI tab button concept — it differentiates the app and the bone structure is right. Just polish the shadow.
- The card radius language (`rounded-[24-30px]`) — it's distinctive and consistent. Keep it.
- The Filipino greeting in Home — culturally resonant, keep it and extend it with the user's name.
- The Assistant screen's warm orange brand (`#E45C35`) — it correctly differentiates AI from the blue product brand. Keep the dual-brand approach.
- The NativeWind (Tailwind) approach — avoid switching to StyleSheet-only. The class-based system works well with the theme token pattern.

---

## 16. Drawer (CustomDrawerContent.tsx)

### 16.1 Current Problems

**Profile header:**
- The header background is a flat `bg-slate-50` with a `border-b border-slate-100` — in light mode this looks like a slightly off-white block with no visual hierarchy. There's no way to distinguish it from the rest of the drawer at a glance.
- The avatar uses `rounded-[22px]` (square-ish) — this diverges from every other avatar in the app (profile views, chat rooms) which tend to be fully circular. Pick one and be consistent.
- Verification status (`id_verification_status`) is fetched in the profile data but never displayed anywhere in the drawer — a verified badge next to the user's name would reinforce trust.
- The email shows as raw `text-sm font-medium text-slate-500` directly under the name — this is fine but on long emails it can overflow into the avatar area with no truncation.
- When the user is a guest (`currentUserId === null`), the header shows "Guest User" with no email and no visual affordance to sign in — the header is clickable only for logged-in users, but guests see nothing actionable above the fold.

**Drawer items:**
- The item icon backgrounds are hardcoded `bg-slate-50` — these don't change in dark mode because the entire drawer background is `bg-white` (also hardcoded, ignores dark theme entirely).
- The active state is `bg-blue-50` which only exists in light mode — dark mode would need `bg-blue-500/10`.
- The badge counts inside labels (`Job Applicants (${applicantCount})`) are embedded in the text string. This means the number and the label are the same visual weight — counts should be a separate pill.
- There is only one section ("Manage") — there's no way to reach primary navigation (Home, Jobs, Market, AI, Messages) from the drawer without closing it and tapping the tab bar.
- The "Sign Out" item uses `color="#EF4444"` for the icon but the label text is still the default dark color (`text-slate-700`) — they should both be red to signal a destructive action.
- No dark mode support: the entire component is hardcoded `bg-white`, `bg-slate-50`, `bg-slate-100`, `text-slate-900` etc. with no theme-aware classes.

### 16.2 Fixes

**Add dark mode support — wrap in `useTheme`:**
```tsx
// Top of CustomDrawerContent
const { t } = useTheme();

// Root view
<View style={{ flex: 1, backgroundColor: t.isDarkMode ? '#0B1120' : '#FFFFFF' }}>

// Header background
style={{ backgroundColor: t.isDarkMode ? '#141C2E' : '#F8FAFC', borderBottomColor: t.isDarkMode ? '#1E293B' : '#F1F5F9' }}

// DrawerItem active background
className={`flex-row items-center rounded-[20px] px-4 py-3.5 ${
  isActive
    ? t.isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'
    : t.isDarkMode ? 'active:bg-slate-800' : 'active:bg-slate-100'
}`}

// Icon container
style={{ backgroundColor: t.isDarkMode ? '#1A2540' : '#F1F5F9' }}

// Item label
className={`text-[14px] ${
  isActive
    ? 'text-blue-500 font-black'
    : t.isDarkMode ? 'text-slate-300 font-semibold' : 'text-slate-700 font-semibold'
}`}

// Section title
className={`mb-2 px-3 text-[10px] font-black uppercase tracking-[2px] ${t.textMuted}`}

// Footer border
style={{ borderTopColor: t.isDarkMode ? '#1E293B' : '#F1F5F9' }}
```

**Profile header — add gradient + verified badge:**
```tsx
// Replace flat bg-slate-50 with a subtle two-tone header
<LinearGradient
  colors={t.isDarkMode ? ['#141C2E', '#0B1120'] : ['#EFF6FF', '#F8FAFC']}
  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
  style={{ paddingTop: inset.top + 18, paddingHorizontal: 20, paddingBottom: 28 }}
>
  ...header content...
</LinearGradient>

// If expo-linear-gradient is not installed, fake it with two overlapping Views:
<View style={{ backgroundColor: t.isDarkMode ? '#141C2E' : '#EFF6FF' }}>
  <View style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120,
                 borderRadius: 60, backgroundColor: t.isDarkMode ? '#1D3461' : '#BFDBFE',
                 opacity: 0.4 }} />
  ...header content...
</View>
```

**Avatar — circular with ring:**
```tsx
// Unify to fully circular avatars
<Image
  source={{ uri: profile.avatar_url }}
  className="w-16 h-16 rounded-full"
  style={{ borderWidth: 2, borderColor: t.isDarkMode ? '#1D3461' : '#BFDBFE' }}
/>
// Fallback initials circle
<View className="w-16 h-16 rounded-full bg-blue-600 items-center justify-center"
      style={{ borderWidth: 2, borderColor: t.isDarkMode ? '#1D3461' : '#BFDBFE' }}>
  <Text className="text-white text-lg font-black">{initials}</Text>
</View>
```

**Verified badge next to name:**
```tsx
<View className="flex-row items-center mt-0.5">
  <Text className={`text-xl font-black tracking-tight ${t.text}`} numberOfLines={1}>
    {profile?.display_name?.trim() || "Guest User"}
  </Text>
  {profile?.id_verification_status === 'verified' && (
    <View className="ml-2 bg-emerald-500 rounded-full p-0.5">
      <MaterialCommunityIcons name="check" size={10} color="white" />
    </View>
  )}
</View>
```

**Email — truncate with numberOfLines:**
```tsx
<Text className={`mt-1 text-sm font-medium ${t.textMuted}`} numberOfLines={1}>
  {email ?? 'Not signed in'}
</Text>
```

**Guest header — add a sign-in prompt:**
```tsx
// When !currentUserId, replace the tap-disabled header with an active CTA
{!currentUserId ? (
  <TouchableOpacity
    onPress={() => closeAndNavigate('/AuthenticationPage')}
    className="flex-row items-center"
  >
    <View className="w-16 h-16 rounded-full bg-slate-200 items-center justify-center">
      <MaterialCommunityIcons name="account-outline" size={28} color="#94A3B8" />
    </View>
    <View className="ml-4 flex-1">
      <Text className={`text-lg font-black ${t.text}`}>Guest User</Text>
      <View className="mt-1 flex-row items-center">
        <Text className="text-blue-500 text-sm font-bold">Sign in to your account</Text>
        <MaterialCommunityIcons name="arrow-right" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />
      </View>
    </View>
  </TouchableOpacity>
) : (
  // existing logged-in header
)}
```

**Badge counts — separate pill:**
```tsx
// Replace the text-embedded count with a badge View
const DrawerItem = ({ icon, label, href, activeMatch, onPress, color, badge }: DrawerItemConfig & { badge?: number }) => {
  return (
    <Pressable ...>
      <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: iconBg }}>
        <MaterialCommunityIcons name={icon} size={20} color={isActive ? '#2563EB' : color} />
      </View>
      <View className="ml-3 flex-1">
        <Text className={`text-[14px] ...`}>{label}</Text>
      </View>
      {badge !== undefined && badge > 0 && (
        <View className="bg-blue-600 rounded-full min-w-[20px] h-5 px-1.5 items-center justify-center">
          <Text className="text-white text-[10px] font-black">{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </Pressable>
  );
};

// Pass badge props in sections:
{ icon: 'account-group-outline', label: 'Job Applicants', badge: applicantCount, href: '/profile/JobApplicants' },
{ icon: 'store-edit-outline',    label: 'My Listings',    badge: listingsCount,  href: '/marketPlace/marketPlaceView?scope=mine' },
```

**Add primary navigation section:**
```tsx
// Add a "Navigate" section above "Manage" so users can jump to any tab from the drawer
{
  title: "Navigate",
  items: [
    { icon: "view-grid-outline",         label: "Home",        href: "/(tabs)/home"        },
    { icon: "briefcase-variant-outline", label: "Jobs",        href: "/(tabs)/jobs"        },
    { icon: "shopping-outline",          label: "Marketplace", href: "/(tabs)/marketPlace" },
    { icon: "robot-excited-outline",     label: "Kabayan AI",  href: "/(tabs)/assistant"   },
    { icon: "message-text-outline",      label: "Messages",    href: "/(tabs)/message"     },
  ],
}
```

**Sign Out — consistent red styling:**
```tsx
// Make both icon and label red for destructive clarity
<Pressable onPress={handleSignOut} className="flex-row items-center rounded-[20px] px-4 py-3.5 active:bg-red-50">
  <View className="h-10 w-10 rounded-2xl items-center justify-center bg-red-50">
    <MaterialCommunityIcons name="logout-variant" size={20} color="#EF4444" />
  </View>
  <View className="ml-3 flex-1">
    <Text className="text-[14px] text-red-500 font-semibold">Sign Out</Text>
  </View>
</Pressable>
```

### 16.3 Drawer Width & Animation

The drawer currently uses the Expo Router default drawer width (~80% of screen) and slide animation. Consider:
- Set `drawerStyle={{ width: '78%' }}` in `_layout.tsx` for a tighter feel on large phones.
- Add `overlayColor="rgba(0,0,0,0.45)"` for a proper backdrop dimming effect.
- `drawerType="slide"` (default) is fine — `"front"` would feel more native on Android but changes the interaction model.

```tsx
// app/_layout.tsx — Drawer options
<Drawer
  drawerContent={(props) => <CustomDrawerContent {...props} />}
  screenOptions={{
    headerShown: false,
    drawerStyle: { width: '78%' },
    overlayColor: 'rgba(0,0,0,0.45)',
  }}
>
```

### 16.4 Root Layout — Dark Mode StatusBar

The root `_layout.tsx` hardcodes `<StatusBar barStyle="dark-content" />`. This means on dark mode the status bar text/icons are dark on a dark background — invisible. Fix:

```tsx
// app/_layout.tsx
import { useTheme } from '@/hooks/useTheme';

// Inside RootLayout:
const { t } = useTheme();
<StatusBar barStyle={t.isDarkMode ? 'light-content' : 'dark-content'} />
```

### 16.5 Drawer Design Summary Table

| Element | Current | Improved |
|---|---|---|
| Background | Hardcoded `bg-white` | Theme-aware `bg-[#0B1120]` / `bg-white` |
| Header | Flat `bg-slate-50` | Subtle gradient / accent blob |
| Avatar | `rounded-[22px]` square | `rounded-full` circular with ring |
| Verified badge | Not shown | Emerald checkmark pill next to name |
| Email | No truncation | `numberOfLines={1}` |
| Guest state | Non-interactive "Guest User" | Tappable "Sign in" CTA |
| Item counts | Embedded in label text | Separate blue pill badge |
| Active state | `bg-blue-50` (light only) | Theme-aware active background |
| Icon containers | Hardcoded `bg-slate-50` | Theme-aware icon bg |
| Sign Out | Red icon only | Red icon + red label |
| Navigation | Manage section only | Navigate section + Manage section |
| Drawer width | Default (~80%) | `78%` with `overlayColor` |
| StatusBar | Always `dark-content` | Follows theme |

---

## 17. Modal Forms — JobModal & JobEditModal

### 17.1 Current Problems

**JobModal (Create Job):**
- The modal header text `text-slate-900` and subtitle `text-slate-500` are hardcoded — they don't respond to dark mode. On a dark `t.bgCard` background these become invisible.
- The `Field` component uses hardcoded `border-slate-200 bg-slate-50 text-slate-900 placeholderTextColor="#94A3B8"` — none of these are theme-aware.
- The inline budget row (min + max in a single `Field`) mixes a `TextInput` inside `trailing` — the max input has no label and no border separation from the min field, making it visually unclear.
- The "Tips like Indeed" section uses raw `text-slate-600` on the card background — low contrast in dark mode.
- The submit button color is hardcoded `bg-blue-600` — fine for Jobs (blue brand), but no disabled visual state beyond opacity 0.5; there's no error boundary around the `geocodeAddress` failure path that surfaces to the user.
- The `max-h-[80%]` modal sheet has no handle indicator — users may not know it's scrollable.

**JobEditModal (Edit Job):**
- The `Field` component is a local copy with the same hardcoded light-mode colors — same dark mode issue.
- The "Urgent" toggle uses `border-red-300 bg-red-50` in the active state but `text-red-600` on a potentially dark background — needs `dark:` variants or theme tokens.
- Error text `text-red-600 text-xs` has no wrapping container, so it can push layout unexpectedly on long error messages.
- Both modals use `max-h-[85%]` with no drag handle strip at the top — add a `w-10 h-1 rounded-full bg-slate-300` pill as a visual affordance.

### 17.2 Fixes

**Make `Field` theme-aware (shared fix for both modals):**
```tsx
function Field({ label, value, onChangeText, placeholder, icon, multiline, t }: FieldProps & { t: any }) {
  return (
    <View className="mb-4">
      <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1 ${t.textMuted}`}>
        {label}
      </Text>
      <View className={`flex-row items-center px-4 rounded-2xl border ${t.border} ${t.bgSurface} ${multiline ? "py-3" : "h-14"}`}>
        <Feather name={icon} size={18} color={t.iconColor} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.isDarkMode ? "#475569" : "#94A3B8"}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          className={`flex-1 ml-3 font-semibold ${t.text}`}
          style={multiline ? { minHeight: 80 } : undefined}
        />
      </View>
    </View>
  );
}
```

**Add drag handle to all bottom-sheet modals:**
```tsx
// At the top of the modal inner View, before the header row
<View className="items-center mb-3">
  <View className={`w-10 h-1 rounded-full ${t.isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
</View>
```

**Header text — use theme tokens:**
```tsx
// JobModal header
<Text className={`text-xl font-black ${t.text}`}>Create Job Post</Text>
<Text className={`text-xs ${t.textMuted}`}>List what you need — skills, credentials, and scope.</Text>
```

**Budget inline row — two labeled sub-fields:**
```tsx
// Replace the inline trailing hack with two explicit side-by-side fields
<View className="mb-4">
  <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1 ${t.textMuted}`}>
    Budget Range (PHP)
  </Text>
  <View className="flex-row gap-3">
    <View className={`flex-1 h-14 px-4 rounded-2xl border ${t.border} ${t.bgSurface} flex-row items-center`}>
      <Feather name="dollar-sign" size={16} color={t.iconColor} />
      <TextInput
        value={budgetMin}
        onChangeText={setBudgetMin}
        placeholder="Min"
        keyboardType="numeric"
        placeholderTextColor={t.isDarkMode ? "#475569" : "#94A3B8"}
        className={`flex-1 ml-2 font-semibold ${t.text}`}
      />
    </View>
    <View className={`flex-1 h-14 px-4 rounded-2xl border ${t.border} ${t.bgSurface} flex-row items-center`}>
      <TextInput
        value={budgetMax}
        onChangeText={setBudgetMax}
        placeholder="Max"
        keyboardType="numeric"
        placeholderTextColor={t.isDarkMode ? "#475569" : "#94A3B8"}
        className={`flex-1 font-semibold ${t.text}`}
      />
    </View>
  </View>
</View>
```

**Urgent toggle — dark mode safe:**
```tsx
<TouchableOpacity
  onPress={() => setIsUrgent((prev) => !prev)}
  className={`mb-3 h-12 px-4 rounded-2xl border flex-row items-center justify-between ${
    isUrgent
      ? 'border-red-400 bg-red-500/10'
      : `${t.border} ${t.bgSurface}`
  }`}
>
  <View className="flex-row items-center">
    <Feather name="alert-triangle" size={16} color={isUrgent ? "#EF4444" : t.iconColor} />
    <Text className={`ml-2 text-xs font-black uppercase tracking-widest ${isUrgent ? "text-red-500" : t.textMuted}`}>
      {isUrgent ? "Urgent job enabled" : "Mark as urgent"}
    </Text>
  </View>
  <Ionicons name={isUrgent ? "checkmark-circle" : "ellipse-outline"} size={18} color={isUrgent ? "#EF4444" : t.iconColor} />
</TouchableOpacity>
```

**Error message — contained block:**
```tsx
{error && (
  <View className="mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-400/30">
    <Text className="text-red-500 text-xs font-semibold">{error}</Text>
  </View>
)}
```

### 17.3 Modal Design Summary

| Element | Current | Improved |
|---|---|---|
| Header text | Hardcoded `text-slate-900` | `t.text` / `t.textMuted` |
| Field borders/bg | Hardcoded `border-slate-200 bg-slate-50` | `t.border` / `t.bgSurface` |
| Field text | Hardcoded `text-slate-900` | `t.text` |
| Placeholder color | Hardcoded `#94A3B8` | Theme-aware `#475569` / `#94A3B8` |
| Budget row | Single field with hidden trailing input | Two explicit labeled sub-fields |
| Drag handle | None | `w-10 h-1 rounded-full` pill |
| Urgent toggle | `bg-red-50` (light only) | `bg-red-500/10` (works in both modes) |
| Error display | Inline bare text | Contained `bg-red-500/10` card |

---

## 18. Modal Forms — MarketModal & MarketEditModal

### 18.1 Current Problems

**MarketModal (Create Listing):**
- Same dark mode issue as JobModal — hardcoded `bg-white` on the outer `View` inside `SafeAreaView` overrides `t.bgCard` entirely. The outer `bg-white` needs to be removed.
- The icon container `bg-emerald-100` and submit button `bg-emerald-600` correctly use the marketplace emerald brand — keep these, they differentiate market from jobs.
- Photo picker area uses `border-dashed border-emerald-300 bg-emerald-50` / `border-blue-300 bg-blue-50` — these are light-mode only. In dark mode the dashed borders become invisible.
- Two photo pickers ("store item photo" and "banner") have no labels above them distinguishing their purpose until you read the tap prompt text — needs a label row.
- The "Store Listing Tips" section uses hardcoded `text-slate-500 / text-slate-600` — not theme-aware.
- The `backgroundUri` state is set but never sent to the API — `handleSave` only posts `image_url: image?.uri`. The banner image is silently discarded.

**MarketEditModal (Edit Listing):**
- Image URL is edited as a raw text field (`Field label="Image URL"`) — this is a worse UX than the create modal which has a picker. Should at minimum show a small preview thumbnail when the URL is non-empty.
- The `Field` component has the same hardcoded light-mode colors.
- No urgency or open/close toggle in the edit modal — `is_open` is preserved from the original listing but the vendor can't toggle it here (they'd have to go to the detail view).

### 18.2 Fixes

**Remove hardcoded `bg-white` from MarketModal outer wrapper:**
```tsx
// Before: className={`max-h-[85%] bg-white rounded-t-[32px] p-6 ${t.bgCard}`}
// bg-white and t.bgCard conflict — bg-white always wins. Remove it:
<View className={`max-h-[85%] rounded-t-[32px] p-6 ${t.bgCard}`}>
```

**Photo pickers — dark mode safe + labels:**
```tsx
<Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1 ${t.textMuted}`}>
  Photos
</Text>
<View className="flex-row gap-3 mb-4">
  {/* Item photo */}
  <TouchableOpacity
    onPress={handlePickForeground}
    className={`flex-1 h-36 rounded-2xl border-2 border-dashed items-center justify-center overflow-hidden ${
      t.isDarkMode ? 'border-emerald-700 bg-emerald-900/20' : 'border-emerald-300 bg-emerald-50'
    }`}
  >
    {image?.uri ? (
      <Image source={{ uri: image.uri }} className="w-full h-full rounded-2xl" />
    ) : (
      <View className="items-center px-3">
        <Feather name="image" size={22} color={t.isDarkMode ? '#059669' : '#059669'} />
        <Text className={`text-xs font-semibold mt-1 text-center ${t.isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
          Item Photo
        </Text>
      </View>
    )}
  </TouchableOpacity>

  {/* Banner photo */}
  <TouchableOpacity
    onPress={handlePickBackground}
    className={`flex-1 h-36 rounded-2xl border-2 border-dashed items-center justify-center overflow-hidden ${
      t.isDarkMode ? 'border-blue-700 bg-blue-900/20' : 'border-blue-300 bg-blue-50'
    }`}
  >
    {backgroundUri ? (
      <Image source={{ uri: backgroundUri }} className="w-full h-full rounded-2xl" />
    ) : (
      <View className="items-center px-3">
        <Feather name="layout" size={22} color={t.isDarkMode ? '#2563EB' : '#2563EB'} />
        <Text className={`text-xs font-semibold mt-1 text-center ${t.isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
          Store Banner
        </Text>
      </View>
    )}
  </TouchableOpacity>
</View>
```

**Fix `backgroundUri` being silently discarded:**
```tsx
// In handleSave, include background_url if picked:
await api.post("/api/marketplace", {
  ...
  image_url: image?.uri ?? null,
  background_url: backgroundUri ?? null,  // add to DB schema if not present
});
// Note: requires adding background_url column to marketplace_listings table.
// Until then, at minimum show a warning that the banner is not saved yet.
```

**MarketEditModal — image URL field with preview:**
```tsx
<View className="mb-4">
  <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1 ${t.textMuted}`}>
    Item Image URL
  </Text>
  {imageUrl.trim() !== '' && (
    <Image
      source={{ uri: imageUrl }}
      className="w-full h-36 rounded-2xl mb-2"
      resizeMode="cover"
    />
  )}
  <View className={`flex-row items-center px-4 h-12 rounded-2xl border ${t.border} ${t.bgSurface}`}>
    <Feather name="image" size={16} color={t.iconColor} />
    <TextInput
      value={imageUrl}
      onChangeText={setImageUrl}
      placeholder="https://..."
      placeholderTextColor={t.isDarkMode ? "#475569" : "#94A3B8"}
      autoCapitalize="none"
      keyboardType="url"
      className={`flex-1 ml-2 font-semibold ${t.text}`}
    />
  </View>
</View>
```

**Add is_open toggle to MarketEditModal:**
```tsx
// Add state: const [isOpen, setIsOpen] = useState(true);
// In useEffect: setIsOpen(Boolean(listing.is_open));
// In handleSave: is_open: isOpen

<TouchableOpacity
  onPress={() => setIsOpen((prev) => !prev)}
  className={`mb-3 h-12 px-4 rounded-2xl border flex-row items-center justify-between ${
    isOpen
      ? `border-emerald-400 bg-emerald-500/10`
      : `${t.border} ${t.bgSurface}`
  }`}
>
  <View className="flex-row items-center">
    <Feather name="toggle-right" size={16} color={isOpen ? "#059669" : t.iconColor} />
    <Text className={`ml-2 text-xs font-black uppercase tracking-widest ${isOpen ? "text-emerald-600" : t.textMuted}`}>
      {isOpen ? "Store is Open" : "Store is Closed"}
    </Text>
  </View>
  <Ionicons name={isOpen ? "checkmark-circle" : "ellipse-outline"} size={18} color={isOpen ? "#059669" : t.iconColor} />
</TouchableOpacity>
```

### 18.3 Market Modal Design Summary

| Element | Current | Improved |
|---|---|---|
| Outer bg | `bg-white` overrides `t.bgCard` | Remove `bg-white`, keep `t.bgCard` only |
| Photo pickers | Light-mode dashed border only | Theme-aware dashed border + bg |
| Photo labels | Text inside the tap area | Dedicated label row above |
| Banner image | Picked but silently discarded | Noted as unimplemented; include in API when schema supports it |
| Edit image field | Raw URL text only | URL text + live preview thumbnail |
| is_open toggle | Not editable in edit modal | Emerald toggle added |
| Field colors | Hardcoded light-mode | `t.border` / `t.bgSurface` / `t.text` |

---

## 19. Shared UI Components

### 19.1 CustomBottomSheet

**Current Problems:**
- The component now renders a static info message ("The sign-in and sign-up forms now live in AuthenticationForm…") — it's a placeholder stub. It should either be removed, repurposed, or clearly documented as deprecated.
- `snapPoints = ["65%", "90%"]` is defined but only `index={-1}` is used at open — there is no external trigger that opens it to a specific snap point, so the two snap points are theoretical.
- `backgroundStyle={{ borderRadius: 40 }}` — 40px radius is very aggressive; the rest of the app uses `rounded-[28-32px]` (28–32px). Align to `borderRadius: 30`.
- `handleIndicatorStyle` correctly uses the theme, but the indicator width `45` px is slightly wide — standard is 40px.

**Fixes:**
```tsx
// Align borderRadius with app-wide card language
backgroundStyle={{
  backgroundColor: t.isDarkMode ? "#0F172A" : "#FFFFFF",
  borderRadius: 30,  // was 40
}}
handleIndicatorStyle={{
  backgroundColor: t.isDarkMode ? "#334155" : "#CBD5E1",
  width: 40,  // was 45
}}
```

If the component is not being actively used as an auth sheet, rename it to `LegacyBottomSheet` or remove it and replace any call sites with direct navigation to `AuthenticationPage`.

---

### 19.2 CustomSearchComponent

**Current Problems:**
- The component uses `h-12` (48px) which is correct for touch targets, but the separator `w-[1px] h-6 mx-3 ${t.border}` uses a Tailwind class string for `borderColor` — NativeWind interprets `${t.border}` as a `border-color` class but `w-[1px]` creates a `View`, not a `View` with border. The divider is actually a 1px-wide View with `backgroundColor` — but `t.border` is a border class like `border-[#1E293B]`, not a `bg-` class. **This means the divider is invisible** — it has no `backgroundColor`.
- The map button `FontAwesome5 name="map-marked-alt"` is fine but has no `accessibilityLabel`.
- `selectionColor="#2563EB"` is hardcoded (not critical, but could use `t.accent`).

**Fix the invisible divider:**
```tsx
// Replace the className-based divider with a style-based one
<View
  style={{
    width: 1,
    height: 24,
    marginHorizontal: 12,
    backgroundColor: t.isDarkMode ? '#1E293B' : '#E2E8F0',
  }}
/>
```

**Add accessibility label to map button:**
```tsx
<Pressable
  onPress={onNavigateToMap}
  className="p-1 active:opacity-50"
  accessibilityLabel="View map"
  accessibilityRole="button"
>
  <FontAwesome5 name="map-marked-alt" color={t.accent} size={18} />
</Pressable>
```

---

### 19.3 EntityHeroBanner

**Current Problems:**
- The component accepts `title`, `subtitle`, `eyebrow`, `meta`, `onSecondaryPress`, and `secondaryIcon` props — none of them are rendered. The component only renders the back button and the decorative background. All the text prop forwarding is dead code.
- The `onBack` button uses `bg-white/90` hardcoded — in a dark image context this is fine, but on a light colored theme background (no image) the button merges with the background.
- The `height` prop defaults to `112` — this is very short for a hero banner. Most detail screens set their own height via the prop, but the default should be at least `160`.
- The decorative shapes have no `overflow-hidden` protection — on some Android versions the `rounded-full` shapes can bleed outside the parent `overflow-hidden` container. The parent already has `overflow-hidden` — verify it applies correctly.
- The secondary action slot (`onSecondaryPress`) renders nothing — it's a ghost `h-[42px] w-[42px]` View. Either implement it or remove the prop.

**Fixes:**
```tsx
// Render title/subtitle in the banner when provided
{(title || eyebrow) && (
  <View
    className="absolute bottom-0 left-0 right-0 px-5 pb-4 z-[2]"
    style={{ backgroundColor: imageUri ? 'rgba(15,23,42,0.55)' : 'transparent' }}
  >
    {eyebrow && (
      <Text className="text-[10px] font-black uppercase tracking-[2px] text-white/70 mb-1">
        {eyebrow}
      </Text>
    )}
    {title && (
      <Text className="text-xl font-black tracking-tight" style={{ color: theme.text }}>
        {title}
      </Text>
    )}
    {subtitle && (
      <Text className="text-xs font-semibold mt-0.5" style={{ color: theme.text, opacity: 0.7 }}>
        {subtitle}
      </Text>
    )}
  </View>
)}

// Back button — theme-aware background
<TouchableOpacity
  onPress={onBack}
  className="h-[42px] w-[42px] items-center justify-center rounded-2xl"
  style={{
    backgroundColor: imageUri ? 'rgba(255,255,255,0.9)' : (t.isDarkMode ? '#1A2540' : 'rgba(255,255,255,0.9)')
  }}
>
  <Feather name="chevron-left" size={22} color="#0F172A" />
</TouchableOpacity>

// Default height — increase
height = 160,  // was 112
```

---

### 19.4 CustomModalComponent (Auth Gate Modal)

**Current Problems:**
- The modal uses hardcoded `bg-white rounded-3xl` — no dark mode support.
- "Create an account" `text-xl font-black text-slate-900` and body `text-black` are hardcoded light colors.
- The two buttons ("Create Account" `bg-blue-600` and "Maybe later" `border`) have inconsistent height — no `h-` class, so their height depends on padding only. Align to `h-12`.
- `text-slate-500` for the cancel label is very muted — consider `t.textMuted` so it adapts to dark mode.
- The modal lacks an icon or illustration — it appears very plain for what is an important conversion moment.

**Fixes:**
```tsx
export default function CustomModal({ authModalVisible, setAuthModalVisible }: CustomModalProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={authModalVisible} transparent animationType="slide" onRequestClose={() => setAuthModalVisible(false)}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View className="flex-1 bg-black/50 justify-center px-5">
          <View className={`rounded-[28px] p-6 border ${t.border} ${t.bgCard}`}>

            {/* Icon */}
            <View className="items-center mb-4">
              <View className={`w-16 h-16 rounded-[22px] ${t.brandSoft} items-center justify-center`}>
                <MaterialCommunityIcons name="message-lock-outline" size={28} color="#2563EB" />
              </View>
            </View>

            <Text className={`text-xl font-black text-center ${t.text}`}>Sign in to Message</Text>
            <Text className={`text-sm text-center mt-2 mb-6 leading-5 ${t.textMuted}`}>
              Create an account to send messages and connect with employers and vendors.
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/(ProtectedRoutes)/AuthenticationPage")}
              className="h-12 rounded-2xl bg-blue-600 items-center justify-center mb-3"
            >
              <Text className="text-white font-black text-sm uppercase tracking-widest">Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAuthModalVisible(false)}
              className={`h-12 rounded-2xl border items-center justify-center ${t.border} ${t.bgSurface}`}
            >
              <Text className={`font-black text-sm uppercase tracking-widest ${t.textMuted}`}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
```

---

## 20. Utility Components

### 20.1 CustomLoadingSpinner

**Current state:** Well-implemented — uses `useTheme`, animated rotation via `Animated.loop`, branded icon `MaterialCommunityIcons name="loading"`, responsive to theme tokens. The "KABAYAN" watermark at `absolute bottom-12` is a nice touch but may not render visible if the spinner is used inside a small container (it's positioned relative to `View` not the screen).

**Minor fixes:**
- The `absolute bottom-12` watermark assumes the spinner occupies the full screen. When used inside a partial-height container, it will clip. Move it inside the main `items-center` column instead:
```tsx
// Move watermark inside the column, not absolute
<View className="mt-6">
  <Text className="text-blue-600/30 font-black tracking-[4px] text-[10px]">KABAYAN</Text>
</View>
```
- The `message` prop defaults to `"Gathering local experts..."` — this is Jobs-specific language. Change default to a generic `"Loading…"` and let callers pass the specific message.

---

### 20.2 AppFlashMessage

**Current state:** Solid design — four semantic variants (`info`, `success`, `error`, `warning`), each with distinct bg/border/text/icon colors. Theme-aware palette is hardcoded per variant (not using `t` tokens) which is intentional since flash messages need to stand out regardless of the current theme.

**Problems:**
- The component only renders above wherever it's placed in the JSX tree — in `chatRoom.tsx` it's placed between the message list and the input bar, meaning on very short phones it can overlap the last message. Consider an absolute positioned overlay instead:
```tsx
// In chatRoom.tsx — position flash above the input bar
<View style={{ position: 'absolute', bottom: inputBarHeight + insets.bottom + 8, left: 0, right: 0, zIndex: 50 }}>
  <AppFlashMessage message={flashMessage} onClose={hideFlashMessage} />
</View>
```
- No auto-dismiss timer — the flash stays until the user taps it. Add a `duration` prop that auto-dismisses after N ms (default 3000):
```tsx
// In AppFlashMessage or in useFlashMessage hook
useEffect(() => {
  if (!message) return;
  const timer = setTimeout(onClose, duration ?? 3000);
  return () => clearTimeout(timer);
}, [message]);
```
- Dark mode: the `info` bg `#EFF6FF` on a dark page looks like a floating light island. The existing palette works fine — just note this is intentional (flash messages are always light-bg).

---

### 20.3 CustomBackButton

**Current state:** Minimal — renders a `Feather arrow-left` with `color="#fff"` hardcoded. This means it's only usable on dark backgrounds (images, dark headers). On any light background it disappears.

**Fix:**
```tsx
export default function CustomBackButton({ color }: { color?: string }) {
  const router = useRouter();
  const { t } = useTheme();

  return (
    <Pressable
      className="ml-5 h-10 w-10 items-center justify-center rounded-2xl"
      style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
      onPress={() => router.back()}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Feather size={18} color={color ?? "#FFFFFF"} name="arrow-left" />
    </Pressable>
  );
}
```

---

### 20.4 CustomPermissionCard (CustomPermissionGate)

**Current state:** Well-structured — large icon circle, clear title/description, primary "Allow" button and optional "Not Now" skip, "Open System Settings" link. Uses `useTheme` correctly.

**Problems:**
- The `bg-slate-100 dark:bg-slate-800` Tailwind dark variant at the bottom privacy footer will not work — NativeWind v2 does not support `dark:` pseudo-class variants by default without explicit config. Replace with theme token:
```tsx
// Privacy footer — replace dark: variant with t token
<View className={`flex-row items-center px-4 py-2 rounded-full ${t.bgSurface} border ${t.border}`}>
  <MaterialCommunityIcons name="shield-check" size={14} color="#10B981" />
  <Text className={`ml-2 text-[10px] font-bold ${t.textMuted}`}>
    Kabayan Security & Privacy
  </Text>
</View>
```
- The icon `View` uses `border-4 border-white` on the small plus badge — hardcoded white border won't be visible in dark mode. Change to `border-[${t.isDarkMode ? '#0B1120' : '#FFFFFF'}]` via inline style.
- The large icon circle `w-32 h-32 rounded-[48px]` — this super-rounded square (48px on a 128px container) is the most extreme radius in the app. Either go fully circular (`rounded-full`) or align to the `rounded-[28-32px]` system used elsewhere.

---

## 21. Messages Screen (message.tsx)

### 21.1 Current Problems

- The search bar is embedded directly in a `pt-5 pb-3` header block rather than using `CustomSearchComponent` — this creates a second, slightly different search style in the app.
- The conversation item avatar uses `rounded-[20px]` (square-ish) which diverges from the circular avatars everywhere else in the app.
- The "Job: {title}" and "Direct Message" tag uses `text-[9px]` — below the minimum readable size on budget Android (see Section 11).
- No unread indicator — there is no visual differentiation between conversations with unseen messages and those that are up to date. The `conversation_reads` table exists in the DB but is not surfaced here.
- The `active:bg-slate-50` press state is hardcoded light-mode — it's invisible in dark mode.
- The loading state uses a raw `ActivityIndicator` with no label or skeleton structure.
- The `ListEmptyComponent` is a single bare `text-sm ${t.textMuted}` — missed opportunity for the `EmptyState` component defined in Section 10.

### 21.2 Fixes

**Circular avatar:**
```tsx
// rounded-[20px] → rounded-full for consistency
<Image source={{ uri: item.otherAvatarUrl }} className="w-14 h-14 rounded-full" />
// Fallback:
<View className="w-14 h-14 rounded-full bg-slate-200 items-center justify-center">
```

**Tag label — bump font size:**
```tsx
// text-[9px] → text-[10px]
<Text className={`text-[10px] font-black uppercase ${t.brand}`}>
  {item.jobTitle ? `Job: ${item.jobTitle}` : "Direct Message"}
</Text>
```

**Press state — theme-aware:**
```tsx
// active:bg-slate-50 → conditional
className={`flex-row items-center p-5 border-b ${t.border} ${
  t.isDarkMode ? 'active:bg-slate-800/50' : 'active:bg-slate-50'
}`}
```

**Unread badge (when data is available):**
```tsx
// Add unreadCount to the Conversation type and render a dot
{item.unreadCount > 0 && (
  <View className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
)}
```

**Skeleton loading — replace ActivityIndicator:**
```tsx
function ConversationSkeleton({ t }: { t: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  return (
    <Animated.View style={{ opacity }} className={`flex-row items-center p-5 border-b ${t.border}`}>
      <View className={`w-14 h-14 rounded-full ${t.bgSurface}`} />
      <View className="flex-1 ml-4">
        <View className={`h-4 w-32 rounded-full ${t.bgSurface} mb-2`} />
        <View className={`h-3 w-48 rounded-full ${t.bgSurface}`} />
      </View>
    </Animated.View>
  );
}
// Show 4 skeletons while loading === true
```

**Empty state — use EmptyState component:**
```tsx
ListEmptyComponent={
  <EmptyState
    icon="chatbubbles-outline"
    title="No conversations yet"
    subtitle="Apply to a job or message a vendor to start chatting."
    t={t}
  />
}
```

---

## 22. ChatRoom Screen (chatRoom.tsx)

### 22.1 Current Problems

**Header:**
- The online status shows `"Active Now"` for all conversations regardless of actual presence — there is no real presence system (Socket.IO disconnected auth). This is misleading. Show `"Kabayan Member"` or the job title instead.
- The `⋮` more-options button renders but `onPress` has no handler — it's a dead button. Either implement options (block, report, clear chat) or remove it.
- The job context banner (`Job: {headerJob}`) shows `"Conversation"` as fallback when there's no job — this is inaccurate for direct messages.

**Message bubbles:**
- Sender label (`"You"` / `otherName`) uses `text-[9px]` — below minimum readable size.
- Timestamp uses `text-[8px]` — the smallest text in the entire app. This is unreadable on most phones. Bump to `text-[10px]`.
- No delivery status (sent/delivered) — even a simple single tick on sent messages would improve perceived reliability.
- The `rounded-tr-none` / `rounded-tl-none` tail for bubbles is a nice touch — keep it.
- `max-w-[75%]` is correct.

**Input bar:**
- The `+` attachment button has no `onPress` handler — dead button.
- The microphone button is visible when `message.length === 0` but has no handler — dead button.
- The send button only appears `message.length > 0` — this is correct UX.
- `keyboardVerticalOffset={insets.top + 18}` on iOS — this may be slightly off on devices with a large Dynamic Island (iPhone 14/15 Pro). Test with `insets.top + 12`.

**Polling vs real-time:**
- Comment in code says "Realtime channels removed — polling replaces realtime" but there's no polling interval set up. Messages only load once on mount. New messages from the other party won't appear until the user leaves and re-enters the room.

### 22.2 Fixes

**Header — fix misleading presence:**
```tsx
// Replace "Active Now" with a neutral label
<Text className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>
  {jobTitle ? `Job Chat` : "Direct Message"}
</Text>
```

**Message bubble — bump minimum font sizes:**
```tsx
// Sender label: text-[9px] → text-[10px]
<Text className={`text-[10px] mb-1 font-black uppercase tracking-widest ${isMe ? "text-blue-200" : t.textMuted}`}>

// Timestamp: text-[8px] → text-[10px]
<Text className={`text-[10px] font-bold mt-1 text-right ${isMe ? "text-blue-200" : t.textMuted}`}>
```

**Job context banner — fix fallback copy:**
```tsx
// Don't show "Job: Conversation" for direct messages
{headerJob && headerJob !== 'Conversation' && (
  <View className={`${t.brandSoft} px-5 py-3 border-b ${t.border} flex-row justify-between items-center`}>
    <View className="flex-row items-center flex-1">
      <MaterialCommunityIcons name="briefcase-outline" size={16} color={t.accent} />
      <Text className={`ml-2 text-[10px] font-black uppercase tracking-widest ${t.textMuted}`} numberOfLines={1}>
        {`Job: ${headerJob}`}
      </Text>
    </View>
    <TouchableOpacity>
      <Text className="text-[10px] font-black text-blue-600 uppercase">View Details</Text>
    </TouchableOpacity>
  </View>
)}
```

**Add basic polling for new messages:**
```tsx
// In the useEffect that loads messages, add a polling interval
useEffect(() => {
  let isMounted = true;
  const loadMessages = async () => { ... };

  loadMessages();
  const interval = setInterval(() => {
    if (isMounted) loadMessages();
  }, 5000);  // poll every 5 seconds

  return () => {
    isMounted = false;
    clearInterval(interval);
  };
}, [roomId]);
```

### 22.3 ChatRoom Design Summary

| Element | Current | Improved |
|---|---|---|
| Online status | "Active Now" (always) | "Job Chat" / "Direct Message" |
| Sender label size | `text-[9px]` | `text-[10px]` |
| Timestamp size | `text-[8px]` | `text-[10px]` |
| Job banner fallback | "Job: Conversation" | Hidden for direct messages |
| Message refresh | Load once on mount only | 5-second polling interval |
| Attachment button | Dead (no handler) | Add media picker or remove |
| Mic button | Dead (no handler) | Remove until voice is implemented |
| More options button | Dead (no handler) | Add block/report sheet or remove |

---

## 23. AppPermissionsModal

### 23.1 Current Problems

- The modal uses `animationType="fade"` which is appropriate for a blocking gate, but the inner `View` has no entrance animation of its own — the whole overlay fades in flatly.
- The `hasDenied` warning uses hardcoded `bg-amber-50 border-amber-200 text-amber-800` — light-mode only colors.
- The per-permission card uses `bg-blue-100` for the icon container — light-mode only.
- The "Settings" button for permanently denied permissions uses `bg-slate-900` — in dark mode this is the same as the card background, making it invisible.
- The `grantedCount/{PERMISSIONS.length}` counter in the header uses `text-blue-600` — fine, but consider making it a visual progress pill instead of raw text.
- The "Continue" / "Skip for Now" footer button uses `t.bgCard` which in dark mode is very close to the modal background — the button has no visible depth.

### 23.2 Fixes

**Dark mode for warning banner:**
```tsx
<View className={`mb-4 p-3 rounded-2xl border ${
  t.isDarkMode ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'
}`}>
  <Text className={`text-xs font-semibold ${t.isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>
    Some permissions were denied. Enable them in Settings for full functionality.
  </Text>
</View>
```

**Dark mode for icon container:**
```tsx
<View className={`w-9 h-9 rounded-xl items-center justify-center ${
  t.isDarkMode ? 'bg-blue-900/40' : 'bg-blue-100'
}`}>
  <Feather name={permission.icon} size={16} color="#2563EB" />
</View>
```

**"Settings" button — visible in dark mode:**
```tsx
<TouchableOpacity
  onPress={() => Linking.openSettings()}
  className={`px-3 py-2 rounded-xl border ${t.border} ${t.bgSurface}`}
  activeOpacity={0.8}
>
  <Text className={`text-[10px] font-black uppercase ${t.text}`}>Settings</Text>
</TouchableOpacity>
```

**Progress counter — visual pill:**
```tsx
// Replace bare text with a pill badge
<View className={`px-2.5 py-1 rounded-full ${
  allGranted ? 'bg-emerald-500/20' : 'bg-blue-500/20'
}`}>
  <Text className={`text-xs font-black ${allGranted ? 'text-emerald-600' : 'text-blue-600'}`}>
    {grantedCount}/{PERMISSIONS.length}
  </Text>
</View>
```

**Footer button — add border for definition in dark mode:**
```tsx
<TouchableOpacity
  onPress={onDone}
  className={`mt-5 h-12 rounded-2xl border items-center justify-center ${t.border} ${t.bgSurface}`}
  activeOpacity={0.85}
>
  <Text className={`font-black uppercase tracking-widest text-xs ${t.text}`}>
    {checking ? "Loading…" : allGranted ? "Continue" : "Skip for Now"}
  </Text>
</TouchableOpacity>
```

---

## 24. Global Dark Mode Audit

Across all components reviewed, the following pattern of hardcoded light-mode values repeats. This section lists them as a single sweep checklist so they can be fixed systematically.

### 24.1 Hardcoded Values to Replace

| Hardcoded Value | Component(s) | Replace With |
|---|---|---|
| `bg-white` | JobModal, MarketModal, CustomModal | `${t.bgCard}` |
| `text-slate-900` | JobModal Field, CustomModal title | `${t.text}` |
| `text-slate-500` / `text-slate-600` | Modal subtitles, tips sections | `${t.textMuted}` |
| `bg-slate-50` | All Field inputs | `${t.bgSurface}` |
| `border-slate-200` | All Field inputs | `${t.border}` |
| `placeholderTextColor="#94A3B8"` | All fields | `t.isDarkMode ? "#475569" : "#94A3B8"` |
| `active:bg-slate-50` | Message thread items | `t.isDarkMode ? "active:bg-slate-800/50" : "active:bg-slate-50"` |
| `bg-amber-50 border-amber-200` | AppPermissionsModal warning | `t.isDarkMode ? "bg-amber-900/20 border-amber-700" : "bg-amber-50 border-amber-200"` |
| `bg-blue-100` | AppPermissionsModal icon bg | `t.isDarkMode ? "bg-blue-900/40" : "bg-blue-100"` |
| `bg-slate-900` (Settings btn) | AppPermissionsModal | `${t.bgSurface} border ${t.border}` |
| `bg-white/90` (back button) | EntityHeroBanner | Inline style: theme-aware bg |
| `color="#fff"` | CustomBackButton | `color` prop, default white |
| `dark:bg-slate-800` | CustomPermissionGate footer | `${t.bgSurface}` |
| `border-4 border-white` (badge) | CustomPermissionGate plus badge | `borderColor: t.isDarkMode ? '#0B1120' : '#FFFFFF'` |
| `text-[8px]` timestamps | ChatRoom bubbles | `text-[10px]` |
| `text-[9px]` sender labels | ChatRoom, Messages tab | `text-[10px]` |
| `rounded-[20px]` avatar | Messages tab | `rounded-full` |

### 24.2 NativeWind `dark:` Pseudo-Class Warning

NativeWind v2 does **not** support the `dark:` pseudo-class variant by default. Any `dark:bg-*` or `dark:text-*` class written in the codebase will silently be ignored. All dark mode styling must go through the `t` token object from `useTheme()`. Audit for any `dark:` classes and replace them.

```bash
# Find all files using dark: pseudo-variants
grep -r "dark:" app/ components/ --include="*.tsx" -l
```

### 24.3 Updated Priority Order (All Sections Combined)

| Priority | Item | Section | Effort | Impact |
|---|---|---|---|---|
| 🔴 P0 | Skeleton loaders (Jobs, Market, Home, Messages) | 12, 21 | Medium | High — first impression |
| 🔴 P0 | Status badge semantic colors (Jobs) | 5 | Low | High — clarity |
| 🔴 P0 | Dark mode sweep — modal Field inputs | 17, 18, 24 | Low | High — broken in dark mode |
| 🔴 P0 | ChatRoom polling (messages don't update) | 22 | Low | High — broken feature |
| 🟠 P1 | Empty states with EmptyState component | 10, 21 | Medium | High — retention |
| 🟠 P1 | CustomModalComponent dark mode | 19 | Low | Medium |
| 🟠 P1 | Pull-to-refresh brand color | 12 | Low | Medium |
| 🟠 P1 | FAB — labeled "Post Job" button | 5 | Low | Medium |
| 🟠 P1 | Tab bar safe area + FAB shadow ring | 3 | Low | Medium |
| 🟠 P1 | Drawer dark mode (Section 16) | 16 | Medium | High |
| 🟡 P2 | Theme token consolidation | 2 | Medium | High long-term |
| 🟡 P2 | Typing indicator in AI chat | 7 | Low | Medium |
| 🟡 P2 | EntityHeroBanner — render title/subtitle props | 19 | Low | Low |
| 🟡 P2 | AppPermissionsModal dark mode | 23 | Low | Medium |
| 🟡 P2 | Message avatar — circular | 21 | Low | Low |
| 🟡 P2 | ChatRoom — remove dead buttons (mic, attachment, more) | 22 | Low | Low |
| 🟡 P2 | MarketEditModal — is_open toggle | 18 | Low | Medium |
| 🟢 P3 | Landing page contrast & blob visibility | 9 | Low | Low |
| 🟢 P3 | Onboarding dot height & image fallback | 8 | Low | Low |
| 🟢 P3 | Home — greeting with user name | 4 | Medium | Medium |
| 🟢 P3 | Press scale micro-interactions | 12 | Medium | Medium |
| 🟢 P3 | Accessibility labels across all screens | 13 | Medium | High (compliance) |
| 🟢 P3 | MarketModal banner image — wire to API | 18 | Medium | Low |
| 🟢 P3 | AppFlashMessage — auto-dismiss timer | 20 | Low | Medium |
| 🟢 P3 | CustomBackButton — theme-aware color prop | 20 | Low | Low |
