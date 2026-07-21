import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme } from '@/hooks/useTheme';
import { api, getStoredUser, signOut } from '@/utils/api';
import AppFlashMessage from "@/components/CustomComponents/AppFlashMessage";
import useFlashMessage from "@/hooks/useFlashMessage";
import humanizeError from "@/utils/humanizeError";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ProfileData = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  id_verification_status: string;
  job_role: string;
  market_role: string;
  location_label: string | null;
};

const toTitleCase = (value?: string | null) =>
  (value ?? "")
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

export default function Profile () {
  const { t, toggleTheme } = useTheme();
  const insets =  useSafeAreaInsets()
  const router = useRouter();
  const { flashMessage, showFlashMessage, hideFlashMessage } = useFlashMessage();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [jobsCount, setJobsCount] = useState(0);
  const [listingsCount, setListingsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getStoredUser();
      const uid = user?.id;
      if (!uid) {
        setProfile(null);
        setJobsCount(0);
        setListingsCount(0);
        return;
      }

      const [profileData, jobsData, listingsData] = await Promise.all([
        api.get<any>(`/api/profiles/${uid}/drawer`).catch(() => null),
        api.get<any>("/api/counts/jobs").catch(() => null),
        api.get<any>("/api/counts/listings").catch(() => null),
      ]);

      setProfile(profileData as ProfileData | null);
      setJobsCount(Number(jobsData ?? 0));
      setListingsCount(Number(listingsData ?? 0));
    } catch (err) {
      const message = humanizeError(err, "Failed to load profile.");
      showFlashMessage("Profile Error", message, "error");
    } finally {
      setLoading(false);
    }
  }, [showFlashMessage]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/AuthenticationPage");
    } catch (err) {
      const message = humanizeError(err, "Unable to sign out.");
      showFlashMessage("Sign Out Failed", message, "error");
    } finally {
      setSigningOut(false);
    }
  };

  const verificationStatus = profile?.id_verification_status ?? "unverified";
  const verificationColor =
    verificationStatus === "verified"
      ? "#10b981"
      : verificationStatus === "pending_review"
      ? "#f59e0b"
      : "#94a3b8";

  const displayName = profile?.display_name?.trim() || "Guest User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "GU";
  const roleHeadline = [toTitleCase(profile?.job_role), toTitleCase(profile?.market_role)]
    .filter(Boolean)
    .join(" • ");
  const profileSummary =
    verificationStatus === "verified"
      ? "Your profile is verified and ready for hiring, selling, and community trust."
      : verificationStatus === "pending_review"
      ? "Your verification is under review. Keep your details complete while you wait."
      : "Complete your details and submit verification to build trust faster.";

  const profileStrength = useMemo(() => {
    const fields = [
      Boolean(profile?.display_name),
      Boolean(profile?.avatar_url),
      Boolean(profile?.location_label),
      Boolean(profile?.job_role),
      Boolean(profile?.market_role),
    ];
    const score = Math.round((fields.filter(Boolean).length / fields.length) * 100);
    return Math.max(20, score);
  }, [profile]);

  return (
    <View style={{paddingTop : insets.top, paddingBottom : insets.bottom}} className={`flex-1 ${t.bgPage}`}>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className={`mt-2 ${t.textMuted}`}>Loading…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
          <AppFlashMessage message={flashMessage} onClose={hideFlashMessage} />

          <View className={`mx-4 mt-5 rounded-[32px] overflow-hidden border ${t.border} ${t.bgCard}`}>
            <View className={`${t.brandBg} h-28`} />
            <View className="px-5 pb-5">
              <View className="-mt-11 flex-row items-end justify-between">
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} className="w-24 h-24 rounded-3xl border-4 border-white" />
                ) : (
                  <View className="w-24 h-24 rounded-3xl border-4 border-white bg-slate-200 items-center justify-center">
                    <Text className="text-slate-700 text-xl font-black">{initials}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={toggleTheme}
                  className={`mb-2 h-10 w-10 rounded-xl border ${t.border} ${t.bgSurface} items-center justify-center`}
                >
                  <Ionicons name={t.isDarkMode ? "moon" : "sunny"} size={16} color={t.icon} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity activeOpacity={0.88} onPress={() => router.push("/profile/ProfiletView")}>
                <Text className={`mt-3 text-[28px] font-black tracking-tight ${t.text}`}>{displayName}</Text>
                <Text className={`mt-1 text-sm font-semibold ${t.textMuted}`}>
                  {roleHeadline || "Complete your role and identity details"}
                </Text>
              </TouchableOpacity>

              <View className="mt-2 flex-row items-center">
                <Ionicons name="location-outline" size={14} color={t.icon} />
                <Text className={`ml-1 text-xs font-semibold ${t.textMuted}`}>
                  {profile?.location_label ?? "Set your location"}
                </Text>
              </View>

              <View className="mt-3 self-start px-3 py-1 rounded-full flex-row items-center" style={{ backgroundColor: `${verificationColor}1A` }}>
                <MaterialCommunityIcons
                  name={verificationStatus === "verified" ? "check-decagram" : "shield-half-full"}
                  size={14}
                  color={verificationColor}
                />
                <Text className="ml-1 text-[10px] font-black uppercase tracking-widest" style={{ color: verificationColor }}>
                  {toTitleCase(verificationStatus)}
                </Text>
              </View>

              <Text className={`mt-4 text-[13px] leading-5 ${t.textMuted}`}>{profileSummary}</Text>

              <View className="mt-5 flex-row gap-3">
                <QuickAction label="Edit Profile" subtitle="Update your public details" icon="create-outline" onPress={() => router.push("/profile/EditProfile")} />
                <QuickAction label="Verification" subtitle="Submit or review status" icon="shield-checkmark-outline" onPress={() => router.push("/Register")} />
                <QuickAction label="My Applications" subtitle="Track accepted, rejected, and pending jobs" icon="document-text-outline" onPress={() => router.push("/profile/MyApplications")} />
              </View>
            </View>
          </View>

          <View className={`mx-4 mt-4 p-5 rounded-3xl border ${t.border} ${t.bgCard}`}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className={`text-sm font-black uppercase tracking-widest ${t.textMuted}`}>Dashboard</Text>
                <Text className={`mt-1 text-[13px] ${t.textMuted}`}>Track profile strength, jobs, and listings at a glance.</Text>
              </View>
            </View>
            <View className="flex-row gap-3 mt-4">
              <StatCard label="Profile Strength" value={`${profileStrength}%`} icon="analytics-outline" t={t} />
              <StatCard label="Jobs Posted" value={`${jobsCount}`} icon="briefcase-outline" t={t} />
              <StatCard label="Listings" value={`${listingsCount}`} icon="storefront-outline" t={t} />
            </View>
            <View className={`mt-3 h-2 rounded-full ${t.bgSurface}`}>
              <View className="h-2 rounded-full bg-blue-600" style={{ width: `${profileStrength}%` }} />
            </View>
            <Text className={`mt-2 text-[11px] font-semibold ${t.textMuted}`}>
              Keep your profile complete to build trust with employers and buyers.
            </Text>
          </View>

          <SectionCard title="Career Network" t={t}>
            <SectionAction
              label="Job Applicants"
              subtitle="Review incoming applications and start employer chats."
              icon="people-outline"
              onPress={() => router.push("/profile/JobApplicants")}
              t={t}
            />
            <SectionAction
              label="People Connect"
              subtitle="Find workers and employers in your local community."
              icon="person-add-outline"
              onPress={() => router.push("/profile/PeopleConnect")}
              t={t}
            />
            <SectionAction
              label="My Applications"
              subtitle="See the current status of the jobs you applied for."
              icon="document-text-outline"
              onPress={() => router.push("/profile/MyApplications")}
              t={t}
            />
            <SectionAction
              label="Verification Center"
              subtitle="Submit documents or check your current review status."
              icon="shield-checkmark-outline"
              onPress={() => router.push("/Register")}
              t={t}
            />
          </SectionCard>

          <SectionCard title="Store Tools" t={t}>
            <SectionAction
              label="My Listings"
              subtitle="Manage your active store listings in one place."
              icon="storefront-outline"
              onPress={() => router.push({ pathname: "/marketPlace/marketPlaceView", params: { scope: "mine" } })}
              t={t}
            />
          </SectionCard>

          <SectionCard title="Account" t={t}>
            <SectionAction
              label={signingOut ? "Signing out..." : "Sign out"}
              subtitle="End this session on this device"
              icon="log-out-outline"
              onPress={handleSignOut}
              t={t}
              destructive
            />
          </SectionCard>
        </ScrollView>
      )}
    </View>
  );
}

