import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { api, getStoredUser } from "@/utils/api";
import AppFlashMessage from "@/components/CustomComponents/AppFlashMessage";
import useFlashMessage from "@/hooks/useFlashMessage";
import JobEditModal from "@/components/JobComponents/JobEditModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import humanizeError from "@/utils/humanizeError";
import EntityHeroBanner from "@/components/CustomComponents/EntityHeroBanner";

type ApplicantPreviewRow = {
  job_id: string;
  application_id: string;
  applicant_id: string;
  applicant_name: string;
  applicant_avatar_url: string | null;
  applied_at: string;
  status: string;
};

export default function JobView() {
  const { t } = useTheme();
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [applicants, setApplicants] = useState<ApplicantPreviewRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const inset = useSafeAreaInsets();
  const { flashMessage, showFlashMessage, hideFlashMessage } = useFlashMessage();
  const isClosed = job?.status !== "open";
  const isOwner = currentUserId === job?.employer_id;
  const budgetLabel = useMemo(() => {
    const min = Number(job?.budget_min ?? 0);
    const max = Number(job?.budget_max ?? 0);
    if (min > 0 && max > 0 && min !== max) return `₱${min.toLocaleString()} - ₱${max.toLocaleString()}`;
    if (max > 0) return `₱${max.toLocaleString()}`;
    if (min > 0) return `₱${min.toLocaleString()}`;
    return "Budget on request";
  }, [job?.budget_max, job?.budget_min]);

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) return;
      setLoading(true);
      try {
        const data = await api.get<any>(`/api/jobs/${jobId}`);
        if (data) setJob(data);
      } catch {
        // silently fail
      }
      setLoading(false);
    };
    fetchJob();
    getStoredUser().then((user) => setCurrentUserId(user?.id ?? null));
  }, [jobId]);

  useEffect(() => {
    const fetchApplicationState = async () => {
      if (!job?.id || !currentUserId || currentUserId === job.employer_id) {
        setHasApplied(false);
        return;
      }

      try {
        const data = await api.get<any>(`/api/jobs/${job.id}/applicants`);
        const apps = Array.isArray(data) ? data : [];
        const mine = apps.find((a: any) => a.applicant_id === currentUserId);
        setHasApplied(Boolean(mine));
      } catch {
        setHasApplied(false);
      }
    };

    fetchApplicationState();
  }, [currentUserId, job?.employer_id, job?.id]);

  useEffect(() => {
    const fetchApplicants = async () => {
      if (!job?.id || !currentUserId || currentUserId !== job.employer_id) {
        setApplicants([]);
        return;
      }

      try {
        const data = await api.get<any[]>(`/api/jobs/${job.id}/applicants`);
        const scopedRows = ((data ?? []) as ApplicantPreviewRow[]).filter((row: any) => row.job_id === job.id);
        setApplicants(scopedRows);
      } catch {
        setApplicants([]);
      }
    };

    fetchApplicants();
  }, [currentUserId, job?.employer_id, job?.id]);

  const handleOpenConversation = async () => {
    if (!job?.id || !job?.employer_id || openingChat) return;

    if (!currentUserId) {
      showFlashMessage("Sign in required", "Please sign in before opening a conversation.", "warning");
      return;
    }

    setOpeningChat(true);
    try {
      const data = await api.post<string>("/api/conversations/job", {
        job_id: job.id,
        employer_id: job.employer_id,
      });

      if (!data) throw new Error("Unable to open conversation.");

      router.push({
        pathname: "/chatRoom/chatRoom",
        params: {
          roomId: data,
          name: "Employer",
          jobTitle: job.title,
        },
      });
    } catch (err) {
      showFlashMessage("Message failed", humanizeError(err, "Unable to open conversation."), "error");
    } finally {
      setOpeningChat(false);
    }
  };

  const handleApply = async () => {
    if (!job?.id || applying || isClosed || hasApplied) return;

    if (!currentUserId) {
      showFlashMessage("Sign in required", "Please sign in before applying to this job.", "warning");
      return;
    }

    setApplying(true);
    try {
      await api.post(`/api/jobs/${job.id}/apply`, {
        cover_letter: null,
        expected_rate: null,
      });

      showFlashMessage("Application sent", "Your application was submitted to the employer.", "success");
      setHasApplied(true);
    } catch (err) {
      showFlashMessage("Apply failed", humanizeError(err, "Unable to submit your application."), "error");
    } finally {
      setApplying(false);
    }
  };

  const handleSetStatus = async () => {
    if (!job?.id || updatingStatus) return;

    const nextStatus = job.status === "open" ? "closed" : "open";
    setUpdatingStatus(true);
    try {
      const data = await api.patch<any>(`/api/jobs/${job.id}/status`, { status: nextStatus });

      setJob((prev: any) => (prev ? { ...prev, status: data.status } : prev));
      showFlashMessage(
        nextStatus === "closed" ? "Hiring stopped" : "Job reopened",
        nextStatus === "closed" ? "This job is now closed to new applicants." : "This job is open for applicants again.",
        "success"
      );
    } catch (err) {
      showFlashMessage("Update failed", humanizeError(err, "Unable to update job status."), "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) return (
    <View className={`flex-1 items-center justify-center ${t.bgPage}`}>
      <ActivityIndicator color="#2563EB" size="large" />
    </View>
  );

  if (!job) return null;

  return (
    <View className={`flex-1 ${t.bgPage}`}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <EntityHeroBanner
          title={job.title}
          subtitle={job.location_label}
          eyebrow={isClosed ? "Closed Job" : job.is_urgent ? "Urgent Hiring" : "Open Job"}
          meta={`Posted ${new Date(job.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
          imageUri={null}
          seed={`${job.id}:${job.title}`}
          topInset={inset.top}
          onBack={() => router.back()}
        />

        <View className={`-mt-6 rounded-t-[32px] px-6 pt-7 ${t.bgPage}`}>
          <View className="mb-4">
            <View className="flex-row items-center justify-between">
              <View className={`rounded-lg px-3 py-1 ${isClosed ? "bg-slate-500" : "bg-blue-600"}`}>
                <Text className="text-white text-[10px] font-extrabold uppercase">{isClosed ? "Closed" : "Active"}</Text>
              </View>
              <Text className={`text-xs font-semibold ${t.textMuted}`}>
                {isOwner ? "Your posting" : "Hiring now"}
              </Text>
            </View>

            <Text className={`mt-3 text-[26px] font-extrabold tracking-tight ${t.text}`}>{job.title}</Text>

            <View className="mt-2 flex-row items-center">
              <Ionicons name="location" size={16} color="#64748B" />
              <Text className="ml-1 text-sm font-medium text-slate-500">{job.location_label}</Text>
            </View>

            <Text className={`mt-4 text-[13px] font-semibold leading-5 ${t.textMuted}`}>
              Review the role, pay range, applicants, and next actions from one job detail screen.
            </Text>
          </View>

          <View className="mt-6 flex-row gap-3">
            <View className={`flex-1 rounded-[20px] border p-4 ${t.border} ${t.bgCard}`}>
              <Text className={`text-[10px] font-bold uppercase tracking-wide ${t.textMuted}`}>Budget</Text>
              <Text className="mt-1 text-[17px] font-extrabold text-emerald-600">{budgetLabel}</Text>
            </View>

            <View className={`flex-1 rounded-[20px] border p-4 ${t.border} ${t.bgCard}`}>
              <Text className={`text-[10px] font-bold uppercase tracking-wide ${t.textMuted}`}>Status</Text>
              <View className="mt-1 flex-row items-center">
                <Text className={`text-sm font-extrabold ${t.text}`}>{isClosed ? "Paused" : "Accepting"}</Text>
                <Feather name={isClosed ? "pause-circle" : "check-circle"} size={12} color="#2563EB" style={{ marginLeft: 6 }} />
              </View>
            </View>
          </View>

          <View className="mt-6 flex-row gap-3">
            <TouchableOpacity 
              onPress={() => router.push({ pathname: "/map/mapView", params: { location: job.location_label } })}
              className={`flex-1 rounded-[20px] border p-4 ${t.border} ${t.bgCard}`}
            >
              <Text className={`text-[10px] font-bold uppercase tracking-wide ${t.textMuted}`}>On Map</Text>
              <View className="mt-1 flex-row items-center">
                <Text className={`text-sm font-extrabold ${t.text}`}>View Route</Text>
                <Feather name="map-pin" size={12} color="#2563EB" style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>

            <View className={`flex-1 rounded-[20px] border p-4 ${t.border} ${t.bgCard}`}>
              <Text className={`text-[10px] font-bold uppercase tracking-wide ${t.textMuted}`}>Chat</Text>
              <View className="mt-1 flex-row items-center">
                <Text className={`text-sm font-extrabold ${t.text}`}>{isOwner ? "Applicants" : "Employer"}</Text>
                <Feather name="message-circle" size={12} color="#2563EB" style={{ marginLeft: 6 }} />
              </View>
            </View>
          </View>

          <View className="mt-8">
            <Text className={`text-lg font-bold ${t.text}`}>The Role</Text>
            <Text className={`mt-3 text-[15px] leading-6 ${t.textMuted}`}>{job.description}</Text>
          </View>

          {isOwner ? (
            <View className="mt-8">
              <View className="flex-row items-start justify-between gap-3">
                <View>
                  <Text className={`text-lg font-bold ${t.text}`}>Applicants</Text>
                  <Text className={`mt-1 text-xs font-semibold leading-[18px] ${t.textMuted}`}>
                    {applicants.length > 0 ? `${applicants.length} worker${applicants.length === 1 ? "" : "s"} applied to this job.` : "Applicants will appear here when workers apply."}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/profile/JobApplicants", params: { jobId: job.id } })}
                  className={`h-9 rounded-xl border px-4 items-center justify-center ${t.border} ${t.bgSoft}`}
                >
                  <Text className={`text-[11px] font-extrabold uppercase tracking-wide ${t.text}`}>Open All</Text>
                </TouchableOpacity>
              </View>

              {applicants.length > 0 ? (
                applicants.slice(0, 3).map((applicant) => (
                  <TouchableOpacity
                    key={applicant.application_id}
                    onPress={() => router.push({ pathname: "/profile/JobApplicants", params: { jobId: job.id } })}
                    className={`mt-4 rounded-[18px] border p-4 ${t.border} ${t.bgCard}`}
                  >
                    <View className="flex-row items-center">
                      <View className="h-[42px] w-[42px] rounded-[14px] bg-blue-100 items-center justify-center">
                        <Text className="text-sm font-extrabold text-blue-700">{applicant.applicant_name.slice(0, 1).toUpperCase()}</Text>
                      </View>
                      <View className="ml-3 mr-3 flex-1">
                        <Text className={`text-sm font-extrabold ${t.text}`}>{applicant.applicant_name}</Text>
                        <Text className={`mt-0.5 text-[11px] font-semibold ${t.textMuted}`}>
                          Applied {new Date(applicant.applied_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <View className="rounded-full bg-blue-50 px-3 py-1.5">
                        <Text className="text-[10px] font-extrabold uppercase text-blue-700">{applicant.status}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View className={`mt-4 rounded-[18px] border p-4 ${t.border} ${t.bgCard}`}>
                  <Text className={`text-[13px] font-semibold leading-[18px] ${t.textMuted}`}>No applications yet for this posting.</Text>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        className={`absolute bottom-0 w-full border-t px-5 pt-4 ${t.bgCard} ${t.border}`}
        style={{ paddingBottom: inset.bottom + 12 }}
      >
        <AppFlashMessage message={flashMessage} onClose={hideFlashMessage} />
        
        {isOwner ? (
          <View className="flex-row gap-3">
            <TouchableOpacity 
              onPress={() => setEditModalVisible(true)}
              className={`flex-1 h-14 rounded-2xl border items-center justify-center ${t.bgSoft} ${t.border}`}
            >
              <Text className={`font-bold ${t.text}`}>Edit Job</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSetStatus}
              disabled={updatingStatus}
              className="flex-1 h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: job.status === 'open' ? '#EF4444' : '#10B981' }}
            >
              <Text className="text-white font-extrabold text-base">
                {updatingStatus ? 'Updating...' : job.status === 'open' ? 'Stop Hiring' : 'Re-open'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row gap-3">
            <TouchableOpacity 
              onPress={handleOpenConversation}
              disabled={openingChat}
              className={`h-14 w-14 rounded-2xl border items-center justify-center ${t.bgSoft} ${t.border}`}
            >
              {openingChat ? (
                <ActivityIndicator size="small" color={t.text} />
              ) : (
                <Ionicons name="chatbubbles-outline" size={24} color={t.text} />
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleApply}
              disabled={isClosed || applying || hasApplied}
              className="flex-1 h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: isClosed || hasApplied ? '#94A3B8' : '#2563EB' }}
            >
              <Text className="text-white font-extrabold text-base">
                {isClosed ? 'Listing Closed' : hasApplied ? 'Applied' : applying ? 'Applying...' : 'Quick Apply'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <JobEditModal
        visible={editModalVisible}
        job={job}
        onClose={() => setEditModalVisible(false)}
        onSaved={(updated) => setJob({ ...job, ...updated })}
      />
    </View>
  );
}
