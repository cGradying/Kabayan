import React, { useEffect } from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type FlashVariant = "info" | "success" | "error" | "warning";

export type FlashMessage = {
  title: string;
  description?: string;
  variant?: FlashVariant;
  /** Auto-dismiss delay in ms. Defaults to 3000. Pass 0 to disable auto-dismiss. */
  duration?: number;
};

type AppFlashMessageProps = {
  message: FlashMessage | null;
  onClose: () => void;
};

const paletteByVariant: Record<
  FlashVariant,
  {
    bg: string;
    border: string;
    text: string;
    icon: string;
    iconName: keyof typeof Ionicons.glyphMap;
  }
> = {
  info: {
    bg: "#EFF6FF",
    border: "#BFDBFE",
    text: "#1D4ED8",
    icon: "#1D4ED8",
    iconName: "information-circle",
  },
  success: {
    bg: "#ECFDF5",
    border: "#A7F3D0",
    text: "#047857",
    icon: "#047857",
    iconName: "checkmark-circle",
  },
  error: {
    bg: "#FEF2F2",
    border: "#FECACA",
    text: "#B91C1C",
    icon: "#B91C1C",
    iconName: "alert-circle",
  },
  warning: {
    bg: "#FFF7ED",
    border: "#FED7AA",
    text: "#C2410C",
    icon: "#C2410C",
    iconName: "warning",
  },
};

export default function AppFlashMessage({ message, onClose }: AppFlashMessageProps) {
  const duration = message?.duration ?? 3000;

  useEffect(() => {
    if (!message) return;
    if (duration === 0) return; // caller opted out of auto-dismiss
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const variant = message.variant ?? "info";
  const palette = paletteByVariant[variant];

  return (
    <TouchableOpacity
      onPress={onClose}
      activeOpacity={0.95}
      style={{ backgroundColor: palette.bg, borderColor: palette.border }}
      className="mx-4 mb-3 p-3 rounded-2xl border"
    >
      <View className="flex-row items-start">
        <Ionicons name={palette.iconName} size={18} color={palette.icon} />
        <View className="ml-2 flex-1">
          <Text style={{ color: palette.text }} className="text-xs font-black uppercase tracking-widest">
            {message.title}
          </Text>
          {message.description ? (
            <Text style={{ color: palette.text }} className="mt-1 text-xs font-semibold leading-5">
              {message.description}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
