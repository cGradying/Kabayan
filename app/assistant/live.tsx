import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Platform, KeyboardAvoidingView, ScrollView, Animated, Easing } from "react-native";
import { router } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

// Voice is not wired up yet — no STT/audio pipeline exists in this app. This screen is an
// honest preview, not a working live assistant: no fake transcript, no controls that lie.
export default function AssistantLivePage() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const pulseOuter = useRef(new Animated.Value(0)).current;
  const pulseInner = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseOuter, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulseOuter, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseInner, { toValue: 1, duration: 1600, delay: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulseInner, { toValue: 0, duration: 1600, delay: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const outerScale = pulseOuter.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const innerScale = pulseInner.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
      className={`flex-1 ${t.bgPage}`}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 18 }}
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className={`h-12 w-12 items-center justify-center rounded-2xl border ${t.border} ${t.bgCard}`}
          >
            <Feather name="arrow-left" size={20} color={t.icon} />
          </TouchableOpacity>
          <View className="items-center">
            <Text className={`text-lg font-black ${t.text}`}>Kabayan Live</Text>
            <View className={`mt-1 self-center rounded-full px-2 py-0.5 ${t.brandSoft}`}>
              <Text maxFontSizeMultiplier={1.4} className={`text-[10px] font-black uppercase tracking-widest ${t.brand}`}>Voice preview</Text>
            </View>
          </View>
          <View className="h-12 w-12" />
        </View>

        <View className="flex-1 items-center justify-center py-10">
          <View className="items-center">
            <View className="h-64 w-64 items-center justify-center">
              <Animated.View
                className={`absolute h-64 w-64 rounded-full ${t.brandSoft}`}
                style={{ opacity: 0.35, transform: [{ scale: outerScale }] }}
              />
              <Animated.View
                className={`absolute h-52 w-52 rounded-full ${t.brandSoft}`}
                style={{ opacity: 0.6, transform: [{ scale: innerScale }] }}
              />
              <View className={`absolute h-40 w-40 rounded-full ${t.brandSoft}`} />
              <View className={`h-28 w-28 items-center justify-center rounded-full ${t.brandBg} shadow-lg`}>
                <MaterialCommunityIcons name="waveform" size={42} color="#FFFFFF" />
              </View>
            </View>
            <Text className={`mt-8 text-2xl font-black ${t.text}`}>Talk naturally</Text>
            <Text className={`mt-3 max-w-[280px] text-center text-sm leading-6 ${t.textMuted}`}>
              Voice is coming soon. For now, type your question on the Kabayan AI tab.
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              className={`mt-6 px-6 py-3 rounded-2xl ${t.brandBg}`}
            >
              <Text className="text-white font-black text-xs uppercase tracking-widest">Back to chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className={`rounded-[32px] border p-5 ${t.border} ${t.bgCard}`}>
          <Text maxFontSizeMultiplier={1.4} className={`text-[11px] font-black uppercase tracking-[2px] ${t.textMuted}`}>Coming soon</Text>
          <Text className={`mt-2 text-sm leading-6 ${t.textMuted}`}>
            Speak your question and hear jobs, store items, and nearby matches read back to you.
            These controls are disabled until voice is live.
          </Text>

          <View className="mt-5 flex-row items-center justify-center gap-4">
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel="Mute microphone, not available yet"
              accessibilityState={{ disabled: true }}
              className={`h-14 w-14 items-center justify-center rounded-full border ${t.border} ${t.bgPage}`}
              style={{ opacity: 0.4 }}
            >
              <Feather name="mic-off" size={20} color={t.icon} />
            </View>
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel="Play, not available yet"
              accessibilityState={{ disabled: true }}
              className={`h-16 w-16 items-center justify-center rounded-full ${t.brandBg}`}
              style={{ opacity: 0.4 }}
            >
              <MaterialCommunityIcons name="play" size={28} color="#FFFFFF" />
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Leave voice preview"
              className="h-14 w-14 items-center justify-center rounded-full bg-[#EF4444]"
            >
              <MaterialCommunityIcons name="phone-hangup-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
