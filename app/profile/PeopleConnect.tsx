import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { api, getStoredUser } from "@/utils/api";
import humanizeError from "@/utils/humanizeError";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PersonRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  location_label: string | null;
  job_role: string;
  market_role: string;
  id_verification_status: string;
};

export default function PeopleConnect() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(() => (typeof params.q === "string" ? params.q : ""));
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);

  useEffect(() => {
    if (typeof params.q === "string") {
      setQuery(params.q);
    }
  }, [params.q]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const user = await getStoredUser();
      if (!active) return;

      const uid = user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setPeople([]);
        setLoading(false);
        return;
      }

      try {
        const rows = await api.get<PersonRow[]>(`/api/people/search?q=`);
        if (active) setPeople(rows ?? []);
      } catch {
        if (active) Alert.alert("People Error", "Unable to load people right now.");
      }
      if (active) setLoading(false);
    };

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const runSearch = async () => {
      if (!userId) return;
      try {
        const data = await api.get<PersonRow[]>(`/api/people/search?q=${encodeURIComponent(query)}`);
        if (active) setPeople(data ?? []);
      } catch {
        if (active) Alert.alert("Search Error", "Search is unavailable right now.");
      }
    };

    runSearch();
    return () => {
      active = false;
    };
  }, [query, userId]);

  const connectWith = async (person: PersonRow) => {
    if (connectingTo) return;
    setConnectingTo(person.user_id);

    try {
      const data = await api.post<string>("/api/conversations/direct", { other_user_id: person.user_id });
      if (!data) throw new Error("Unable to open conversation.");

      router.push({
        pathname: "/chatRoom/chatRoom",
        params: {
          roomId: data,
          name: person.display_name,
        },
      });
    } catch (err) {
      const message = humanizeError(err, "Unable to connect right now.");
      Alert.alert("Connect Failed", message);
    } finally {
      setConnectingTo(null);
    }
  };

  if (loading) {
    return (
      <View className={`flex-1 items-center justify-center ${t.bgPage}`}>
        <ActivityIndicator />
        <Text className={`mt-2 ${t.textMuted}`}>Loading people…</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View className={`flex-1 items-center justify-center px-6 ${t.bgPage}`}>
        <Text className={`text-base font-semibold ${t.text}`}>Sign in to connect with people</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      className={`flex-1 ${t.bgPage}`}
    >
      <View className={`px-6 pb-4 border-b ${t.border} ${t.bgCard}`} style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 rounded-xl">
            <Ionicons name="chevron-back" size={22} color={t.text} />
          </TouchableOpacity>
          <View>
            <Text className={`text-2xl font-black ${t.text}`}>Connect With People</Text>
            <Text className={`text-xs mt-1 ${t.textMuted}`}>Find verified workers and employers.</Text>
          </View>
        </View>

        <View className={`mt-4 h-12 px-4 rounded-2xl border ${t.border} ${t.bgSurface} flex-row items-center`}>
          <Ionicons name="search" size={16} color={t.icon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, role, location"
            placeholderTextColor={t.icon}
            className={`ml-3 flex-1 text-sm ${t.text}`}
            autoCapitalize="none"
          />
        </View>
      </View>

      {people.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className={`text-base font-semibold ${t.text}`}>No people found</Text>
          <Text className={`text-xs mt-2 ${t.textMuted}`}>Try another keyword.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 28 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          {people.map((person) => (
            <View key={person.user_id} className={`mb-3 p-4 rounded-2xl border ${t.border} ${t.bgCard}`}>
              <View className="flex-row items-center">
                {person.avatar_url ? (
                  <Image source={{ uri: person.avatar_url }} className="w-12 h-12 rounded-xl" />
                ) : (
                  <View className="w-12 h-12 rounded-xl bg-slate-200 items-center justify-center">
                    <Text className="text-slate-700 font-black">{person.display_name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}

                <View className="ml-3 flex-1 pr-3">
                  <View className="flex-row items-center flex-wrap">
                    <Text className={`text-sm font-black ${t.text}`}>{person.display_name}</Text>
                    {person.id_verification_status === "verified" ? (
                      <View className="ml-2 px-2 py-0.5 rounded-md bg-emerald-100">
                        <Text className="text-[9px] font-black uppercase text-emerald-700">Verified</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className={`text-[11px] mt-1 ${t.textMuted}`}>
                    {person.job_role} • {person.market_role}
                    {person.location_label ? ` • ${person.location_label}` : ""}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => connectWith(person)}
                  disabled={connectingTo === person.user_id}
                  className="h-9 px-4 rounded-xl bg-blue-600 items-center justify-center"
                >
                  <Text className="text-white text-[10px] font-black uppercase tracking-widest">
                    {connectingTo === person.user_id ? "Opening..." : "Connect"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
