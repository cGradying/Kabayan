import React, { useEffect, useMemo, useState } from "react";
import { Text, View, Pressable, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { LegendList } from "@legendapp/list";
import { MaterialIcons } from "@expo/vector-icons";
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
      <View className="px-4 pt-5 pb-3">
        <CustomSearchComponent
          value={search}
          onSearch={setSearch}
          placeholder="Search jobs by title, location, or description"
          onNavigateToMap={() => router.push("/map/mapView")}
        />
      </View>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className={`mt-2 ${t.textMuted}`}>Loading jobs…</Text>
        </View>
      ) : (
        <>
          <LegendList
            data={filteredJobs}
            keyExtractor={(item) => item.id}
            estimatedItemSize={120}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadJobs} />}
            ListEmptyComponent={
              <View className="py-16 items-center">
                <Text className={`text-sm ${t.textMuted}`}>
                  {search.trim() ? "No jobs match your search" : "No jobs available"}
                </Text>
              </View>
            }
            renderItem={({ item }) => <JobCard job={item} t={t} />}
          />
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            className="absolute bottom-6 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg shadow-blue-500/30"
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={26} color="white" />
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
  return (
    <Pressable onPress={() => router.push({ pathname: "/job/JobView", params: { jobId: job.id } })} className={`p-5 rounded-[24px] mb-4 ${t.bgCard} border ${t.border} shadow-sm`}>
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <View className="bg-red-50 self-start px-2 py-1 rounded-md mb-2">
            <Text className="text-red-600 font-black text-[9px] uppercase tracking-widest">{job.type}</Text>
          </View>
          <Text className={`text-lg font-black tracking-tight ${t.text}`}>{job.title}</Text>
          <Text className={`text-xs font-bold ${t.brand} mt-1`}>{job.company}</Text>
        </View>
        <Text className="text-emerald-600 font-black text-lg">{job.salary}</Text>
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
