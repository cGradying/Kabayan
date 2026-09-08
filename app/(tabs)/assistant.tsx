import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Alert,
  AccessibilityInfo,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { LegendList, type LegendListRef } from "@legendapp/list";
import { useRouter } from "expo-router";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { queryAssistant, type AssistantAssessment, type AssistantSource } from "@/utils/aiAssistant";
import humanizeError from "@/utils/humanizeError";

// Small pill/badge text is what breaks first at large system font sizes — cap it short of
// clipping its rounded container while still letting it grow past 100%.
const MICRO_FONT_SCALE = 1.4;

// NativeWind can't map `className` onto Animated.createAnimatedComponent(...) — the interop
// registry is keyed by component identity and this wrapper isn't in it, so className is
// silently dropped. Composer button below uses `style` instead; matches t.brandBg/t.bgSurface.
const BRAND_BLUE = "#2563EB";
const SURFACE_LIGHT = "#F1F5F9";
const SURFACE_DARK = "#1A2540";

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  failed?: boolean;
  errorText?: string;
  assessment?: AssistantAssessment;
  sources?: AssistantSource[];
};

const STARTERS = [
  "Jobs near me",
  "Food near me",
  "Show urgent jobs",
  "Cheap meals nearby",
];

const STAGE_LABEL: Record<AssistantAssessment["stage"], string> = {
  clarify: "Clarifying",
  retrieve: "Searching",
  recommend: "Recommending",
  act: "Next step",
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const formatSourcePrice = (price: number | string | null) => {
  if (price == null || price === "") return null;
  const num = typeof price === "string" ? Number(price) : price;
  if (num == null || Number.isNaN(num)) return null;
  return `₱${num.toLocaleString()}`;
};

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

const TypingIndicator = React.memo(function TypingIndicator({ t, stage }: { t: ReturnType<typeof useTheme>["t"]; stage?: AssistantAssessment["stage"] }) {
  return (
    <View className={`mb-4 flex-row items-center self-start rounded-2xl px-4 py-3.5 border ${t.bgCard} ${t.border}`}>
      <Text maxFontSizeMultiplier={MICRO_FONT_SCALE} className={`text-xs font-bold mr-2 ${t.textMuted}`}>
        Kabayan AI{stage ? ` · ${STAGE_LABEL[stage]}…` : ""}
      </Text>
      {[0, 1, 2].map(i => <AnimatedDot key={i} delay={i * 200} dotColor={t.icon} />)}
    </View>
  );
});

// Message bubbles slide up + fade in once, on mount only — never re-fires on re-render.
function AnimatedMessage({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

const AssessmentCard = React.memo(function AssessmentCard({ assessment, t }: { assessment: AssistantAssessment; t: ReturnType<typeof useTheme>["t"] }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setOpen((v) => !v)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel="AI reasoning details"
      className={`mb-4 self-start max-w-[92%] rounded-2xl border px-4 py-3 ${t.bgCard} ${t.border}`}
    >
      <View className="flex-row items-center">
        <Ionicons name={open ? "chevron-down" : "chevron-forward"} size={14} color={t.icon} />
        <Text maxFontSizeMultiplier={MICRO_FONT_SCALE} className={`ml-1 text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>
          {STAGE_LABEL[assessment.stage]} · {Math.round(assessment.confidence * 100)}% sure
        </Text>
      </View>
      <Text className={`mt-1 text-xs ${t.text}`}>{assessment.next_step}</Text>
      {open && (
        <View className="mt-2 border-t pt-2" style={{ borderColor: t.isDarkMode ? "#26334A" : "#E2E8F0" }}>
          <Text maxFontSizeMultiplier={MICRO_FONT_SCALE} className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>Situation</Text>
          <Text className={`mt-0.5 text-xs ${t.text}`}>{assessment.situation}</Text>
          {assessment.knows.length > 0 && (
            <>
              <Text maxFontSizeMultiplier={MICRO_FONT_SCALE} className={`mt-2 text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>What I know</Text>
              {assessment.knows.map((line, i) => (
                <Text key={i} className={`mt-0.5 text-xs ${t.text}`}>• {line}</Text>
              ))}
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

// The chip's payload IS the answer — a job, a store, a vendor pin. It carries price and
// verification so the user can decide without leaving the reply.
const SourceCards = React.memo(function SourceCards({ sources, t }: { sources: AssistantSource[]; t: ReturnType<typeof useTheme>["t"] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  if (sources.length === 0) return null;

  const warningHex = t.isDarkMode ? "#F59E0B" : "#B45309";
  const visible = expanded ? sources : sources.slice(0, 3);
  const hiddenCount = sources.length - visible.length;

  const openSource = (source: AssistantSource) => {
    // A card with coordinates always shows where it is — verified or not,
    // this is the only detail route scraped/unverified vendors have.
    if (source.latitude != null && source.longitude != null) {
      router.push({
        pathname: "/map/mapView",
        params: {
          latitude: String(source.latitude),
          longitude: String(source.longitude),
          location: source.location_label ?? source.name,
        },
      });
      return;
    }
    if (source.source === "jobs") router.push({ pathname: "/job/JobView", params: { jobId: source.id } });
    else if (source.source === "marketplace") router.push({ pathname: "/marketPlace/marketPlaceView", params: { id: source.id } });
  };

  return (
    <View className="mb-4 gap-2">
      {visible.map((source) => {
        const price = formatSourcePrice(source.price);
        return (
          <TouchableOpacity
            key={source.id}
            onPress={() => openSource(source)}
            accessibilityRole="button"
            accessibilityLabel={`${source.name}${price ? `, ${price}` : ""}${source.location_label ? `, ${source.location_label}` : ""}, ${source.verified ? "verified" : "unverified community info"}`}
            className={`flex-row items-center rounded-2xl border p-3 ${t.bgCard} ${t.border}`}
            style={{ minHeight: 56, borderLeftWidth: source.verified ? 1 : 4, borderLeftColor: source.verified ? undefined : warningHex }}
          >
            <View className="flex-1 pr-2">
              <View className="flex-row items-center">
                {source.verified && <Ionicons name="shield-checkmark" size={12} color="#10B981" />}
                <Text className={`font-black text-sm ${t.text} ${source.verified ? "ml-1" : ""}`} numberOfLines={1}>
                  {source.name}
                </Text>
              </View>
              {source.location_label && (
                <View className="flex-row items-center mt-0.5">
                  <Ionicons name="location-outline" size={11} color={t.icon} />
                  <Text maxFontSizeMultiplier={MICRO_FONT_SCALE} className={`ml-1 text-[11px] font-semibold ${t.textMuted}`} numberOfLines={1}>{source.location_label}</Text>
                </View>
              )}
              {!source.verified && (
                <Text maxFontSizeMultiplier={MICRO_FONT_SCALE} className={`mt-1 text-[11px] font-black uppercase tracking-wider ${t.warning}`}>Tip from the community</Text>
              )}
            </View>
            {price && <Text className={`${t.price} font-black text-sm`}>{price}</Text>}
          </TouchableOpacity>
        );
      })}
      {hiddenCount > 0 && (
        <TouchableOpacity onPress={() => setExpanded(true)} accessibilityRole="button" className="items-center py-2">
          <Text maxFontSizeMultiplier={MICRO_FONT_SCALE} className={`text-[11px] font-black uppercase tracking-widest ${t.brand}`}>Show all {sources.length}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// One list row. Memoized so a keystroke in the composer (which changes `input`, not
// `message`/`t`/`sending`) never re-renders the 60 rows that already scrolled off screen.
const MessageRow = React.memo(function MessageRow({
  message,
  t,
  sending,
  onRetry,
}: {
  message: AssistantMessage;
  t: ReturnType<typeof useTheme>["t"];
  sending: boolean;
  onRetry: (msg: AssistantMessage) => void;
}) {
  return (
    <AnimatedMessage>
      <View className={`mb-1 flex-row ${message.role === "user" ? "justify-end" : "justify-start"}`}>
        <View
          className={`max-w-[84%] rounded-[24px] px-4 py-3.5 ${
            message.role === "user" ? `${t.brandBg} rounded-tr-md` : `${t.bgCard} border ${t.border} rounded-tl-md`
          }`}
          style={message.failed ? { opacity: 0.6 } : undefined}
        >
          <Text
            maxFontSizeMultiplier={MICRO_FONT_SCALE}
            className={`text-[10px] font-black uppercase tracking-widest ${
              message.role === "user" ? "text-white/90" : t.textMuted
            }`}
          >
            {message.role === "user" ? "You" : "Kabayan AI"}
          </Text>
          <Text className={`mt-2 text-sm leading-6 ${message.role === "user" ? "text-white" : t.text}`}>
            {message.text}
          </Text>
        </View>
      </View>
      {message.failed && (
        <View className="mb-3 flex-row items-center justify-end">
          <Text maxFontSizeMultiplier={MICRO_FONT_SCALE} className={`mr-2 text-[11px] font-semibold ${t.danger}`}>
            {message.errorText ?? "Could not send"}
          </Text>
          <TouchableOpacity
            onPress={() => onRetry(message)}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel="Retry sending this message"
            accessibilityState={{ disabled: sending }}
            className={`rounded-full border px-3 py-1.5 ${t.border} ${t.bgCard}`}
            style={sending ? { opacity: 0.5 } : undefined}
          >
            <Text maxFontSizeMultiplier={MICRO_FONT_SCALE} className={`text-[11px] font-black ${t.brand}`}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      {__DEV__ && message.assessment && (
        <View className="mt-2">
          <AssessmentCard assessment={message.assessment} t={t} />
        </View>
      )}
      {message.sources && message.sources.length > 0 && <SourceCards sources={message.sources} t={t} />}
    </AnimatedMessage>
  );
},
// `sending` flips on every send/receive cycle for every row alike — only a failed row's
// Retry button actually reads it, so every other row should ignore that prop entirely.
(prev, next) =>
  prev.message === next.message &&
  prev.t === next.t &&
  prev.onRetry === next.onRetry &&
  (!prev.message.failed || prev.sending === next.sending)
);

export default function AssistantTab() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<LegendListRef>(null);
  const msgCounterRef = useRef(0);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const isNearBottomRef = useRef(true);
  const inputRef = useRef("");
  const sendingRef = useRef(false);

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [lastStage, setLastStage] = useState<AssistantAssessment["stage"] | undefined>();
  const [showJump, setShowJump] = useState(false);

  const sendScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const nextId = (suffix: string) => `${Date.now()}-${msgCounterRef.current++}-${suffix}`;

  const handleInputChange = (value: string) => {
    setInput(value);
    inputRef.current = value;
  };

  const setSendingBoth = (value: boolean) => {
    sendingRef.current = value;
    setSending(value);
  };

  // Reads input/sending from refs, not state, so this function's identity survives every
  // keystroke and send/receive cycle — MessageRow's onRetry prop stays stable and
  // React.memo can actually skip re-renders for rows scrolled off screen.
  const sendMessage = useCallback(
    async (preset?: string, retryId?: string) => {
      const text = (preset ?? inputRef.current).trim();
      if (!text || sendingRef.current) return;

      const userMsgId = retryId ?? nextId("user");
      if (retryId) {
        setMessages((prev) => prev.map((m) => (m.id === retryId ? { ...m, failed: false } : m)));
      } else {
        setMessages((prev) => [...prev, { id: userMsgId, role: "user", text }]);
        handleInputChange("");
      }
      setSendingBoth(true);
      setLastStage(undefined); // this turn hasn't reached any stage yet — don't show the last one's
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await queryAssistant(text, conversationId, controller.signal);
        if (!mountedRef.current) return;
        setConversationId(result.conversation_id);
        setLastStage(result.assessment?.stage);
        setMessages((prev) => {
          const reply: AssistantMessage = { id: nextId("assistant"), role: "assistant", text: result.reply, assessment: result.assessment, sources: result.sources };
          // A retried message's reply belongs right after it, not at the end — the array may
          // already hold newer turns sent while this retry was in flight.
          const afterIdx = retryId ? prev.findIndex((m) => m.id === retryId) : -1;
          if (afterIdx === -1) return [...prev, reply];
          return [...prev.slice(0, afterIdx + 1), reply, ...prev.slice(afterIdx + 1)];
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        AccessibilityInfo.announceForAccessibility(`Kabayan AI replied: ${result.reply}`);
      } catch (err) {
        if (!mountedRef.current) return;
        // An abort (Stop button, or Clear firing mid-request) still leaves the user's
        // question stuck with no reply coming — it must fail visibly, not vanish silently.
        const aborted = controller.signal.aborted;
        const errorText = aborted ? "Stopped" : humanizeError(err, "Could not send");
        setMessages((prev) => prev.map((m) => (m.id === userMsgId ? { ...m, failed: true, errorText } : m)));
        if (!aborted) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } finally {
        // Only clear shared in-flight state if nothing newer (a fresh send fired after this
        // one was aborted, e.g. by Clear) has since taken ownership of abortRef.
        if (abortRef.current === controller) {
          abortRef.current = null;
          if (mountedRef.current) setSendingBoth(false);
        }
      }
    },
    [conversationId]
  );

  const stopSending = useCallback(() => abortRef.current?.abort(), []);
  const retryMessage = useCallback((msg: AssistantMessage) => sendMessage(msg.text, msg.id), [sendMessage]);

  const confirmClear = () => {
    if (messages.length === 0) return;
    Alert.alert("Clear conversation?", "This deletes your chat history with Kabayan AI.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          abortRef.current?.abort();
          abortRef.current = null;
          setSendingBoth(false);
          setMessages([]);
          setConversationId(undefined);
          setLastStage(undefined);
          isNearBottomRef.current = true;
          setShowJump(false);
        },
      },
    ]);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const near = distanceFromBottom < 80;
    isNearBottomRef.current = near;
    if (near) setShowJump(false);
  };

  const jumpToEnd = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
    setShowJump(false);
  };

  // Runs whenever a bubble is added or the typing indicator toggles — the LegendList
  // equivalent of the old ScrollView's onContentSizeChange, without needing a layout event.
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollRef.current?.scrollToEnd({ animated: true });
    } else if (messages.length > 0) {
      setShowJump(true);
    }
  }, [messages.length, sending]);

  const pressIn = () => Animated.spring(sendScale, { toValue: 0.92, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  const pressOut = () => Animated.spring(sendScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
      style={{ flex: 1 }}
      className={`flex-1 ${t.bgPage}`}
    >
      <View
        className={`px-5 pb-4 ${t.bgCard} border-b ${t.border}`}
        style={{ paddingTop: insets.top + 10 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className={`h-11 w-11 rounded-2xl items-center justify-center ${t.brandSoft}`}>
              <Ionicons name="sparkles-outline" size={22} color={t.accent} />
            </View>
            <View className="ml-3">
              <Text className={`text-xl font-black ${t.text}`}>Kabayan AI</Text>
              <Text className={`text-xs font-medium ${t.textMuted}`}>Ask about jobs, stores, and what is nearby.</Text>
            </View>
          </View>
          {messages.length > 0 && (
            <TouchableOpacity
              onPress={confirmClear}
              accessibilityRole="button"
              accessibilityLabel="Clear conversation"
              className={`h-11 w-11 rounded-2xl items-center justify-center border ${t.bgSurface} ${t.border}`}
            >
              <Feather name="trash-2" size={16} color={t.icon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <LegendList
          ref={scrollRef}
          className="flex-1"
          data={messages}
          keyExtractor={(item) => item.id}
          estimatedItemSize={110}
          alignItemsAtEnd
          maintainVisibleContentPosition
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 20 }}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          ListEmptyComponent={
            <View className="pb-4">
              <View className={`mt-4 p-8 rounded-[28px] border ${t.border} ${t.bgCard} items-center`}>
                <View className={`w-20 h-20 rounded-[28px] ${t.brandSoft} items-center justify-center mb-4`}>
                  <Ionicons name="sparkles-outline" size={36} color={t.accent} />
                </View>
                <Text className={`text-lg font-black text-center ${t.text}`}>Ask Kabayan AI</Text>
                <Text className={`mt-2 text-sm text-center leading-5 ${t.textMuted}`}>
                  Open jobs, store items, or what is near your saved location.
                </Text>
              </View>
              <Text maxFontSizeMultiplier={MICRO_FONT_SCALE} className={`mt-6 text-[12px] font-black uppercase tracking-[2px] ${t.textMuted}`}>Try asking</Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {STARTERS.map((starter) => (
                  <TouchableOpacity
                    key={starter}
                    onPress={() => sendMessage(starter)}
                    accessibilityRole="button"
                    className={`rounded-full px-4 py-2.5 ${t.bgCard} border ${t.border}`}
                  >
                    <Text maxFontSizeMultiplier={MICRO_FONT_SCALE} className={`text-[11px] font-black uppercase tracking-widest ${t.text}`}>{starter}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => <MessageRow message={item} t={t} sending={sending} onRetry={retryMessage} />}
          ListFooterComponent={sending ? <TypingIndicator t={t} stage={lastStage} /> : null}
        />

        {showJump && (
          <TouchableOpacity
            onPress={jumpToEnd}
            accessibilityRole="button"
            accessibilityLabel="Scroll to latest reply"
            className={`absolute self-center flex-row items-center px-4 py-2 rounded-full ${t.brandBg}`}
            style={{ bottom: 12 }}
          >
            <Feather name="arrow-down" size={14} color="#FFFFFF" />
            <Text className="ml-2 text-white text-xs font-black">New reply</Text>
          </TouchableOpacity>
        )}
      </View>

      <View
        className={`border-t px-4 pt-3 ${t.border} ${t.bgPage}`}
        style={{ paddingBottom: Math.max(insets.bottom, 10) }}
      >
        <View
          className={`flex-row items-center rounded-[28px] border pl-4 pr-2 py-2 ${t.bgCard}`}
          style={{ borderColor: input.trim() ? t.accent : t.isDarkMode ? '#1E293B' : '#E2E8F0' }}
        >
          <TextInput
            value={input}
            onChangeText={handleInputChange}
            placeholder="Ask or tap the mic…"
            placeholderTextColor={t.icon}
            className={`flex-1 py-2 text-sm ${t.text}`}
            multiline
            textAlignVertical="center"
            // Android never fires onSubmitEditing on a multiline input — the return key just
            // inserts a newline there regardless, so don't label it "send" and imply otherwise.
            returnKeyType={Platform.OS === "ios" ? "send" : "default"}
            blurOnSubmit={false}
            onSubmitEditing={() => !sending && sendMessage()}
            style={{ maxHeight: 120 }}
          />
          <AnimatedTouchable
            onPress={sending ? stopSending : input.trim() ? () => sendMessage() : () => router.push("/assistant/live")}
            onPressIn={pressIn}
            onPressOut={pressOut}
            accessibilityRole="button"
            accessibilityLabel={sending ? "Stop request" : input.trim() ? "Send message" : "Start voice assistant"}
            accessibilityHint={
              sending
                ? "Cancels the current request"
                : input.trim()
                ? "Sends your message to Kabayan AI"
                : "Opens the live voice assistant"
            }
            style={[
              {
                marginLeft: 8,
                height: 44,
                width: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                backgroundColor: sending || input.trim() ? BRAND_BLUE : t.isDarkMode ? SURFACE_DARK : SURFACE_LIGHT,
              },
              { transform: [{ scale: sendScale }] },
            ]}
          >
            {sending ? (
              <Feather name="square" size={16} color="#FFFFFF" />
            ) : input.trim() ? (
              <Feather name="arrow-up" size={18} color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="microphone-outline" size={20} color={t.icon} />
            )}
          </AnimatedTouchable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
