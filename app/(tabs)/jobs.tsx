import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text, View, Pressable, TouchableOpacity, RefreshControl, Animated } from "react-native";
import { useRouter } from "expo-router";
import { LegendList } from "@legendapp/list";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/utils/api";
import JobModal from "@/components/JobComponents/JobModal";
import CustomSearchComponent from "@/components/CustomComponents/CustomSearchComponent";

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

export default function Jobs() {
  const { t } = useTheme();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>("/api/jobs");
      setJobs(data);
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const mappedJobs = useMemo(
    () =>
      jobs.map((job) => ({
        ...job,
        type: job.is_urgent ? "Urgent" : job.status,
        salary: formatBudget(job.budget_min, job.budget_max),
        posted: formatTime(job.created_at),
        company: job.location_label,
        location: job.location_label,
      })),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mappedJobs;
    return mappedJobs.filter((job) => {
      return (
        (job.title ?? "").toLowerCase().includes(q) ||
        (job.location_label ?? "").toLowerCase().includes(q) ||
        (job.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [mappedJobs, search]);

  return (
    <View className={`flex-1 ${t.bgPage}`}>
      <View className={`px-4 pt-4 pb-3 ${t.bgCard} border-b ${t.border}`}>
        <CustomSearchComponent
          value={search}
          onSearch={setSearch}
          placeholder="Search jobs by title, location, or description"
          onNavigateToMap={() => router.push("/map/mapView")}
        />
      </View>
      {loading ? (
        <View className="flex-1 px-4 pt-4">
          <JobCardSkeleton t={t} />
          <JobCardSkeleton t={t} />
          <JobCardSkeleton t={t} />
        </View>
      ) : (
        <>
          <LegendList
            data={filteredJobs}
            keyExtractor={(item) => item.id}
            estimatedItemSize={120}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 140 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadJobs} tintColor="#2563EB" colors={["#2563EB"]} />}
            ListEmptyComponent={
              <View className={`mx-0 mt-4 p-8 rounded-[28px] border ${t.border} ${t.bgCard} items-center`}>
                <View className={`w-20 h-20 rounded-[28px] ${t.brandSoft} items-center justify-center mb-4`}>
                  <Ionicons name={search.trim() ? "search-outline" : "briefcase-outline"} size={36} color={t.accent} />
                </View>
                <Text className={`text-lg font-black text-center ${t.text}`}>
                  {search.trim() ? "No matches found" : "No open jobs yet"}
                </Text>
                <Text className={`mt-2 text-sm text-center leading-5 ${t.textMuted}`}>
                  {search.trim() ? "Try a different title or location." : "Check back soon, or be the first to post one."}
                </Text>
                {!search.trim() && (
                  <TouchableOpacity
                    onPress={() => setShowModal(true)}
                    className={`mt-5 px-6 py-3 rounded-2xl ${t.brandBg}`}
                  >
                    <Text className="text-white font-black text-xs uppercase tracking-widest">Post a Job</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            renderItem={({ item }) => <JobCard job={item} t={t} />}
          />
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            className={`absolute bottom-6 right-6 flex-row items-center px-5 h-14 rounded-full shadow-lg shadow-blue-500/30 ${t.brandBg}`}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={22} color="white" />
            <Text className="text-white font-black text-xs ml-2 uppercase tracking-widest">Post Job</Text>
          </TouchableOpacity>
          <JobModal
            visible={showModal}
            onClose={() => setShowModal(false)}
            onCreated={(newJob?: JobRow) => {
              setShowModal(false);
              if (newJob) {
                setJobs((prev) => [newJob, ...prev]);
              } else {
                loadJobs();
              }
            }}
          />
        </>
      )}
    </View>
  );
}

function JobCard({ job, t }: { job: any; t: any }) {
  const router = useRouter();
  const badgeConfig = job.is_urgent
    ? { bg: 'bg-red-50', text: 'text-red-600', label: 'Urgent' }
    : job.status === 'open'
    ? { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Open' }
    : { bg: 'bg-slate-100', text: 'text-slate-500', label: job.status };

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/job/JobView", params: { jobId: job.id } })}
      className={`p-5 rounded-[24px] mb-4 ${t.bgCard} border ${t.border} shadow-sm`}
      accessibilityRole="button"
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <View className={`self-start px-2 py-1 rounded-md mb-2 ${badgeConfig.bg}`}>
            <Text className={`font-black text-[9px] uppercase tracking-widest ${badgeConfig.text}`}>
              {badgeConfig.label}
            </Text>
          </View>
          <Text className={`text-lg font-black tracking-tight ${t.text}`}>{job.title}</Text>
          <Text className={`text-xs font-bold ${t.brand} mt-1`}>{job.company}</Text>
        </View>
        <Text className={`${t.price} font-black text-lg`}>{job.salary}</Text>
      </View>

      <View className={`mt-4 pt-4 border-t ${t.border} flex-row justify-between items-center`}>
        <View className="flex-row items-center">
          <MaterialIcons name="location-on" size={14} color={t.icon} />
          <Text className={`text-[11px] font-bold ml-1 ${t.textMuted}`}>{job.location}</Text>
        </View>
        <Text className={`text-[10px] font-bold ${t.textMuted}`}>{job.posted}</Text>
      </View>
    </Pressable>
  );
}

const formatBudget = (min: number, max: number) => {
  if (!min && !max) return "N/A";
  if (min === max) return `₱${min.toLocaleString()}`;
  return `₱${min.toLocaleString()} - ₱${max.toLocaleString()}`;
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
