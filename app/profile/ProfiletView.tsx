import React, { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { api, getStoredUser } from "@/utils/api";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  job_role: string | null;
  id_verification_status: string;
  location_label: string | null;
  created_at: string;
};

export default function ProfileView() {
  const { t } = useTheme();
  const router = useRouter();
  const inset = useSafeAreaInsets()
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const user = await getStoredUser();
      const uid = user?.id;
      if (!uid) {
        if (active) setLoading(false);
        return;
      }
      try {
        const data = await api.get<any>(`/api/profiles/${uid}`);
        if (active) {
          setProfile(data ?? null);
        }
      } catch {
        // silently fail
      }
      if (active) setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const badgeColor =
    profile?.id_verification_status === "verified"
      ? "#10b981"
      : profile?.id_verification_status === "pending_review"
      ? "#f59e0b"
      : "#94a3b8";

  if (loading) {
    return (
      <View className={`flex-1 items-center justify-center ${t.bgPage}`}>
        <ActivityIndicator />
        <Text className={`mt-2 ${t.textMuted}`}>Loading profile…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{paddingTop : inset.top}} className={`flex-1 items-center justify-center ${t.bgPage}`}>
        <Text className={`text-base font-semibold ${t.text}`}>No profile found</Text>
      </View>
    );
  }


  return (
    <View style={{ paddingTop: inset.top }} className={`flex-1 ${t.bgPage}`}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: inset.bottom + 28 }}>
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className={`h-11 w-11 rounded-2xl border ${t.border} ${t.bgCard} items-center justify-center`}
          >
            <Feather name="chevron-left" size={20} color={t.icon} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/profile/EditProfile")}
            className="h-11 px-4 rounded-2xl bg-blue-600 items-center justify-center"
          >
            <Text className="text-white text-[11px] font-black uppercase tracking-widest">Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View className={`rounded-[32px] overflow-hidden border ${t.border} ${t.bgCard}`}>
          <View className="h-28 bg-blue-600/90" />
          <View className="px-5 pb-5">
            <View className="-mt-11 flex-row items-end justify-between">
              <Image
                source={{
                  uri:
                    profile.avatar_url ??
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
                }}
                className="w-24 h-24 rounded-3xl border-4 border-white"
              />
              <View
                className="px-3 py-2 rounded-2xl flex-row items-center"
                style={{ backgroundColor: `${badgeColor}1A` }}
              >
                <Ionicons
                  name={profile.id_verification_status === "verified" ? "shield-checkmark" : "shield-half"}
                  size={15}
                  color={badgeColor}
                />
                <Text className="ml-1 text-[10px] font-black uppercase tracking-widest" style={{ color: badgeColor }}>
                  {profile.id_verification_status.replace("_", " ")}
                </Text>
              </View>
            </View>

            <Text className={`mt-4 text-[28px] font-black tracking-tight ${t.text}`}>
              {profile.display_name ?? "New User"}
            </Text>
            <Text className={`mt-1 text-sm font-semibold ${t.textMuted}`}>
              {profile.job_role ?? "Worker"} • {profile.location_label ?? "Location unknown"}
            </Text>
            <Text className={`mt-4 text-[13px] leading-5 ${t.textMuted}`}>
              {profile.id_verification_status === "verified"
                ? "Your account is verified and ready for trusted hiring and marketplace activity."
                : profile.id_verification_status === "pending_review"
                ? "Your documents are in review. You can keep improving your profile while you wait."
                : "Your profile is live, but verification will help you look more trustworthy to buyers and employers."}
            </Text>
          </View>
        </View>

        <View className={`mt-4 p-5 rounded-[28px] border ${t.border} ${t.bgCard}`}>
          <Text className={`text-[11px] font-black uppercase tracking-[2px] ${t.textMuted}`}>Profile Actions</Text>
          <View className="mt-4 gap-3">
            <ActionRow
              label="Verification"
              subtitle="Submit requirements or review your current status"
              icon="shield-checkmark-outline"
              onPress={() => router.push("/Register")}
              t={t}
            />
            <ActionRow
              label="My Applications"
              subtitle="Track the status of jobs you applied for"
              icon="document-text-outline"
              onPress={() => router.push("/profile/MyApplications")}
              t={t}
            />
            <ActionRow
              label="My Listings"
              subtitle="Open and manage your store listings"
              icon="storefront-outline"
              onPress={() => router.push({ pathname: "/marketPlace/marketPlaceView", params: { scope: "mine" } })}
              t={t}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ActionRow({
  label,
  subtitle,
  icon,
  onPress,
  t,
}: {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  t: ReturnType<typeof useTheme>["t"];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      className={`flex-row items-center rounded-[24px] border ${t.border} ${t.bgSurface} p-4`}
    >
      <View className="h-11 w-11 rounded-2xl bg-blue-50 items-center justify-center">
        <Ionicons name={icon} size={18} color="#2563EB" />
      </View>
      <View className="ml-3 flex-1 pr-3">
        <Text className={`text-sm font-black ${t.text}`}>{label}</Text>
        <Text className={`mt-1 text-[11px] leading-4 ${t.textMuted}`}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
}
