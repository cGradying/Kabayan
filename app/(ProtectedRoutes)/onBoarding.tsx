import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  Dimensions,
  FlatList,
  ImageBackground,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import AuthenticationForm from "@/components/Auth/AuthenticationForm";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    icon: "briefcase-outline" as const,
    iconLib: "ion" as const,
    title: "Find Local Jobs",
    subtitle: "Browse hundreds of gigs posted by employers in your community. Get hired fast.",
    bg: "https://images.unsplash.com/photo-1504150559640-a0ce165d472d?w=800",
    accent: "#2563EB",
  },
  {
    id: "2",
    icon: "storefront-outline" as const,
    iconLib: "ion" as const,
    title: "Discover the Marketplace",
    subtitle: "Street food, kakanin, ulam — support local vendors and taste the best of Filipino cuisine.",
    bg: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
    accent: "#059669",
  },
  {
    id: "3",
    icon: "people-outline" as const,
    iconLib: "ion" as const,
    title: "Grow Your Community",
    subtitle: "Connect with Kabayan near you. Build trusted relationships, earn reputation, grow together.",
    bg: "https://images.unsplash.com/photo-1541976590-713941681591?w=800",
    accent: "#7C3AED",
  },
];

type AuthMode = "signIn" | "signUp" | null;

export default function OnBoarding() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const isLastSlide = activeIndex === SLIDES.length - 1;

  const handleNext = () => {
    if (!isLastSlide) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  };

  if (mode) {
    return (
      <ImageBackground
        source={{ uri: SLIDES[2].bg }}
        defaultSource={require('@/assets/images/splash-icon.png')}
        className="flex-1"
        resizeMode="cover"
      >
        <StatusBar barStyle="light-content" />
        <View className="flex-1 bg-black/70 px-5 pt-16 pb-10 justify-center">
          {/* Back to hero */}
          <Pressable
            onPress={() => setMode(null)}
            className="absolute top-14 left-5 bg-white/15 p-3 rounded-full"
          >
            <Feather name="chevron-left" size={20} color="white" />
          </Pressable>

          <View className="mb-6">
            <Text className="text-blue-400 font-black tracking-[4px] uppercase text-[11px] mb-1">Kabayan</Text>
            <Text className="text-3xl font-black text-white tracking-tight">
              {mode === "signIn" ? "Welcome back 👋" : "Join Kabayan 🇵🇭"}
            </Text>
            <Text className="text-slate-400 text-sm mt-2">
              {mode === "signIn"
                ? "Sign in to access your community."
                : "Create an account to start hiring or earning."}
            </Text>
          </View>

          <AuthenticationForm mode={mode} onModeChange={(m) => setMode(m)} />

          <View className="mt-4 flex-row justify-center">
            <Text className="text-slate-400 text-sm">
              {mode === "signIn" ? "New here? " : "Already have an account? "}
            </Text>
            <Pressable onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}>
              <Text className="text-blue-400 text-sm font-bold">
                {mode === "signIn" ? "Create account" : "Sign in"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef as any}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(idx);
        }}
        renderItem={({ item }) => (
          <ImageBackground
            source={{ uri: item.bg }}
            defaultSource={require('@/assets/images/splash-icon.png')}
            style={{ width }}
            className="flex-1"
            resizeMode="cover"
          >
            <View className="flex-1 bg-gradient-to-t from-black via-black/60 to-transparent px-8 pt-20 pb-10 justify-between"
              style={{ backgroundColor: 'rgba(0,0,0,0.58)' }}
            >
              {/* Brand mark */}
              <View className="flex-row items-center">
                <View
                  className="w-10 h-10 rounded-2xl items-center justify-center mr-3"
                  style={{ backgroundColor: item.accent }}
                >
                  <MaterialCommunityIcons name="handshake" size={20} color="white" />
                </View>
                <Text className="text-white font-black text-lg tracking-widest">KABAYAN</Text>
              </View>

              {/* Slide content */}
              <View>
                <View
                  className="w-16 h-16 rounded-[22px] items-center justify-center mb-6 shadow-2xl"
                  style={{ backgroundColor: item.accent + '25', borderWidth: 1.5, borderColor: item.accent + '60' }}
                >
                  <Ionicons name={item.icon} size={30} color={item.accent} />
                </View>

                <Text className="text-white text-4xl font-black tracking-tighter leading-10 mb-4">
                  {item.title}
                </Text>
                <Text className="text-slate-300 text-base font-medium leading-6 mb-8">
                  {item.subtitle}
                </Text>

                {/* Dot indicators — h-[4px] for visibility on budget Android screens */}
                <View className="flex-row gap-x-2 mb-8">
                  {SLIDES.map((_, i) => (
                    <View
                      key={i}
                      className="rounded-full"
                      style={{
                        height: 4,
                        width: i === activeIndex ? 28 : 8,
                        backgroundColor: i === activeIndex ? item.accent : 'rgba(255,255,255,0.35)',
                      }}
                    />
                  ))}
                </View>

                {/* CTA buttons */}
                {isLastSlide ? (
                  <View className="gap-y-3">
                    <Pressable
                      onPress={() => setMode("signIn")}
                      className="h-16 rounded-[24px] items-center justify-center shadow-xl active:opacity-90"
                      style={{ backgroundColor: item.accent }}
                    >
                      <Text className="text-white font-black text-base uppercase tracking-widest">
                        Sign In
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setMode("signUp")}
                      className="bg-white/10 h-16 rounded-[24px] items-center justify-center border border-white/20 active:opacity-80"
                    >
                      <Text className="text-white font-black text-base uppercase tracking-widest">
                        Create Account
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.replace("/(tabs)/home")}
                      className="items-center py-3"
                    >
                      <Text className="text-slate-400 text-sm font-semibold">
                        Browse as guest →
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="flex-row justify-between items-center">
                    <Pressable
                      onPress={() => router.replace("/(tabs)/home")}
                      className="py-2"
                    >
                      <Text className="text-slate-400 font-semibold text-sm">Skip</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleNext}
                      className="h-14 w-14 rounded-full items-center justify-center shadow-xl"
                      style={{ backgroundColor: item.accent }}
                    >
                      <Feather name="arrow-right" size={22} color="white" />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </ImageBackground>
        )}
      />
    </View>
  );
}
