import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Feather, FontAwesome5, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import CustomMapComponents from "@/components/CustomComponents/CustomMapComponents";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/utils/api";

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
  if (hour < 12) return "Magandang umaga"; // Good morning
  if (hour < 18) return "Magandang hapon"; // Good afternoon
  return "Magandang gabi"; // Good evening
};

export default function Home() {
  const router = useRouter();
  const { t } = useTheme();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const loadLatestJobs = async () => {
    setLoadingJobs(true);
    try {
      const data = await api.get<JobRow[]>("/api/jobs");
      setJobs(data);
    } catch {
      // silently fail — data will remain empty
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
      {/* Search bar */}
      <View className="pt-4 px-[5%]">
        <View className={`flex-row items-center h-12 px-4 rounded-2xl border ${t.border} ${t.bgSurface}`}
          style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}
        >
          <Pressable onPress={() => router.push("/search/search")} className="flex-1 h-full flex-row items-center">
            <Feather name="search" color={t.icon} size={16} />
            <Text className={`ml-3 text-sm font-medium ${t.textMuted}`}>Search jobs, vendors, people…</Text>
          </Pressable>

          <View className={`w-[1px] h-6 mx-3 ${t.border}`} style={{ backgroundColor: t.isDarkMode ? '#1E293B' : '#E2E8F0' }} />

          <Pressable onPress={() => router.push("/map/mapView")} className="p-1 active:opacity-50">
            <FontAwesome5 name="map-marked-alt" color={t.accent} size={17} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-[5%] mt-5">
        {/* Greeting hero */}
        <View className="mb-5">
          <Text className={`text-[11px] font-black uppercase tracking-widest ${t.textMuted}`}>
            {getGreeting()} 🇵🇭
          </Text>
          <Text className={`text-2xl font-black tracking-tight mt-1 ${t.text}`}>
            Nearby Opportunities
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

          <View className="flex-row flex-wrap justify-between">
            <QuickActionCard icon="briefcase-outline" label="Post Job" subtitle="Create a hiring post" onPress={() => router.push("/jobs")} t={t} />
            <QuickActionCard icon="storefront-outline" label="My Stores" subtitle="Manage store listings" onPress={() => router.push({ pathname: "/marketPlace/marketPlaceView", params: { scope: "mine" } })} t={t} />
            <QuickActionCard icon="shield-checkmark-outline" label="Verify" subtitle="Submit account review" onPress={() => router.push("/Register")} t={t} />
            <QuickActionCard icon="people-outline" label="Applicants" subtitle="Review incoming workers" onPress={() => router.push("/profile/JobApplicants")} t={t} />
          </View>
        </View>

        {/* Map preview card */}
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
              <Feather name="chevron-right" size={14} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <Pressable
            onPress={() => router.push("/map/mapView")}
            className="h-52 rounded-[28px] overflow-hidden border border-slate-200"
            style={{ elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
          >
            <CustomMapComponents mode="preview" />
          </Pressable>
        </View>

        {/* Latest jobs section */}
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
            <View className={`p-6 rounded-[24px] ${t.bgCard} border ${t.border} items-center`}>
              <ActivityIndicator color="#2563EB" />
              <Text className={`mt-2 text-xs ${t.textMuted}`}>Loading jobs…</Text>
            </View>
          ) : latestJobs.length === 0 ? (
            <View className={`p-6 rounded-[24px] ${t.bgCard} border ${t.border} items-center`}>
              <Feather name="briefcase" size={28} color={t.icon} />
              <Text className={`text-sm font-semibold ${t.text} mt-3`}>No open jobs</Text>
              <Text className={`mt-1 text-xs ${t.textMuted}`}>Check back soon or post your own.</Text>
            </View>
          ) : (
            latestJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                onPress={() => router.push({ pathname: "/job/JobView", params: { jobId: job.id } })}
                className={`p-4 mb-3 rounded-[20px] ${t.bgCard} border ${t.border}`}
                activeOpacity={0.85}
                style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className={`text-base font-black ${t.text}`}>{job.title}</Text>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="location-outline" size={12} color={t.icon} />
                      <Text className={`ml-1 text-[11px] font-semibold ${t.textMuted}`}>{job.location_label}</Text>
                    </View>
                  </View>
                  <Text className="text-emerald-600 text-xs font-black">{formatBudget(job.budget_min, job.budget_max)}</Text>
                </View>

                <View className="mt-3 flex-row justify-between items-center">
                  <View className={`flex-row items-center px-2 py-1 rounded-lg ${job.is_urgent ? "bg-red-50" : "bg-blue-50"}`}>
                    <MaterialCommunityIcons
                      name={job.is_urgent ? "lightning-bolt" : "briefcase-outline"}
                      size={12}
                      color={job.is_urgent ? "#DC2626" : "#2563EB"}
                    />
                    <Text className={`ml-1 text-[9px] font-black uppercase ${job.is_urgent ? "text-red-600" : "text-blue-600"}`}>
                      {job.is_urgent ? "Urgent" : job.status}
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
              className="mt-1 py-3 rounded-[20px] border border-blue-100 bg-blue-50 items-center"
            >
              <Text className="text-blue-600 text-xs font-black uppercase tracking-widest">View All Jobs</Text>
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  onPress: () => void;
  t: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`mb-3 w-[48%] rounded-[22px] border px-4 py-4 ${t.border} ${t.bgCard}`}
      activeOpacity={0.88}
    >
      <View className="w-10 h-10 rounded-2xl bg-blue-50 items-center justify-center">
        <Ionicons name={icon} size={18} color="#2563EB" />
      </View>
      <Text className={`mt-4 text-sm font-black ${t.text}`}>{label}</Text>
      <Text className={`mt-1 text-[11px] leading-4 ${t.textMuted}`}>{subtitle}</Text>
    </TouchableOpacity>
  );
}
