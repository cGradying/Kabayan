import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/utils/api";
import humanizeError from "@/utils/humanizeError";

type MyApplicationRow = {
  application_id: string;
  job_id: string;
  job_title: string;
  employer_id: string;
  employer_name: string;
  location_label: string;
  status: string;
  applied_at: string;
};

export default function MyApplications() {
  const { t } = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<MyApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>("/api/applications");
      setRows((data ?? []) as MyApplicationRow[]);
    } catch (err) {
      console.warn(humanizeError(err, "Unable to load your applications."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadApplications();
    }, [loadApplications])
  );

  if (loading) {
    return (
      <View className={`flex-1 items-center justify-center ${t.bgPage}`}>
        <ActivityIndicator />
        <Text className={`mt-2 ${t.textMuted}`}>Loading your applications…</Text>
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
            <Text className={`text-2xl font-black ${t.text}`}>My Applications</Text>
            <Text className={`text-xs mt-1 ${t.textMuted}`}>Track whether your job applications are pending, accepted, or rejected.</Text>
          </View>
        </View>
      </View>

      {rows.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className={`text-base font-semibold ${t.text}`}>No applications yet</Text>
          <Text className={`text-xs mt-2 text-center ${t.textMuted}`}>Apply to a job and it will appear here with its current status.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          {rows.map((row) => (
            <TouchableOpacity
              key={row.application_id}
              onPress={() => router.push({ pathname: "/job/JobView", params: { jobId: row.job_id } })}
              className={`mb-4 rounded-3xl border ${t.border} ${t.bgCard} p-5`}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className={`text-lg font-black ${t.text}`}>{row.job_title}</Text>
                  <Text className={`mt-1 text-xs font-semibold ${t.textMuted}`}>{row.employer_name}</Text>
                  <View className="mt-2 flex-row items-center">
                    <Ionicons name="location-outline" size={13} color={t.icon} />
                    <Text className={`ml-1 text-[11px] font-semibold ${t.textMuted}`}>{row.location_label}</Text>
                  </View>
                </View>
                <View
                  className={`px-3 py-1.5 rounded-full ${
                    row.status === "accepted"
                      ? "bg-emerald-50"
                      : row.status === "rejected"
                      ? "bg-rose-50"
                      : "bg-blue-50"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black uppercase ${
                      row.status === "accepted"
                        ? "text-emerald-700"
                        : row.status === "rejected"
                        ? "text-rose-700"
                        : "text-blue-700"
                    }`}
                  >
                    {row.status}
                  </Text>
                </View>
              </View>

              <Text className={`mt-4 text-[11px] font-semibold ${t.textMuted}`}>
                Applied {new Date(row.applied_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