function QuickAction({
  label,
  subtitle,
  icon,
  onPress,
}: {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 min-h-[110px] rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
      activeOpacity={0.88}
    >
      <View className="w-10 h-10 rounded-2xl bg-blue-50 items-center justify-center">
        <Ionicons name={icon} size={18} color="#2563EB" />
      </View>
      <Text className="mt-4 text-[12px] font-black uppercase tracking-[1.5px] text-slate-900">{label}</Text>
      <Text className="mt-2 text-[11px] leading-4 text-slate-500">{subtitle}</Text>
    </TouchableOpacity>
  );
}

function StatCard({
  label,
  value,
  icon,
  t,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  t: ReturnType<typeof useTheme>["t"];
}) {
  return (
    <View className={`flex-1 p-4 rounded-[24px] border ${t.border} ${t.bgSurface}`}>
      <View className="w-9 h-9 rounded-2xl bg-blue-50 items-center justify-center">
        <Ionicons name={icon} size={16} color="#2563EB" />
      </View>
      <Text className={`mt-4 text-xl font-black ${t.text}`}>{value}</Text>
      <Text className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>{label}</Text>
    </View>
  );
}

function SectionCard({
  title,
  children,
  t,
}: {
  title: string;
  children: React.ReactNode;
  t: ReturnType<typeof useTheme>["t"];
}) {
  return (
    <View className={`mx-4 mt-4 p-4 rounded-3xl border ${t.border} ${t.bgCard}`}>
      <Text className={`text-sm font-black uppercase tracking-widest ${t.textMuted}`}>{title}</Text>
      <View className="mt-2">{children}</View>
    </View>
  );
}

function SectionAction({
  label,
  subtitle,
  icon,
  onPress,
  t,
  destructive = false,
}: {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  t: ReturnType<typeof useTheme>["t"];
  destructive?: boolean;
}) {
  const iconColor = destructive ? "#DC2626" : "#2563EB";

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`mt-2 flex-row items-center justify-between p-4 rounded-2xl border ${t.border} ${t.bgSurface}`}
      activeOpacity={0.85}
    >
      <View className="flex-row items-start flex-1 pr-3">
        <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center">
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <View className="ml-3 flex-1">
          <Text className={`text-sm font-black ${destructive ? "text-red-600" : t.text}`}>{label}</Text>
          <Text className={`mt-1 text-[11px] font-semibold ${t.textMuted}`}>{subtitle}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
}
