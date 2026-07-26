import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { getAssistantReply, loadAssistantContext } from "@/utils/aiAssistant";
import humanizeError from "@/utils/humanizeError";

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

const STARTERS = [
  "Jobs near me",
  "Food near me",
  "Show urgent jobs",
  "Cheap meals nearby",
];

function AnimatedDot({ delay, dotColor }: { delay: number; dotColor: string }) {
  const opacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
      ])
    );
    const timeout = setTimeout(() => animation.start(), delay);
    return () => {
      clearTimeout(timeout);
      animation.stop();
    };
  }, []);

  return (
    <Animated.View
      style={{ opacity, width: 8, height: 8, borderRadius: 4, marginHorizontal: 2, backgroundColor: dotColor }}
    />
  );
}

function TypingIndicator({ surface, mutedText }: { surface: string; mutedText: string }) {
  return (
    <View className="mb-4 flex-row items-center self-start rounded-2xl px-4 py-3.5 border border-[#E2E8F0]" style={{ backgroundColor: surface }}>
      <Text className="text-xs font-bold mr-2" style={{ color: mutedText }}>Kabayan AI</Text>
      {[0, 1, 2].map(i => <AnimatedDot key={i} delay={i * 200} dotColor={mutedText} />)}
    </View>
  );
}

export default function AssistantTab() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Kabayan AI is ready. Ask about open jobs, store items, or what is near your saved location.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loadingContext, setLoadingContext] = useState(true);
  const [sending, setSending] = useState(false);
  const [context, setContext] = useState<Awaited<ReturnType<typeof loadAssistantContext>> | null>(null);

  const refreshContext = useCallback(async () => {
    setLoadingContext(true);
    try {
      const nextContext = await loadAssistantContext();
      setContext(nextContext);
    } finally {
      setLoadingContext(false);
    }
  }, []);

  useEffect(() => {
    refreshContext();
  }, [refreshContext]);

  const sendMessage = useCallback(
    async (preset?: string) => {
      const text = (preset ?? input).trim();
      if (!text || sending) return;

      setMessages((prev) => [...prev, { id: `${Date.now()}-user`, role: "user", text }]);
      setInput("");
      setSending(true);

      try {
        const liveContext = context ?? (await loadAssistantContext());
        if (!context) setContext(liveContext);
        const reply = await getAssistantReply(text, liveContext);
        setMessages((prev) => [...prev, { id: `${Date.now()}-assistant`, role: "assistant", text: reply }]);
      } catch (err) {
        const reply = humanizeError(err, "The assistant could not answer right now.");
        setMessages((prev) => [...prev, { id: `${Date.now()}-assistant-error`, role: "assistant", text: reply }]);
      } finally {
        setSending(false);
      }
    },
    [context, input, sending]
  );

  const surface = t.isDarkMode ? '#1A2540' : '#F1F5F9';
  const mutedText = t.isDarkMode ? '#64748B' : '#94A3B8';
  const borderColor = t.isDarkMode ? '#1E293B' : '#E2E8F0';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 18 : 12}
      style={{ flex: 1 }}
      className={`flex-1 ${t.bgPage}`}
    >
      <View
        className="px-5 pb-4"
        style={{ backgroundColor: t.aiBannerBg, paddingTop: insets.top + 10, borderBottomWidth: 1, borderBottomColor: t.aiBannerRing }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="h-11 w-11 rounded-2xl items-center justify-center" style={{ backgroundColor: t.aiBannerAccent }}>
              <Ionicons name="sparkles-outline" size={22} color="#FFFFFF" />
            </View>
            <View className="ml-3">
              <Text className={`text-xl font-black ${t.text}`}>Kabayan AI</Text>
              <Text className={`text-xs font-medium ${t.textMuted}`}>Ask about jobs, stores, and what is nearby.</Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            {messages.length > 0 && (
              <TouchableOpacity
                onPress={() => setMessages([])}
                className="h-11 w-11 rounded-2xl items-center justify-center"
                style={{ backgroundColor: surface, borderWidth: 1, borderColor }}
                accessibilityLabel="Clear conversation"
              >
                <Feather name="trash-2" size={16} color={mutedText} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={refreshContext}
              className={`h-11 w-11 rounded-2xl border items-center justify-center ${t.border} ${t.bgCard}`}
            >
              <Ionicons name="refresh" size={18} color={t.icon} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loadingContext ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className={`mt-2 ${t.textMuted}`}>Loading AI context…</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 20 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <View className="flex-1">
            {messages.length === 1 ? (
              <View className="pb-4">
                <Text className={`text-[12px] font-black uppercase tracking-[2px] ${t.textMuted}`}>Try asking</Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {STARTERS.map((starter) => (
                    <TouchableOpacity
                      key={starter}
                      onPress={() => sendMessage(starter)}
                      className={`rounded-full px-4 py-2.5 ${t.bgCard} border ${t.border}`}
                    >
                      <Text className={`text-[11px] font-black uppercase tracking-widest ${t.text}`}>{starter}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            {messages.map((message) => (
              <View
                key={message.id}
                className={`mb-4 flex-row ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <View
                  className={`max-w-[84%] rounded-[28px] px-4 py-3.5 ${
                    message.role === "user" ? "bg-blue-600 rounded-tr-md" : `${t.bgCard} border ${t.border} rounded-tl-md`
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      message.role === "user" ? "text-blue-200" : t.textMuted
                    }`}
                  >
                    {message.role === "user" ? "You" : "Kabayan AI"}
                  </Text>
                  <Text className={`mt-2 text-sm leading-6 ${message.role === "user" ? "text-white" : t.text}`}>
                    {message.text}
                  </Text>
                </View>
              </View>
            ))}

            {sending && <TypingIndicator surface={surface} mutedText={mutedText} />}
          </View>
        </ScrollView>
      )}

      <View
        className={`border-t px-4 pt-3 ${t.border} ${t.bgPage}`}
        style={{ paddingBottom: insets.bottom + 10 }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text className={`text-xs font-semibold ${t.textMuted}`}>Live voice assistant</Text>
          <TouchableOpacity
            onPress={() => router.push("/assistant/live")}
            className={`flex-row items-center rounded-full border px-3 py-2 ${t.border} ${t.bgCard}`}
          >
            <MaterialCommunityIcons name="microphone-outline" size={16} color={t.icon} />
            <Text className={`ml-2 text-xs font-semibold ${t.text}`}>Live</Text>
          </TouchableOpacity>
        </View>

        <View
          className={`flex-row items-end rounded-[28px] border px-4 ${t.bgCard}`}
          style={{ borderColor: input.trim() ? '#E45C35' : t.isDarkMode ? '#26334A' : '#D1D5DB' }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about jobs, store items, or what is near you…"
            placeholderTextColor={t.icon}
            className={`flex-1 py-4 text-sm ${t.text}`}
            multiline
            textAlignVertical="top"
            style={{ maxHeight: 120 }}
          />
          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={!input.trim() || sending}
            className={`mb-3 ml-3 h-10 w-10 rounded-full items-center justify-center ${
              !input.trim() || sending ? "bg-slate-300" : "bg-blue-600"
            }`}
            accessibilityLabel="Send message"
            accessibilityHint="Sends your message to Kabayan AI"
          >
            {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="arrow-up" size={18} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
