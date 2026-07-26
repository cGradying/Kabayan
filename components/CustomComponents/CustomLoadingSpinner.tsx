import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from '@/hooks/useTheme';

export default function CustomLoadingSpinner({ message = "Loading…" }) {
  const { t } = useTheme();
  const rotateValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View className={`flex-1 justify-center items-center ${t.bgPage}`}>
      <View className="items-center justify-center">

        <View className={`${t.brandSoft} w-24 h-24 rounded-[40px] items-center justify-center shadow-sm`}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <MaterialCommunityIcons
              name="loading"
              size={42}
              color={t.accent}
            />
          </Animated.View>
        </View>

        <View className="mt-8 items-center">
          <Text className={`text-lg font-black tracking-tighter ${t.text}`}>
            Please wait
          </Text>
          <Text className={`text-[10px] font-black uppercase tracking-[2px] mt-2 ${t.textMuted}`}>
            {message}
          </Text>
        </View>

        {/* Watermark inside the column — visible in any container size */}
        <View className="mt-6">
          <Text className="text-blue-600/30 font-black tracking-[4px] text-[10px]">
            KABAYAN
          </Text>
        </View>

      </View>
    </View>
  );
}
