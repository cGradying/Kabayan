import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Pressable, Animated, RefreshControl, StyleProp, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { Feather, FontAwesome5, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import CustomMapComponents from "@/components/CustomComponents/CustomMapComponents";
import { useTheme } from "@/hooks/useTheme";
import { api, getStoredUser } from "@/utils/api";

type JobRow = {
  id: string;
  title: string;
  description?: string;
  location_label: string;
  budget_min: number;
  budget_max: number;
  is_urgent: boolean;
  status: string;
  created_at: string;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Magandang umaga";
  if (hour < 18) return "Magandang hapon";
  return "Magandang gabi";
};

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

export default function Home() {
  const router = useRouter();
  const { t } = useTheme();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const loadLatestJobs = async () => {
    setLoadingJobs(true);
    try {
      const data = await api.get<JobRow[]>("/api/jobs");
      setJobs(data);
    } catch {
      // silently fail
    }
    setLoadingJobs(false);
  };

  useEffect(() => {
    loadLatestJobs();
  }, []);

  const latestJobs = useMemo(() => {
    return jobs.filter((job) => job.status === "open").slice(0, 6);
  }, [jobs]);

  return (
    <View className={`flex-1 ${t.bgPage}`}>
      <View className="pt-4 px-[5%]">
        <View className={`flex-row items-center h-12 px-4 rounded-2xl border ${t.border} bg-gray-200`}
          style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}
        >
          <Pressable onPress={() => router.push("/search/search")} className="flex-1 h-full flex-row items-center" accessibilityLabel="Search" accessibilityRole="button">
            <Feather name="search" color={t.icon} size={16} />
            <Text className={`ml-3 text-sm font-medium `}>Search jobs, vendors, people…</Text>
          </Pressable>

          <View style={{ width: 1, height: 24, marginHorizontal: 12, backgroundColor: t.isDarkMode ? '#1E293B' : '#E2E8F0' }} />

          <Pressable onPress={() => router.push("/map/mapView")} className="p-1 active:opacity-50" accessibilityLabel="View map" accessibilityRole="button">
            <FontAwesome5 name="map-marked-alt" color={t.accent} size={17} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-[5%] mt-5"
        refreshControl={
          <RefreshControl
            refreshing={loadingJobs}
            onRefresh={loadLatestJobs}
            tintColor="#2563EB"
            colors={["#2563EB"]}
          />
        }
      >
        <View className="mb-5">
          <Text className={`text-[11px] font-black uppercase tracking-widest ${t.textMuted}`}>
            {getGreeting()} 🇵🇭
          </Text>
          <Text className={`text-2xl font-black tracking-tight mt-1 ${t.text}`}>
            {displayName ? `Kumusta, ${displayName.split(' ')[0]}!` : 'Nearby Opportunities'}
          </Text>
        </View>

        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <View className="w-1 h-4 bg-amber-500 rounded-full mr-2" />
              <Text className={`text-sm font-black ${t.text}`}>Quick Actions</Text>
            </View>
            <Text className={`text-[11px] font-semibold ${t.textMuted}`}>Move faster</Text>
          </View>

          <View className="flex-row gap-3 mb-3">
            <QuickActionCard icon="briefcase-outline" label="Post Job" subtitle="Create a hiring post" onPress={() => router.push("/jobs")} t={t} style={{ flex: 1 }} />
            <QuickActionCard icon="storefront-outline" label="My Stores" subtitle="Manage store listings" onPress={() => router.push({ pathname: "/marketPlace/marketPlaceView", params: { scope: "mine" } })} t={t} style={{ flex: 1 }} />
          </View>
          <View className="flex-row gap-3">
            <QuickActionCard icon="shield-checkmark-outline" label="Verify" subtitle="Submit account review" onPress={() => router.push("/Register")} t={t} style={{ flex: 1 }} />
            <QuickActionCard icon="people-outline" label="Applicants" subtitle="Review incoming workers" onPress={() => router.push("/profile/JobApplicants")} t={t} style={{ flex: 1 }} />
          </View>
        </View>

        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <View className="w-1 h-4 bg-blue-600 rounded-full mr-2" />
              <Text className={`text-sm font-black ${t.text}`}>Community Map</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/map/mapView")}
              className="flex-row items-center"
            >
              <Text className={`text-xs font-bold ${t.brand}`}>Explore</Text>
              <Feather name="chevron-right" size={14} color={t.accent} />
            </TouchableOpacity>
          </View>

          <Pressable
            onPress={() => router.push("/map/mapView")}
            className={`h-52 rounded-[28px] overflow-hidden border ${t.border}`}
            style={{ elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
          >
            <CustomMapComponents mode="preview" />
          </Pressable>
        </View>

        <View className="mb-10">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <View className="w-1 h-4 bg-emerald-500 rounded-full mr-2" />
              <Text className={`text-sm font-black ${t.text}`}>Latest Jobs</Text>
            </View>
            <TouchableOpacity onPress={loadLatestJobs} className="flex-row items-center">
              <Ionicons name="refresh" size={14} color={t.icon} />
              <Text className={`text-xs font-bold ml-1 ${t.textMuted}`}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingJobs ? (
            <>
              <JobCardSkeleton t={t} />
              <JobCardSkeleton t={t} />
              <JobCardSkeleton t={t} />
            </>
          ) : latestJobs.length === 0 ? (
            <View className={`mx-0 p-8 rounded-[28px] border ${t.border} ${t.bgCard} items-center`}>
              <View className={`w-20 h-20 rounded-[28px] ${t.brandSoft} items-center justify-center mb-4`}>
                <Ionicons name="briefcase-outline" size={36} color={t.accent} />
              </View>
              <Text className={`text-lg font-black text-center ${t.text}`}>Walang trabaho pa</Text>
              <Text className={`mt-2 text-sm text-center leading-5 ${t.textMuted}`}>Check back soon or post your own.</Text>
              <TouchableOpacity
                onPress={() => router.push("/jobs")}
                className={`mt-5 px-6 py-3 rounded-2xl ${t.brandBg}`}
              >
                <Text className="text-white font-black text-xs uppercase tracking-widest">Post a Job</Text>
              </TouchableOpacity>
            </View>
          ) : (
            latestJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                onPress={() => router.push({ pathname: "/job/JobView", params: { jobId: job.id } })}
                className={`p-4 mb-3 rounded-[20px] ${t.bgCard} border ${t.border} relative overflow-hidden`}
                activeOpacity={0.85}
                style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
              >
                {job.is_urgent && (
                  <View className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-red-500" />
                )}
                <View className="flex-row items-start justify-between pl-3">
                  <View className="flex-1 pr-3">
                    <Text className={`text-base font-black ${t.text}`}>{job.title}</Text>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="location-outline" size={12} color={t.icon} />
                      <Text className={`ml-1 text-[11px] font-semibold ${t.textMuted}`}>{job.location_label}</Text>
                    </View>
                  </View>
                  <Text className={`${t.price} text-xs font-black`}>{formatBudget(job.budget_min, job.budget_max)}</Text>
                </View>

                <View className="mt-3 flex-row justify-between items-center pl-3">
                  <View className={`self-start px-2 py-1 rounded-md ${job.is_urgent ? t.dangerBg : t.successBg}`}>
                    <Text className={`font-black text-[10px] uppercase tracking-widest ${job.is_urgent ? t.danger : t.success}`}>
                      {job.is_urgent ? "Urgent" : "Open"}
                    </Text>
                  </View>
                  <Text className={`text-[10px] font-bold ${t.textMuted}`}>{formatTime(job.created_at)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          {latestJobs.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push("/jobs")}
              className={`mt-1 py-3 rounded-[20px] border ${t.brandBorder} ${t.brandSoft} items-center`}
            >
              <Text className={`${t.brand} text-xs font-black uppercase tracking-widest`}>View All Jobs</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const formatBudget = (min: number, max: number) => {
  if (!min && !max) return "N/A";
  if (min === max) return `₱${min.toLocaleString()}`;
  return `₱${min.toLocaleString()} – ₱${max.toLocaleString()}`;
};

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
};

function QuickActionCard({
  icon,
  label,
  subtitle,
  onPress,
  t,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  onPress: () => void;
  t: any;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`rounded-[22px] border px-4 py-4 ${t.border} ${t.bgCard}`}
      activeOpacity={0.88}
      style={style}
    >
      <View className={`w-10 h-10 rounded-2xl ${t.brandSoft} items-center justify-center`}>
        <Ionicons name={icon} size={18} color={t.accent} />
      </View>
      <Text className={`mt-4 text-sm font-black ${t.text}`}>{label}</Text>
      <Text className={`mt-1 text-[11px] leading-4 ${t.textMuted}`}>{subtitle}</Text>
    </TouchableOpacity>
  );
}
