import React, { useMemo } from "react";
import { ImageBackground, TouchableOpacity, View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

type EntityHeroBannerProps = {
  title?: string;
  subtitle?: string | null;
  eyebrow?: string | null;
  meta?: string | null;
  imageUri?: string | null;
  seed: string;
  topInset?: number;
  height?: number;
  onBack?: () => void;
  onSecondaryPress?: () => void;
  secondaryIcon?: keyof typeof Feather.glyphMap;
};

const THEMES = [
  { background: "#DBEAFE", accent: "#2563EB", shapeA: "#93C5FD", shapeB: "#BFDBFE", text: "#0F172A" },
  { background: "#DCFCE7", accent: "#059669", shapeA: "#86EFAC", shapeB: "#BBF7D0", text: "#052E16" },
  { background: "#FCE7F3", accent: "#DB2777", shapeA: "#F9A8D4", shapeB: "#FBCFE8", text: "#500724" },
  { background: "#FEF3C7", accent: "#D97706", shapeA: "#FCD34D", shapeB: "#FDE68A", text: "#451A03" },
  { background: "#E0E7FF", accent: "#4F46E5", shapeA: "#A5B4FC", shapeB: "#C7D2FE", text: "#1E1B4B" },
  { background: "#F1F5F9", accent: "#0F172A", shapeA: "#CBD5E1", shapeB: "#E2E8F0", text: "#0F172A" },
];

const getTheme = (seed: string) => {
  const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return THEMES[Math.abs(hash) % THEMES.length];
};

export default function EntityHeroBanner({
  title,
  subtitle,
  eyebrow,
  imageUri,
  seed,
  topInset = 0,
  height = 160,
  onBack,
}: EntityHeroBannerProps) {
  const theme = useMemo(() => getTheme(seed), [seed]);
  const { t } = useTheme();

  return (
    <View
      className="relative w-full overflow-hidden"
      style={{ height, backgroundColor: theme.background }}
    >
      {imageUri ? (
        <ImageBackground source={{ uri: imageUri }} resizeMode="cover" className="absolute inset-0">
          <View className="absolute inset-0" style={{ backgroundColor: "rgba(15,23,42,0.28)" }} />
        </ImageBackground>
      ) : (
        <>
          <View
            className="absolute rounded-full"
            style={{
              width: 132,
              height: 140,
              right: -28,
              top: 8,
              opacity: 0.78,
              backgroundColor: theme.shapeA,
            }}
          />
          <View
            className="absolute rounded-full"
            style={{
              width: 84,
              height: 84,
              left: -10,
              bottom: -12,
              opacity: 0.72,
              backgroundColor: theme.shapeB,
            }}
          />
          <View
            className="absolute rounded-[32px]"
            style={{
              width: 104,
              height: 104,
              right: 16,
              bottom: -46,
              borderWidth: 12,
              borderColor: `${theme.accent}25`,
              transform: [{ rotate: "-14deg" }],
            }}
          />
        </>
      )}

      {(title || eyebrow) && (
        <View
          className="absolute bottom-0 left-0 right-0 px-5 pb-4 z-[2]"
          style={{ backgroundColor: imageUri ? 'rgba(15,23,42,0.55)' : 'transparent' }}
        >
          {eyebrow && (
            <Text className="text-[10px] font-black uppercase tracking-[2px] text-white/70 mb-1">
              {eyebrow}
            </Text>
          )}
          {title && (
            <Text className="text-xl font-black tracking-tight text-white">
              {title}
            </Text>
          )}
          {subtitle && (
            <Text className="text-xs font-semibold mt-0.5 text-white/70">
              {subtitle}
            </Text>
          )}
        </View>
      )}

      <View
        className="absolute left-[18px] right-[18px] z-[2] flex-row justify-between"
        style={{ top: topInset + 8 }}
      >
        <TouchableOpacity
          onPress={onBack}
          className="h-[42px] w-[42px] items-center justify-center rounded-2xl"
          style={{
            backgroundColor: imageUri ? 'rgba(255,255,255,0.9)' : (t.isDarkMode ? '#1A2540' : 'rgba(255,255,255,0.9)'),
          }}
        >
          <Feather name="chevron-left" size={22} color={t.isDarkMode ? '#F0F4FF' : '#0F172A'} />
        </TouchableOpacity>
        <View className="h-[42px] w-[42px]" />
      </View>
    </View>
  );
}
