import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable, Text, Image, TouchableOpacity } from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
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
};

export default function CustomDrawerContent(props: any) {
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
        title: "Manage",
        items: [
          {
            icon: "account-group-outline",
            label: `Job Applicants (${applicantCount})`,
            href: "/profile/JobApplicants",
            activeMatch: ["/profile/JobApplicants"],
          },
          {
            icon: "file-document-outline",
            label: "My Applications",
            href: "/profile/MyApplications",
            activeMatch: ["/profile/MyApplications"],
          },
          {
            icon: "store-edit-outline",
            label: `My Listings (${listingsCount})`,
            href: "/marketPlace/marketPlaceView?scope=mine",
            activeMatch: ["/marketPlace/marketPlaceView"],
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

  const DrawerItem = ({ icon, label, href, activeMatch = [], onPress, color = "#475569" }: DrawerItemConfig) => {
    const isActive = activeMatch.some((match) => pathname === match || pathname.startsWith(`${match}/`));

    return (
      <Pressable
        onPress={onPress ?? (href ? () => closeAndNavigate(href) : undefined)}
        className={`flex-row items-center rounded-[20px] px-4 py-3.5 ${isActive ? "bg-blue-50" : "active:bg-slate-100"}`}
      >
        <View className="h-10 w-10 rounded-2xl items-center justify-center bg-slate-50">
          <MaterialCommunityIcons name={icon} size={20} color={isActive ? "#2563EB" : color} />
        </View>
        <View className="ml-3 flex-1">
          <Text className={`text-[14px] ${isActive ? "text-blue-600 font-black" : "text-slate-700 font-semibold"}`}>
            {label}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 0, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={currentUserId ? () => closeAndNavigate("/profile") : undefined}
          className="px-5 pb-7 bg-slate-50 border-b border-slate-100"
          style={{ paddingTop: inset.top + 18 }}
        >
          <View className="flex-row items-start">
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} className="w-16 h-16 rounded-[22px] bg-slate-200" />
            ) : (
              <View className="w-16 h-16 rounded-[22px] bg-slate-200 items-center justify-center">
                <Text className="text-slate-700 text-lg font-black">{initials}</Text>
              </View>
            )}

            <View className="ml-4 flex-1 pt-1">
              <Text className="text-xl font-black text-slate-900 tracking-tight">
                {profile?.display_name?.trim() || "Guest User"}
              </Text>
              <Text className="mt-1 text-sm font-medium text-slate-500">{email}</Text>
              {profile?.location_label ? (
                <View className="mt-2 flex-row items-center">
                  <MaterialCommunityIcons name="map-marker-outline" size={14} color="#94A3B8" />
                  <Text className="ml-1 text-xs font-semibold text-slate-500">{profile.location_label}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>

        <View className="px-3 pt-4">
          {sections
            .filter((section) => !section.hidden)
            .map((section) => (
              <View key={section.title} className="mb-5">
                <Text className="mb-2 px-3 text-[10px] font-black uppercase tracking-[2px] text-slate-400">
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

      <View className="px-3 border-t border-slate-100" style={{ paddingBottom: inset.bottom + 12, paddingTop: 12 }}>
        {currentUserId ? (
          <DrawerItem icon="logout-variant" label="Sign Out" onPress={handleSignOut} color="#EF4444" />
        ) : (
          <View className="gap-2">
            <DrawerItem icon="login-variant" label="Sign In" href="/AuthenticationPage" color="#2563EB" />
          </View>
        )}
      </View>
    </View>
  );
}
