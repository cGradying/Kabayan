import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from "expo-router";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";

const FEATURES = [
  { icon: "briefcase-outline" as const, label: "Find Local Jobs" },
  { icon: "storefront-outline" as const, label: "Explore Marketplace" },
  { icon: "people-outline" as const, label: "Grow Your Network" },
];

export default function Landing() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#0D1B2A]">
      <StatusBar barStyle="light-content" />

      {/* Abstract geometric background — increased opacity for visual payoff */}
      <View className="absolute inset-0">
        <View
          className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 bg-blue-500"
          style={{ transform: [{ translateX: 80 }, { translateY: -80 }] }}
        />
        <View
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-20 bg-blue-700"
          style={{ transform: [{ translateX: -80 }, { translateY: 80 }] }}
        />
        {/* Second smaller accent blob */}
        <View
          className="absolute top-1/3 left-8 w-48 h-48 rounded-full opacity-20 bg-blue-400"
          style={{ transform: [{ scale: 1.2 }] }}
        />
        <View
          className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-10 bg-white"
          style={{ transform: [{ translateX: -32 }, { translateY: -80 }] }}
        />
      </View>

      <View className="flex-1 px-8 pt-20 pb-12 justify-between">
        {/* Top brand */}
        <View className="flex-row items-center">
          <View className="w-11 h-11 bg-blue-600 rounded-[16px] items-center justify-center mr-3 shadow-lg shadow-blue-600/40">
            <MaterialCommunityIcons name="handshake" size={22} color="white" />
          </View>
          <View>
            <Text className="text-white font-black text-xl tracking-widest">KABAYAN</Text>
            <Text className="text-blue-400 text-[10px] font-bold tracking-widest uppercase">Community Power 🇵🇭</Text>
          </View>
        </View>

        {/* Hero copy */}
        <View>
          <Text className="text-white text-[42px] font-black tracking-tighter leading-[44px] mb-4">
            Your{"\n"}Community,{"\n"}Your Market.
          </Text>
          <Text className="text-slate-400 text-base font-medium leading-6 mb-8">
            Find jobs, discover local vendors, and connect with Kabayan near you.
          </Text>

          {/* Feature chips — check icon moved to LEFT of label */}
          <View className="gap-y-3 mb-10">
            {FEATURES.map((f) => (
              <View key={f.label} className="flex-row items-center">
                {/* Check circle on the left */}
                <View className="w-5 h-5 rounded-full bg-emerald-500/20 items-center justify-center mr-3">
                  <Feather name="check" size={12} color="#10B981" />
                </View>
                {/* Feature icon */}
                <View className="w-8 h-8 bg-blue-600/20 rounded-xl items-center justify-center mr-3">
                  <MaterialCommunityIcons name={f.icon} size={16} color="#60A5FA" />
                </View>
                <Text className="text-slate-300 font-semibold text-sm">{f.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTAs */}
        <View className="gap-y-3">
          <TouchableOpacity
            onPress={() => router.push('/(ProtectedRoutes)/onBoarding')}
            activeOpacity={0.9}
            className="bg-blue-600 h-16 rounded-[24px] flex-row items-center justify-center shadow-2xl shadow-blue-600/50"
          >
            <Text className="text-white font-black text-base uppercase tracking-widest">Get Started</Text>
            <Feather name="arrow-right" size={20} color="white" style={{ marginLeft: 10 }} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/home')}
            activeOpacity={0.7}
            className="h-16 rounded-[24px] items-center justify-center border border-white/15"
          >
            <Text className="text-slate-400 font-bold text-sm uppercase tracking-widest">Browse as Guest</Text>
          </TouchableOpacity>

          {/* Footer — slate-400 for WCAG-passing contrast on #0D1B2A */}
          <View className="items-center mt-2">
            <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-[3px]">
              Made with ❤️ for Filipinos
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
