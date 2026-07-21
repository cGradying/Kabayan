import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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

export default function JobApplicants() {
  const { t } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const [rows, setRows] = useState<ApplicantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingChatFor, setOpeningChatFor] = useState<string | null>(null);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);

  const loadApplicants = useCallback(async () => {
    let active = true;
    try {
      setLoading(true);
      const user = await getStoredUser();
      const employerId = user?.id;
      if (!employerId) {
        if (active) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      const data = await api.get<any[]>("/api/applications");

      if (active) {
        const nextRows = (data ?? []) as ApplicantRow[];
        setRows(params.jobId ? nextRows.filter((row) => row.job_id === params.jobId) : nextRows);
      }
    } catch (err) {
      if (active) {
        const message = humanizeError(err, "Failed to load applicants.");
        Alert.alert("Applicants Error", message);
      }
    } finally {
      if (active) setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [params.jobId]);

  useFocusEffect(
    useCallback(() => {
      loadApplicants();
    }, [loadApplicants])
  );

  const groupedByJob = useMemo(() => {
    const grouped = new Map<string, { jobId: string; jobTitle: string; applicants: ApplicantRow[] }>();
    rows.forEach((row) => {
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
  }, [rows]);

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
        params: {
          roomId: data,
          name: row.applicant_name,
          jobTitle: row.job_title,
        },
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

      setRows((prev) =>
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
      <View className={`flex-1 items-center justify-center ${t.bgPage}`}>
        <ActivityIndicator />
        <Text className={`mt-2 ${t.textMuted}`}>Loading applicants…</Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${t.bgPage}`}>
      <View className={`px-6 pt-12 pb-4 border-b ${t.border} ${t.bgCard}`}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 rounded-xl">
            <Ionicons name="chevron-back" size={22} color={t.text} />
          </TouchableOpacity>
          <View>
            <Text className={`text-2xl font-black ${t.text}`}>{params.jobId ? "Applicants For This Job" : "Job Applicants"}</Text>
            <Text className={`text-xs mt-1 ${t.textMuted}`}>
              {params.jobId ? "Review applicants for this posting and message them directly." : "See who applied and contact them directly."}
            </Text>
          </View>
        </View>
      </View>

      {groupedByJob.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className={`text-base font-semibold ${t.text}`}>No applicants yet</Text>
          <Text className={`text-xs mt-2 text-center ${t.textMuted}`}>
            {params.jobId ? "This job has no applications yet." : "Post jobs and applicants will appear here."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
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
                          <Image source={{ uri: applicant.applicant_avatar_url }} className="w-10 h-10 rounded-xl" />
                        ) : (
                          <View className="w-10 h-10 rounded-xl bg-slate-200 items-center justify-center">
                            <Text className="text-slate-700 font-black">{applicant.applicant_name.slice(0, 1).toUpperCase()}</Text>
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
                          ? "bg-emerald-50 border-emerald-200"
                          : applicant.status === "rejected"
                          ? "bg-rose-50 border-rose-200"
                          : "bg-blue-50 border-blue-200"
                      }`}>
                        <Text className={`text-[10px] font-black uppercase ${
                          applicant.status === "accepted"
                            ? "text-emerald-700"
                            : applicant.status === "rejected"
                            ? "text-rose-700"
                            : "text-blue-700"
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
                        className={`flex-1 h-10 rounded-xl items-center justify-center ${
                          applicant.status === "accepted" ? "bg-emerald-600" : "bg-emerald-100"
                        }`}
                      >
                        <Text className={`font-black text-xs uppercase tracking-widest ${
                          applicant.status === "accepted" ? "text-white" : "text-emerald-700"
                        }`}>
                          {updatingApplicationId === applicant.application_id && applicant.status !== "accepted" ? "Updating..." : "Accept"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => updateApplicationStatus(applicant, "rejected")}
                        disabled={updatingApplicationId === applicant.application_id}
                        className={`flex-1 h-10 rounded-xl items-center justify-center ${
                          applicant.status === "rejected" ? "bg-rose-600" : "bg-rose-100"
                        }`}
                      >
                        <Text className={`font-black text-xs uppercase tracking-widest ${
                          applicant.status === "rejected" ? "text-white" : "text-rose-700"
                        }`}>
                          {updatingApplicationId === applicant.application_id && applicant.status !== "rejected" ? "Updating..." : "Reject"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() => openApplicantChat(applicant)}
                      disabled={openingChatFor === applicant.application_id}
                      className="mt-2 h-10 rounded-xl bg-blue-600 items-center justify-center"
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
