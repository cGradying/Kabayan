import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Image, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { LegendList } from "@legendapp/list";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { api, getStoredUser } from "@/utils/api";
import CustomModal from "@/components/CustomComponents/CustomModalComponent";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Conversation = {
  roomId: string;
  lastMsg: string;
  lastSenderId: string | null;
  lastTime: string | null;
  otherUserId: string | null;
  otherDisplayName: string;
  otherAvatarUrl: string | null;
  jobId: string | null;
  jobTitle: string | null;
};

export default function Inbox() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [threads, setThreads] = useState<Conversation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchThreads = useCallback(async (targetUserId?: string | null) => {
    const resolvedUserId = targetUserId ?? userId;
    if (!resolvedUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await api.get<any[]>("/api/conversations");
      const rows = data ?? [];

      const mapped: Conversation[] = rows.map((row: any) => ({
        roomId: row.room_id,
        lastMsg: row.last_message ?? "",
        lastSenderId: row.last_sender_id ?? null,
        lastTime: row.last_time ?? null,
        otherUserId: row.other_user_id ?? null,
        otherDisplayName: row.other_display_name ?? "Unknown User",
        otherAvatarUrl: row.other_avatar_url ?? null,
        jobId: row.job_id ?? null,
        jobTitle: row.job_title ?? null,
      }));

      setThreads(mapped);
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getStoredUser().then((user) => {
        if (!active) return;
        const uid = user?.id ?? null;
        setUserId(uid);
        setAuthModalVisible(!uid);
        if (uid) {
          fetchThreads(uid);
        } else {
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }, [fetchThreads])
  );

  useEffect(() => {
    if (!userId) return;
    fetchThreads();
    // Realtime channels removed — polling replaces realtime
  }, [userId, fetchThreads]);

  const filteredThreads = useMemo(() => {
    const q = search.toLowerCase();
    return threads.filter((thread) => {
      return (
        thread.otherDisplayName.toLowerCase().includes(q) ||
        thread.roomId.toLowerCase().includes(q) ||
        (thread.jobTitle ?? "").toLowerCase().includes(q)
      );
    });
  }, [threads, search]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      className={`flex-1 ${t.bgPage}`}
    >
      <View className={`pb-6 px-6 ${t.bgCard} border-b ${t.border}`} style={{ paddingTop:  12 }}>
        <View className={`flex-row items-center mt-4 px-4 h-12 rounded-2xl ${t.bgSurface} border ${t.border}`}>
          <Feather name="search" size={16} color={t.icon} />
          <TextInput
            placeholder="Search conversations..."
            value={search}
            onChangeText={setSearch}
            className={`flex-1 ml-3 text-sm ${t.text}`}
            placeholderTextColor={t.icon}
            autoCorrect={false}
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className={`mt-2 ${t.textMuted}`}>Loading messages…</Text>
        </View>
      ) : (
        <LegendList
          data={filteredThreads}
          keyExtractor={(item) => item.roomId}
          estimatedItemSize={90}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View className="py-16 items-center">
              <Text className={`text-sm ${t.textMuted}`}>No messages</Text>
            </View>
          }
          renderItem={({ item }) => {
            const preview = item.lastMsg ? `${item.lastSenderId === userId ? "You: " : ""}${item.lastMsg}` : "No messages yet";
            return (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/chatRoom/chatRoom",
                    params: {
                      roomId: item.roomId,
                      name: item.otherDisplayName,
                      jobTitle: item.jobTitle ?? undefined,
                    },
                  })
                }
                className={`flex-row items-center p-5 border-b ${t.border} active:bg-slate-50`}
              >
                <View className="relative">
                  {item.otherAvatarUrl ? (
                    <Image source={{ uri: item.otherAvatarUrl }} className="w-14 h-14 rounded-[20px]" />
                  ) : (
                    <View className="w-14 h-14 rounded-[20px] bg-slate-200 items-center justify-center">
                      <Text className="text-slate-600 font-black text-lg">{item.otherDisplayName.slice(0, 1).toUpperCase()}</Text>
                    </View>
                  )}
                </View>

                <View className="flex-1 ml-4">
                  <View className="flex-row justify-between items-center">
                    <Text className={`font-black text-base ${t.text}`}>{item.otherDisplayName}</Text>
                    <Text className={`text-[10px] font-bold ${t.textMuted}`}>{formatTime(item.lastTime)}</Text>
                  </View>
                  <Text className={`text-xs mt-1 font-medium ${t.textMuted}`} numberOfLines={1}>
                    {preview}
                  </Text>
                  <View className="flex-row items-center mt-2">
                    <View className={`${t.brandSoft} px-2 py-0.5 rounded-md`}>
                      <Text className={`text-[9px] font-black uppercase ${t.brand}`}>
                        {item.jobTitle ? `Job: ${item.jobTitle}` : "Direct Message"}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
      
      <CustomModal authModalVisible={authModalVisible} setAuthModalVisible={setAuthModalVisible} />

    </KeyboardAvoidingView>
  );
}

const formatTime = (iso: string | null) => {
  if (!iso) return "";
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
