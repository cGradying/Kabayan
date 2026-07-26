import React, { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, Animated, RefreshControl } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { api, getStoredUser } from "@/utils/api";
import humanizeError from "@/utils/humanizeError";

type ApplicantRow = {
  job_id: string;
  job_title: string;
  application_id: string;
  applicant_id: string;
  applicant_name: string;
  applicant_avatar_url: string | null;
  cover_letter: string | null;
  expected_rate: number | string | null;
  status: string;
  applied_at: string;
  availability_note: string | null;
  resume_uri: string | null;
};

type EmployerJob = {
  id: string;
  title: string;
  status: string;
};

function ApplicantSkeleton({ t }: { t: ReturnType<typeof useTheme>["t"] }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  return (
    <Animated.View style={{ opacity }} className={`mb-5 rounded-3xl ${t.bgCard} border ${t.border} overflow-hidden`}>
      <View className={`px-5 py-4 border-b ${t.border}`}>
        <View className={`h-4 w-40 rounded-full ${t.bgSurface} mb-2`} />
        <View className={`h-3 w-24 rounded-full ${t.bgSurface}`} />
      </View>
      <View className="p-4 gap-3">
        {[1, 2].map((i) => (
          <View key={i} className={`p-4 rounded-2xl border ${t.border} ${t.bgSurface}`}>
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full ${t.bgCard}`} />
              <View className="ml-3 flex-1">
                <View className={`h-4 w-32 rounded-full ${t.bgCard} mb-2`} />
                <View className={`h-3 w-20 rounded-full ${t.bgCard}`} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

export default function JobApplicants() {
  const { t } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingChatFor, setOpeningChatFor] = useState<string | null>(null);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);
  const [employerJobs, setEmployerJobs] = useState<EmployerJob[]>([]);

  const loadApplicants = useCallback(async (isRefresh = false) => {
    let active = true;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const user = await getStoredUser();
      const employerId = user?.id;
      if (!employerId) {
        if (active) { setApplicants([]); if (!isRefresh) setLoading(false); setRefreshing(false); }
        return;
      }

      const jobs = await api.get<any[]>("/api/jobs");
      const myJobs = (jobs ?? []).filter((j: any) => j.employer_id === employerId);
      if (active) setEmployerJobs(myJobs.map((j: any) => ({ id: j.id, title: j.title, status: j.status })));

      const allApplicants: ApplicantRow[] = [];
      for (const job of myJobs) {
        try {
          const data = await api.get<any[]>(`/api/jobs/${job.id}/applicants`);
          for (const row of (data ?? [])) {
            allApplicants.push({
              job_id: row.job_id || job.id,
              job_title: row.job_title || job.title,
              application_id: row.application_id || row.id,
              applicant_id: row.applicant_id,
              applicant_name: row.applicant_name || "Unknown",
              applicant_avatar_url: row.applicant_avatar_url || null,
              cover_letter: row.cover_letter || null,
              expected_rate: row.expected_rate ?? null,
              status: row.status || "pending",
              applied_at: row.applied_at || row.created_at,
              availability_note: row.availability_note || null,
              resume_uri: row.resume_uri || null,
            });
          }
        } catch {
          // skip jobs that fail
        }
      }

      if (active) {
        const filtered = params.jobId
          ? allApplicants.filter((a) => a.job_id === params.jobId)
          : allApplicants;
        setApplicants(filtered);
      }
    } catch (err) {
      if (active) {
        const message = humanizeError(err, "Failed to load applicants.");
        Alert.alert("Applicants Error", message);
      }
    } finally {
      if (active) { setLoading(false); setRefreshing(false); }
    }

    return () => { active = false; };
  }, [params.jobId]);

  useFocusEffect(
    useCallback(() => { loadApplicants(); }, [loadApplicants])
  );

  const groupedByJob = useMemo(() => {
    const grouped = new Map<string, { jobId: string; jobTitle: string; applicants: ApplicantRow[] }>();
    applicants.forEach((row) => {
      if (!grouped.has(row.job_id)) {
        grouped.set(row.job_id, {
          jobId: row.job_id,
          jobTitle: row.job_title,
          applicants: [],
        });
      }
      grouped.get(row.job_id)?.applicants.push(row);
    });
    return Array.from(grouped.values());
  }, [applicants]);

  const openApplicantChat = async (row: ApplicantRow) => {
    if (openingChatFor) return;
    setOpeningChatFor(row.application_id);
    try {
      const data = await api.post<string>("/api/conversations/job", {
        job_id: row.job_id,
        employer_id: row.applicant_id,
      });
      if (!data) throw new Error("Unable to open conversation.");
      router.push({
        pathname: "/chatRoom/chatRoom",
        params: { roomId: data, name: row.applicant_name, jobTitle: row.job_title },
      });
    } catch (err) {
      const message = humanizeError(err, "Unable to message applicant.");
      Alert.alert("Message Failed", message);
    } finally {
      setOpeningChatFor(null);
    }
  };

  const updateApplicationStatus = async (row: ApplicantRow, status: "accepted" | "rejected") => {
    if (updatingApplicationId) return;
    setUpdatingApplicationId(row.application_id);
    try {
      const data = await api.patch<any>(`/api/applications/${row.application_id}/status`, { status });
      setApplicants((prev) =>
        prev.map((item) =>
          item.application_id === row.application_id
            ? { ...item, status: data?.status ?? status }
            : item
        )
      );
    } catch (err) {
      const message = humanizeError(err, "Unable to update application status.");
      Alert.alert("Update Failed", message);
    } finally {
      setUpdatingApplicationId(null);
    }
  };

  if (loading) {
    return (
      <View className={`flex-1 ${t.bgPage}`}>
        <View className={`px-6 pt-12 pb-4 border-b ${t.border} ${t.bgCard}`}>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 rounded-xl" accessibilityLabel="Go back" accessibilityRole="button">
              <Ionicons name="chevron-back" size={22} color={t.accent} />
            </TouchableOpacity>
            <View>
              <View className={`h-6 w-40 rounded-full ${t.bgSurface} mb-1`} />
              <View className={`h-3 w-52 rounded-full ${t.bgSurface}`} />
            </View>
          </View>
        </View>
        <View className="p-4">
          {[1, 2].map((i) => <ApplicantSkeleton key={i} t={t} />)}
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${t.bgPage}`}>
      <View className={`px-6 pt-12 pb-4 border-b ${t.border} ${t.bgCard}`}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 rounded-xl" accessibilityLabel="Go back" accessibilityRole="button">
            <Ionicons name="chevron-back" size={22} color={t.accent} />
          </TouchableOpacity>
          <View>
            <Text className={`text-2xl font-black ${t.text}`}>
              {params.jobId ? "Applicants For This Job" : "Job Applicants"}
            </Text>
            <Text className={`text-xs mt-1 ${t.textMuted}`}>
              {params.jobId ? "Review who applied to your posting." : "See who applied to your jobs and message them directly."}
            </Text>
          </View>
        </View>
      </View>

      {groupedByJob.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className={`w-20 h-20 rounded-[28px] ${t.brandSoft} items-center justify-center mb-4`}>
            <Feather name="users" size={36} color={t.accent} />
          </View>
          <Text className={`text-lg font-black text-center ${t.text}`}>
            {params.jobId ? "No applicants yet" : "No one has applied yet"}
          </Text>
          <Text className={`mt-2 text-sm text-center leading-5 ${t.textMuted}`}>
            {params.jobId
              ? "This job has no applications yet. It may still appear in search results."
              : "Post jobs and applicants will appear here grouped by posting."}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadApplicants(true)} tintColor={t.accent} colors={[t.accent]} />}
        >
          {groupedByJob.map((group) => (
            <View key={group.jobId} className={`mb-5 rounded-3xl border ${t.border} ${t.bgCard} overflow-hidden`}>
              <View className={`px-5 py-4 border-b ${t.border}`}>
                <Text className={`text-lg font-black ${t.text}`}>{group.jobTitle}</Text>
                <Text className={`text-xs ${t.textMuted}`}>{group.applicants.length} applicant{group.applicants.length === 1 ? "" : "s"}</Text>
              </View>
              <View className="p-4">
                {group.applicants.map((applicant) => (
                  <View key={applicant.application_id} className={`mb-3 p-4 rounded-2xl border ${t.border} ${t.bgSurface}`}>
                    <View className="flex-row items-start justify-between">
                      <View className="flex-row flex-1 pr-3">
                        {applicant.applicant_avatar_url ? (
                          <Image source={{ uri: applicant.applicant_avatar_url }} className="w-10 h-10 rounded-full" />
                        ) : (
                          <View className={`w-10 h-10 rounded-full ${t.brandBg} items-center justify-center`}>
                            <Text className="text-white font-black text-sm">{applicant.applicant_name.slice(0, 1).toUpperCase()}</Text>
                          </View>
                        )}
                        <View className="ml-3 flex-1">
                          <Text className={`text-sm font-black ${t.text}`}>{applicant.applicant_name}</Text>
                          <Text className={`text-[11px] ${t.textMuted}`}>Applied {new Date(applicant.applied_at).toLocaleDateString()}</Text>
                          {applicant.expected_rate !== null && applicant.expected_rate !== undefined ? (
                            <Text className={`text-[11px] mt-1 ${t.textMuted}`}>Expected rate: ₱{Number(applicant.expected_rate).toLocaleString()}</Text>
                          ) : null}
                        </View>
                      </View>
                      <View className={`px-2 py-1 rounded-lg border ${
                        applicant.status === "accepted"
                          ? `${t.successBg} ${t.brandBorder}`
                          : applicant.status === "rejected"
                          ? `${t.dangerBg} ${t.border}`
                          : `${t.warningBg} ${t.border}`
                      }`}>
                        <Text className={`text-[10px] font-black uppercase ${
                          applicant.status === "accepted"
                            ? t.success
                            : applicant.status === "rejected"
                            ? t.danger
                            : t.warning
                        }`}>{applicant.status}</Text>
                      </View>
                    </View>

                    {applicant.cover_letter ? (
                      <Text className={`text-xs mt-3 leading-5 ${t.textMuted}`}>{applicant.cover_letter}</Text>
                    ) : null}

                    <View className="mt-3 flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => updateApplicationStatus(applicant, "accepted")}
                        disabled={updatingApplicationId === applicant.application_id}
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: applicant.status === "accepted"
                            ? (t.isDarkMode ? "#065F46" : "#059669")
                            : (t.isDarkMode ? "#064E3B" : "#D1FAE5"),
                        }}
                      >
                        <Text className={`font-black text-xs uppercase tracking-widest ${
                          applicant.status === "accepted" ? "text-white" : t.success
                        }`}>
                          {updatingApplicationId === applicant.application_id && applicant.status !== "accepted" ? "Updating..." : "Accept"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => updateApplicationStatus(applicant, "rejected")}
                        disabled={updatingApplicationId === applicant.application_id}
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: applicant.status === "rejected"
                            ? (t.isDarkMode ? "#7F1D1D" : "#DC2626")
                            : (t.isDarkMode ? "#450A0A" : "#FEE2E2"),
                        }}
                      >
                        <Text className={`font-black text-xs uppercase tracking-widest ${
                          applicant.status === "rejected" ? "text-white" : t.danger
                        }`}>
                          {updatingApplicationId === applicant.application_id && applicant.status !== "rejected" ? "Updating..." : "Reject"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() => openApplicantChat(applicant)}
                      disabled={openingChatFor === applicant.application_id}
                      className={`mt-2 h-10 rounded-xl ${t.brandBg} items-center justify-center`}
                    >
                      <View className="flex-row items-center">
                        <Ionicons name="chatbubble-ellipses-outline" size={14} color="white" />
                        <Text className="ml-1 text-white font-black text-xs uppercase tracking-widest">
                          {openingChatFor === applicant.application_id ? "Opening..." : "Message Applicant"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
