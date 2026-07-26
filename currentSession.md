  1066 ---
  1067
  1068 ## 10. Empty States — Give Them Character
  1069
  1070 Every screen currently uses a minimal empty state (icon + 1 line of text). These are fine functionally but miss an opportunity to reinforce the community brand.
  1071
  1072 ### Pattern to adopt:
  1073
  1074 ```tsx
  1075   function EmptyState({
  1076     icon,
  1077     title,
  1078     subtitle,
  1079     cta,
  1080     onCta,
  1081     t,
  1082   }: {
  1083     icon: string;
  1084     title: string;
  1085     subtitle: string;
  1086     cta?: string;
  1087     onCta?: () => void;
  1088     t: any;
  1089   }) {
  1090     return (
  1091       <View className={`mx-4 p-8 rounded-[28px] border ${t.border} ${t.bgCard} items-center`}>
  1092         {/* Illustrated icon circle */}
  1093         <View className={`w-20 h-20 rounded-[28px] ${t.brandSoft} items-center justify-center mb-4`}>
  1094           <Ionicons name={icon as any} size={36} color="#2563EB" />
  1095         </View>
  1096         <Text className={`text-lg font-black text-center ${t.text}`}>{title}</Text>
  1097         <Text className={`mt-2 text-sm text-center leading-5 ${t.textMuted}`}>{subtitle}</Text>
  1098         {cta && onCta && (
  1099           <TouchableOpacity
  1100             onPress={onCta}
  1101             className="mt-5 px-6 py-3 rounded-2xl bg-blue-600"
  1102           >
  1103             <Text className="text-white font-black text-xs uppercase tracking-widest">{cta}</Text>
  1104           </TouchableOpacity>
  1105         )}
  1106       </View>
  1107     );
  1108   }
  1109   ```
  1110
  1111 **Usage map:**
  1112
  1113   | Screen | Title | Subtitle | CTA |
  1114   |---|---|---|---|
  1115   | Jobs (no jobs) | "No open jobs yet" | "Check back soon, or be the first to post one." | "Post a Job" |
  1116   | Jobs (no search results) | "No matches found" | "Try a different title or location." | — |
  1117   | Marketplace (empty) | "No stores nearby" | "Be the first to list your products in this area." | "Add a Listing" |
  1118   | Home latest jobs | "Walang trabaho pa" | "Check back soon or post your own." | "Post a Job" |
  1119   | Messages (no conversations) | "No conversations yet" | "Apply to a job or message a vendor to start." | — |
  1120
  1121 ---
  1122
  1123 ## 11. Typography — Establish a Consistent Scale
  1124
  1125 The app mixes `text-[9px]` through `text-4xl` with no clear system. This causes visual noise where labels, metadata, and titles compete for attention.
  1126
  1127 ### Recommended scale:
  1128
  1129   | Role | Size | Weight | Usage |
  1130   |---|---|---|---|
  1131   | `caption` | 10px | 700 (bold) | Timestamps, UPPERCASE labels |
  1132   | `label` | 11px | 800 (extrabold) | Status badges, tab bar |
  1133   | `body-sm` | 13px | 600 | Descriptions, subtitles |
  1134   | `body` | 15px | 400–600 | Message text, form text |
  1135   | `subhead` | 16px | 800 | Card titles (jobs, vendors) |
  1136   | `title` | 20–22px | 900 | Screen section headings |
  1137   | `hero` | 27–32px | 900 | Screen-level hero titles |
  1138   | `display` | 38–42px | 900 | Landing/onboarding hero |
  1139
  1140 The existing code is close to this — the main gap is `text-[9px]` labels (`UPPERCASE tracking-widest`) which are too small on budget Android screens. Bump to
  `text-[10px]` minimum across all status badges and metadata.
  1141
  1142 ---
  1143
  1144 ## 12. Micro-Interactions & Feedback
  1145
  1146 These are small but high-impact for perceived quality.
  1147
  1148 ### 12.1 Button press feedback
  1149
  1150 All `TouchableOpacity` with `activeOpacity={0.85}` should add a subtle scale transform:
  1151 ```tsx
  1152   // Custom PressableCard wrapper
  1153   <Pressable
  1154     onPress={onPress}
  1155     style={({ pressed }) => [
  1156       pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }
  1157     ]}
  1158   >
  1159```
  1160
  1161 ### 12.2 Skeleton loading (high priority)
  1162
  1163 Replace raw `<ActivityIndicator />` list loaders with skeleton cards that mirror the real card shape. This dramatically reduces perceived load time.
  1164
  1165 ```tsx
  1166   function JobCardSkeleton({ t }: { t: any }) {
  1167     const anim = useRef(new Animated.Value(0)).current;
  1168     useEffect(() => {
  1169       Animated.loop(
  1170         Animated.sequence([
  1171           Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
  1172           Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
  1173         ])
  1174       ).start();
  1175     }, []);
  1176     const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  1177     return (
  1178       <Animated.View style={{ opacity }} className={`p-5 rounded-[24px] mb-4 ${t.bgCard} border ${t.border}`}>
  1179         <View className={`h-4 w-24 rounded-full ${t.bgSurface} mb-3`} />
  1180         <View className={`h-5 w-48 rounded-full ${t.bgSurface} mb-2`} />
  1181         <View className={`h-3 w-32 rounded-full ${t.bgSurface}`} />
  1182       </Animated.View>
  1183     );
  1184   }
  1185   ```
  1186 Show 3 skeletons while `loading === true`.
  1187
  1188 ### 12.3 Pull-to-refresh feedback
  1189
  1190 The current `RefreshControl` uses no `tintColor` or `colors`, so it shows a gray spinner that doesn't match the brand. Fix:
  1191 ```tsx
  1192   <RefreshControl
  1193     refreshing={loading}
  1194     onRefresh={loadJobs}
  1195     tintColor="#2563EB"       // iOS
  1196     colors={["#2563EB"]}      // Android
  1197   />
  1198```
  1199
  1200 ---
  1201
  1202 ## 13. Accessibility
  1203
  1204   | Issue | Screen | Fix |
  1205   |---|---|---|
  1206   | No `accessibilityLabel` on icon-only buttons (menu, bell, map pin) | Tab header | Add descriptive labels |
  1207   | Job card `Pressable` has no `accessibilityRole` | Home, Jobs | Add `accessibilityRole="button"` |
  1208   | Color-only status indicators (open/closed pill) | Marketplace | Add text label to pill, not just color |
  1209   | `text-[9px]` / `text-[10px]` renders at ~10sp — below WCAG minimum for body text | All | Bump to 12px minimum for all non-decorative text |
  1210   | Missing `accessibilityHint` on send button in AI chat | Assistant | `accessibilityHint="Sends your message to Kabayan AI"` |
  1211
  1212 ---
  1213
  1214 ## 14. Priority Order for Implementation
  1215
  1216   | Priority | Item | Effort | Impact |
  1217   |---|---|---|---|
  1218   | 🔴 P0 | Skeleton loaders (Jobs, Market, Home) | Medium | High — first impression |
  1219   | 🔴 P0 | Status badge semantic colors (Jobs) | Low | High — clarity |
  1220   | 🟠 P1 | Empty states with EmptyState component | Medium | High — retention |
  1221   | 🟠 P1 | Pull-to-refresh brand color | Low | Medium |
  1222   | 🟠 P1 | FAB — labeled "Post Job" button | Low | Medium |
  1223   | 🟠 P1 | Tab bar safe area + FAB shadow ring | Low | Medium |
  1224   | 🟡 P2 | Theme token consolidation | Medium | High long-term |
  1225   | 🟡 P2 | Typing indicator in AI chat | Low | Medium |
  1226   | 🟡 P2 | Clear chat button in AI | Low | Low |
  1227   | 🟡 P2 | Marketplace category placeholder colors | Low | Medium |
  1228   | 🟢 P3 | Landing page contrast & blob visibility | Low | Low |
  1229   | 🟢 P3 | Onboarding dot height & image fallback | Low | Low |
  1230   | 🟢 P3 | Home — greeting with user name | Medium | Medium |
  1231   | 🟢 P3 | Press scale micro-interactions | Medium | Medium |
  1232   | 🟢 P3 | Accessibility labels across all screens | Medium | High (compliance) |
  1233
  1234 ---
  1235
  1236 ## 15. What NOT to Change
  1237
  1238 - The floating AI tab button concept — it differentiates the app and the bone structure is right. Just polish the shadow.
  1239 - The card radius language (`rounded-[24-30px]`) — it's distinctive and consistent. Keep it.
  1240 - The Filipino greeting in Home — culturally resonant, keep it and extend it with the user's name.
  1241 - The Assistant screen's warm orange brand (`#E45C35`) — it correctly differentiates AI from the blue product brand. Keep the dual-brand approach.
  1242- - The NativeWind (Tailwind) approach — avoid switching to StyleSheet-only. The class-based system works well with the theme token pattern.
  1242+ - The NativeWind (Tailwind) approach — avoid switching to StyleSheet-only. The class-based system works well with the theme token pattern.
  1243+
  1244+ ---
  1245+
  1246+ ## 16. Drawer (CustomDrawerContent.tsx)
  1247+
  1248+ ### 16.1 Current Problems
  1249+
  1250+ **Profile header:**
  1251+ - The header background is a flat `bg-slate-50` with a `border-b border-slate-100` — in light mode this looks like a slightly off-white block with no visual
      hierarchy. There's no way to distinguish it from the rest of the drawer at a glance.
  125+ - The avatar uses `rounded-[22px]` (square-ish) — this diverges from every other avatar in the app (profile views, chat rooms) which tend to be fully circular. Pick
     one and be consistent.
  125+ - Verification status (`id_verification_status`) is fetched in the profile data but never displayed anywhere in the drawer — a verified badge next to the user's
     name would reinforce trust.
  1254+ - The email shows as raw `text-sm font-medium text-slate-500` directly under the name — this is fine but on long emails it can overflow into the avatar area with  
      no truncation.
  125+ - When the user is a guest (`currentUserId === null`), the header shows "Guest User" with no email and no visual affordance to sign in — the header is clickable
     only for logged-in users, but guests see nothing actionable above the fold.
  1256+
  1257+ **Drawer items:**
  125+ - The item icon backgrounds are hardcoded `bg-slate-50` — these don't change in dark mode because the entire drawer background is `bg-white` (also hardcoded,
     ignores dark theme entirely).
  1259+ - The active state is `bg-blue-50` which only exists in light mode — dark mode would need `bg-blue-500/10`.
  126+ - The badge counts inside labels (`Job Applicants (${applicantCount})`) are embedded in the text string. This means the number and the label are the same visual
     weight — counts should be a separate pill.
  126+ - There is only one section ("Manage") — there's no way to reach primary navigation (Home, Jobs, Market, AI, Messages) from the drawer without closing it and
     tapping the tab bar.
  1262+ - The "Sign Out" item uses `color="#EF4444"` for the icon but the label text is still the default dark color (`text-slate-700`) — they should both be red to signal
      a destructive action.
  1263+ - No dark mode support: the entire component is hardcoded `bg-white`, `bg-slate-50`, `bg-slate-100`, `text-slate-900` etc. with no theme-aware classes.
  1264+
  1265+ ### 16.2 Fixes
  1266+
  1267+ **Add dark mode support — wrap in `useTheme`:**
  1268+ ```tsx
  1269+  // Top of CustomDrawerContent
  1270+  const { t } = useTheme();
  1271+
  1272+  // Root view
  1273+  <View style={{ flex: 1, backgroundColor: t.isDarkMode ? '#0B1120' : '#FFFFFF' }}>
  1274+
  1275+  // Header background
  1276+  style={{ backgroundColor: t.isDarkMode ? '#141C2E' : '#F8FAFC', borderBottomColor: t.isDarkMode ? '#1E293B' : '#F1F5F9' }}
  1277+
  1278+  // DrawerItem active background
  1279+  className={`flex-row items-center rounded-[20px] px-4 py-3.5 ${
  1280+    isActive
  1281+      ? t.isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'
  1282+      : t.isDarkMode ? 'active:bg-slate-800' : 'active:bg-slate-100'
  1283+  }`}
  1284+
  1285+  // Icon container
  1286+  style={{ backgroundColor: t.isDarkMode ? '#1A2540' : '#F1F5F9' }}
  1287+
  1288+  // Item label
  1289+  className={`text-[14px] ${
  1290+    isActive
  1291+      ? 'text-blue-500 font-black'
  1292+      : t.isDarkMode ? 'text-slate-300 font-semibold' : 'text-slate-700 font-semibold'
  1293+  }`}
  1294+
  1295+  // Section title
  1296+  className={`mb-2 px-3 text-[10px] font-black uppercase tracking-[2px] ${t.textMuted}`}
  1297+
  1298+  // Footer border
  1299+  style={{ borderTopColor: t.isDarkMode ? '#1E293B' : '#F1F5F9' }}
  1300+  ```
  1301+
  1302+ **Profile header — add gradient + verified badge:**
  1303+ ```tsx
  1304+  // Replace flat bg-slate-50 with a subtle two-tone header
  1305+  <LinearGradient
  1306+    colors={t.isDarkMode ? ['#141C2E', '#0B1120'] : ['#EFF6FF', '#F8FAFC']}
  1307+    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
  1308+    style={{ paddingTop: inset.top + 18, paddingHorizontal: 20, paddingBottom: 28 }}
  1309+  >
  1310+    ...header content...
  1311+  </LinearGradient>
  1312+
  1313+  // If expo-linear-gradient is not installed, fake it with two overlapping Views:
  1314+  <View style={{ backgroundColor: t.isDarkMode ? '#141C2E' : '#EFF6FF' }}>
  1315+    <View style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120,
  1316+                   borderRadius: 60, backgroundColor: t.isDarkMode ? '#1D3461' : '#BFDBFE',
  1317+                   opacity: 0.4 }} />
  1318+    ...header content...
  1319+  </View>
  1320+  ```
  1321+
  1322+ **Avatar — circular with ring:**
  1323+ ```tsx
  1324+  // Unify to fully circular avatars
  1325+  <Image
  1326+    source={{ uri: profile.avatar_url }}
  1327+    className="w-16 h-16 rounded-full"
  1328+    style={{ borderWidth: 2, borderColor: t.isDarkMode ? '#1D3461' : '#BFDBFE' }}
  1329+  />
  1330+  // Fallback initials circle
  1331+  <View className="w-16 h-16 rounded-full bg-blue-600 items-center justify-center"
  1332+        style={{ borderWidth: 2, borderColor: t.isDarkMode ? '#1D3461' : '#BFDBFE' }}>
  1333+    <Text className="text-white text-lg font-black">{initials}</Text>
  1334+  </View>
  1335+  ```
  1336+
  1337+ **Verified badge next to name:**
  1338+ ```tsx
  1339+  <View className="flex-row items-center mt-0.5">
  1340+    <Text className={`text-xl font-black tracking-tight ${t.text}`} numberOfLines={1}>
  1341+      {profile?.display_name?.trim() || "Guest User"}
  1342+    </Text>
  1343+    {profile?.id_verification_status === 'verified' && (
  1344+      <View className="ml-2 bg-emerald-500 rounded-full p-0.5">
  1345+        <MaterialCommunityIcons name="check" size={10} color="white" />
  1346+      </View>
  1347+    )}
  1348+  </View>
  1349+  ```
  1350+
  1351+ **Email — truncate with numberOfLines:**
  1352+ ```tsx
  1353+  <Text className={`mt-1 text-sm font-medium ${t.textMuted}`} numberOfLines={1}>
  1354+    {email ?? 'Not signed in'}
  1355+  </Text>
  1356+  ```
  1357+
  1358+ **Guest header — add a sign-in prompt:**
  1359+ ```tsx
  1360+  // When !currentUserId, replace the tap-disabled header with an active CTA
  1361+  {!currentUserId ? (
  1362+    <TouchableOpacity
  1363+      onPress={() => closeAndNavigate('/AuthenticationPage')}
  1364+      className="flex-row items-center"
  1365+    >
  1366+      <View className="w-16 h-16 rounded-full bg-slate-200 items-center justify-center">
  1367+        <MaterialCommunityIcons name="account-outline" size={28} color="#94A3B8" />
  1368+      </View>
  1369+      <View className="ml-4 flex-1">
  1370+        <Text className={`text-lg font-black ${t.text}`}>Guest User</Text>
  1371+        <View className="mt-1 flex-row items-center">
  1372+          <Text className="text-blue-500 text-sm font-bold">Sign in to your account</Text>
  1373+          <MaterialCommunityIcons name="arrow-right" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />
  1374+        </View>
  1375+      </View>
  1376+    </TouchableOpacity>
  1377+  ) : (
  1378+    // existing logged-in header
  1379+  )}
  1380+  ```
  1381+
  1382+ **Badge counts — separate pill:**
  1383+ ```tsx
  1384+  // Replace the text-embedded count with a badge View
  1385+  const DrawerItem = ({ icon, label, href, activeMatch, onPress, color, badge }: DrawerItemConfig & { badge?: number }) => {
  1386+    return (
  1387+      <Pressable ...>
  1388+        <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: iconBg }}>
  1389+          <MaterialCommunityIcons name={icon} size={20} color={isActive ? '#2563EB' : color} />
  1390+        </View>
  1391+        <View className="ml-3 flex-1">
  1392+          <Text className={`text-[14px] ...`}>{label}</Text>
  1393+        </View>
  1394+        {badge !== undefined && badge > 0 && (
  1395+          <View className="bg-blue-600 rounded-full min-w-[20px] h-5 px-1.5 items-center justify-center">
  1396+            <Text className="text-white text-[10px] font-black">{badge > 99 ? '99+' : badge}</Text>
  1397+          </View>
  1398+        )}
  1399+      </Pressable>
  1400+    );
  1401+  };
  1402+
  1403+  // Pass badge props in sections:
  1404+  { icon: 'account-group-outline', label: 'Job Applicants', badge: applicantCount, href: '/profile/JobApplicants' },
  1405+  { icon: 'store-edit-outline',    label: 'My Listings',    badge: listingsCount,  href: '/marketPlace/marketPlaceView?scope=mine' },
  1406+  ```
  1407+
  1408+ **Add primary navigation section:**
  1409+ ```tsx
  1410+  // Add a "Navigate" section above "Manage" so users can jump to any tab from the drawer
  1411+  {
  1412+    title: "Navigate",
  1413+    items: [
  1414+      { icon: "view-grid-outline",         label: "Home",        href: "/(tabs)/home"        },
  1415+      { icon: "briefcase-variant-outline", label: "Jobs",        href: "/(tabs)/jobs"        },
  1416+      { icon: "shopping-outline",          label: "Marketplace", href: "/(tabs)/marketPlace" },
  1417+      { icon: "robot-excited-outline",     label: "Kabayan AI",  href: "/(tabs)/assistant"   },
  1418+      { icon: "message-text-outline",      label: "Messages",    href: "/(tabs)/message"     },
  1419+    ],
  1420+  }
  1421+  ```
  1422+
  1423+ **Sign Out — consistent red styling:**
  1424+ ```tsx
  1425+  // Make both icon and label red for destructive clarity
  1426+  <Pressable onPress={handleSignOut} className="flex-row items-center rounded-[20px] px-4 py-3.5 active:bg-red-50">
  1427+    <View className="h-10 w-10 rounded-2xl items-center justify-center bg-red-50">
  1428+      <MaterialCommunityIcons name="logout-variant" size={20} color="#EF4444" />
  1429+    </View>
  1430+    <View className="ml-3 flex-1">
  1431+      <Text className="text-[14px] text-red-500 font-semibold">Sign Out</Text>
  1432+    </View>
  1433+  </Pressable>
  1434+  ```
  1435+
  1436+ ### 16.3 Drawer Width & Animation
  1437+
  1438+ The drawer currently uses the Expo Router default drawer width (~80% of screen) and slide animation. Consider:
  1439+ - Set `drawerStyle={{ width: '78%' }}` in `_layout.tsx` for a tighter feel on large phones.
  1440+ - Add `overlayColor="rgba(0,0,0,0.45)"` for a proper backdrop dimming effect.
  1441+ - `drawerType="slide"` (default) is fine — `"front"` would feel more native on Android but changes the interaction model.
  1442+
  1443+ ```tsx
  1444+  // app/_layout.tsx — Drawer options
  1445+  <Drawer
  1446+    drawerContent={(props) => <CustomDrawerContent {...props} />}
  1447+    screenOptions={{
  1448+      headerShown: false,
  1449+      drawerStyle: { width: '78%' },
  1450+      overlayColor: 'rgba(0,0,0,0.45)',
  1451+    }}
  1452+  >
  1453+  ```
  1454+
  1455+ ### 16.4 Root Layout — Dark Mode StatusBar
  1456+
  145+ The root `_layout.tsx` hardcodes `<StatusBar barStyle="dark-content" />`. This means on dark mode the status bar text/icons are dark on a dark background —
     invisible. Fix:
  1458+
  1459+ ```tsx
  1460+  // app/_layout.tsx
  1461+  import { useTheme } from '@/hooks/useTheme';
  1462+
  1463+  // Inside RootLayout:
  1464+  const { t } = useTheme();
  1465+  <StatusBar barStyle={t.isDarkMode ? 'light-content' : 'dark-content'} />
  1466+  ```
  1467+
  1468+ ### 16.5 Drawer Design Summary Table
  1469+
  1470+  | Element | Current | Improved |
  1471+  |---|---|---|
  1472+  | Background | Hardcoded `bg-white` | Theme-aware `bg-[#0B1120]` / `bg-white` |
  1473+  | Header | Flat `bg-slate-50` | Subtle gradient / accent blob |
  1474+  | Avatar | `rounded-[22px]` square | `rounded-full` circular with ring |
  1475+  | Verified badge | Not shown | Emerald checkmark pill next to name |
  1476+  | Email | No truncation | `numberOfLines={1}` |
  1477+  | Guest state | Non-interactive "Guest User" | Tappable "Sign in" CTA |
  1478+  | Item counts | Embedded in label text | Separate blue pill badge |
  1479+  | Active state | `bg-blue-50` (light only) | Theme-aware active background |
  1480+  | Icon containers | Hardcoded `bg-slate-50` | Theme-aware icon bg |
  1481+  | Sign Out | Red icon only | Red icon + red label |
  1482+  | Navigation | Manage section only | Navigate section + Manage section |
  1483+  | Drawer width | Default (~80%) | `78%` with `overlayColor` |
  1484+  | StatusBar | Always `dark-content` | Follows theme |

  as well as the other the bottomsheet modals and all every component in the app page and in the component

  Let me read all the remaining components I haven't covered yet.
● Read (3 files)
    JobModal.tsx, JobEditModal.tsx, MarketModal.tsx
● Read (4 files)
    MarketEditModal.tsx, CustomBottomSheet.tsx, CustomSearchComponent.tsx, EntityHeroBanner.tsx
● Read (4 files)
    CustomModalComponent.tsx, CustomLoadingSpinner.tsx, AppFlashMessage.tsx, CustomBackButtonComponents.tsx
● Read (3 files)
    message.tsx, chatRoom.tsx, AuthenticationForm.tsx
● Read (3 files)
    AppPermissionsModal.tsx, CustomPermissionCard.tsx, ProfiletView.tsx

  Now I have everything. Let me append the comprehensive section for all these components:
● Write
