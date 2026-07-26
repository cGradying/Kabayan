import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable, Text, Image, TouchableOpacity } from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { api, getStoredUser, signOut } from "@/utils/api";

type DrawerProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  id_verification_status: string | null;
  job_role: string | null;
  market_role: string | null;
  location_label: string | null;
};

type DrawerItemConfig = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  href?: string;
  activeMatch?: string[];
  onPress?: () => void;
  color?: string;
  hidden?: boolean;
  badge?: number;
};

export default function CustomDrawerContent(props: any) {
  const { t } = useTheme();
  const inset = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<DrawerProfile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [applicantCount, setApplicantCount] = useState(0);
  const [listingsCount, setListingsCount] = useState(0);

  const loadDrawerData = useCallback(async () => {
    const user = await getStoredUser();

    if (!user) {
      setCurrentUserId(null);
      setEmail(null);
      setProfile(null);
      setApplicantCount(0);
      setListingsCount(0);
      return;
    }

    setCurrentUserId(user.id);
    setEmail(user.email ?? null);

    try {
      const [profileData, applicantsData, listingsData] = await Promise.all([
        api.get<any>(`/api/profiles/${user.id}/drawer`),
        api.get<any[]>("/api/applications"),
        api.get<number>("/api/counts/listings"),
      ]);

      setProfile((profileData as DrawerProfile | null) ?? null);
      setApplicantCount(Array.isArray(applicantsData) ? applicantsData.length : 0);
      setListingsCount(Number(listingsData ?? 0));
    } catch {
      throw new Error("Failed to load drawer data");
    }
  }, []);

  useEffect(() => {
    loadDrawerData().catch(() => {
      setCurrentUserId(null);
      setEmail(null);
      setProfile(null);
      setApplicantCount(0);
      setListingsCount(0);
    });
  }, [loadDrawerData]);

  const closeAndNavigate = useCallback(
    (href: string) => {
      props.navigation.closeDrawer();
      router.push(href as never);
    },
    [props.navigation, router]
  );

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      props.navigation.closeDrawer();
      router.replace("/AuthenticationPage");
    } catch {
      console.warn("Unable to sign out.");
    }
  }, [props.navigation, router]);

  const initials =
    (profile?.display_name ?? "Guest User")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "GU";

  const sections = useMemo(
    () => [
      {
        title: "Navigate",
        items: [
          { icon: "view-grid-outline", label: "Home", href: "/(tabs)/home" },
          { icon: "briefcase-variant-outline", label: "Jobs", href: "/(tabs)/jobs" },
          { icon: "shopping-outline", label: "Marketplace", href: "/(tabs)/marketPlace" },
          { icon: "robot-excited-outline", label: "Kabayan AI", href: "/(tabs)/assistant" },
          { icon: "message-text-outline", label: "Messages", href: "/(tabs)/message" },
        ] satisfies DrawerItemConfig[],
      },
      {
        title: "Manage",
        items: [
          {
            icon: "account-group-outline",
            label: "Job Applicants",
            href: "/profile/JobApplicants",
            activeMatch: ["/profile/JobApplicants"],
            badge: applicantCount,
          },
          {
            icon: "file-document-outline",
            label: "My Applications",
            href: "/profile/MyApplications",
            activeMatch: ["/profile/MyApplications"],
          },
          {
            icon: "store-edit-outline",
            label: "My Listings",
            href: "/marketPlace/marketPlaceView?scope=mine",
            activeMatch: ["/marketPlace/marketPlaceView"],
            badge: listingsCount,
          },
          {
            icon: "account-search-outline",
            label: "People Connect",
            href: "/profile/PeopleConnect",
            activeMatch: ["/profile/PeopleConnect"],
          },
        ] satisfies DrawerItemConfig[],
        hidden: !currentUserId,
      },
    ],
    [applicantCount, currentUserId, listingsCount]
  );

  const DrawerItem = ({ icon, label, href, activeMatch = [], onPress, color = "#475569", badge }: DrawerItemConfig) => {
    const isActive = activeMatch.some((match) => pathname === match || pathname.startsWith(`${match}/`));

    return (
      <Pressable
        onPress={onPress ?? (href ? () => closeAndNavigate(href) : undefined)}
        className={`flex-row items-center rounded-[20px] px-4 py-3.5 ${
          isActive
            ? t.isDarkMode ? "bg-blue-500/10" : "bg-blue-50"
            : `${t.isDarkMode ? "active:bg-slate-800" : "active:bg-slate-100"}`
        }`}
      >
        <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: t.isDarkMode ? '#1A2540' : '#F1F5F9' }}>
          <MaterialCommunityIcons name={icon} size={20} color={isActive ? "#2563EB" : color} />
        </View>
        <View className="ml-3 flex-1">
          <Text className={`text-[14px] ${isActive ? "text-blue-500 font-black" : `${t.isDarkMode ? "text-slate-300" : "text-slate-700"} font-semibold`}`}>
            {label}
          </Text>
        </View>
        {badge !== undefined && badge > 0 && (
          <View className="bg-blue-600 rounded-full min-w-[20px] h-5 px-1.5 items-center justify-center">
            <Text className="text-white text-[10px] font-black">{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.isDarkMode ? '#0B1120' : '#FFFFFF' }}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 0, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {!currentUserId ? (
          <TouchableOpacity
            onPress={() => closeAndNavigate('/AuthenticationPage')}
            className="px-5 pb-7"
            style={{ paddingTop: inset.top + 18, backgroundColor: t.isDarkMode ? '#141C2E' : '#F8FAFC', borderBottomColor: t.isDarkMode ? '#1E293B' : '#F1F5F9' }}
            activeOpacity={0.85}
          >
            <View className="flex-row items-start">
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
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => closeAndNavigate("/profile")}
            style={{ paddingTop: inset.top + 18, backgroundColor: t.isDarkMode ? '#141C2E' : '#EFF6FF', borderBottomColor: t.isDarkMode ? '#1E293B' : '#F1F5F9' }}
            className="px-5 pb-7"
          >
            <View style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: t.isDarkMode ? '#1D3461' : '#BFDBFE', opacity: 0.4 }} />
            <View className="flex-row items-start">
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} className="w-16 h-16 rounded-full" style={{ borderWidth: 2, borderColor: t.isDarkMode ? '#1D3461' : '#BFDBFE' }} />
              ) : (
                <View className="w-16 h-16 rounded-full bg-blue-600 items-center justify-center" style={{ borderWidth: 2, borderColor: t.isDarkMode ? '#1D3461' : '#BFDBFE' }}>
                  <Text className="text-white text-lg font-black">{initials}</Text>
                </View>
              )}

              <View className="ml-4 flex-1 pt-1">
                <View className="flex-row items-center">
                  <Text className={`text-xl font-black tracking-tight ${t.text}`} numberOfLines={1}>
                    {profile?.display_name?.trim() || "Guest User"}
                  </Text>
                  {profile?.id_verification_status === 'verified' && (
                    <View className="ml-2 bg-emerald-500 rounded-full px-1.5 py-0.5 flex-row items-center">
                      <MaterialCommunityIcons name="check" size={10} color="white" />
                    </View>
                  )}
                </View>
                <Text className={`mt-1 text-sm font-medium ${t.textMuted}`} numberOfLines={1}>
                  {email ?? 'Not signed in'}
                </Text>
                {profile?.location_label ? (
                  <View className="mt-2 flex-row items-center">
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color={t.icon} />
                    <Text className={`ml-1 text-xs font-semibold ${t.textMuted}`}>{profile.location_label}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        )}

        <View className="px-3 pt-4">
          {sections
            .filter((section) => !section.hidden)
            .map((section) => (
              <View key={section.title} className="mb-5">
                <Text className={`mb-2 px-3 text-[10px] font-black uppercase tracking-[2px] ${t.textMuted}`}>
                  {section.title}
                </Text>
                <View className="gap-1.5">
                  {section.items.map((item) => (
                    <DrawerItem key={item.label} {...item} />
                  ))}
                </View>
              </View>
            ))}
        </View>
      </DrawerContentScrollView>

      <View className="px-3" style={{ borderTopColor: t.isDarkMode ? '#1E293B' : '#F1F5F9', borderTopWidth: 1, paddingBottom: inset.bottom + 12, paddingTop: 12 }}>
        {currentUserId ? (
          <Pressable onPress={handleSignOut} className="flex-row items-center rounded-[20px] px-4 py-3.5 active:bg-red-50">
            <View className="h-10 w-10 rounded-2xl items-center justify-center" style={{ backgroundColor: t.isDarkMode ? '#1A2540' : '#F1F5F9' }}>
              <MaterialCommunityIcons name="logout-variant" size={20} color="#EF4444" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[14px] text-red-500 font-semibold">Sign Out</Text>
            </View>
          </Pressable>
        ) : (
          <View className="gap-2">
            <DrawerItem icon="login-variant" label="Sign In" href="/AuthenticationPage" color="#2563EB" />
          </View>
        )}
      </View>
    </View>
  );
}
