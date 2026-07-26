import React, { useMemo, useCallback } from "react";
import { View, Text } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { useTheme } from "@/hooks/useTheme";

interface CustomBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  type?: "signIn" | "signUp";
}

export default function CustomBottomSheet({ bottomSheetRef, type }: CustomBottomSheetProps) {
  const { t } = useTheme();
  const snapPoints = useMemo(() => ["65%", "90%"], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: t.isDarkMode ? "#334155" : "#CBD5E1", width: 40 }}
      backgroundStyle={{ 
        backgroundColor: t.isDarkMode ? "#0F172A" : "#FFFFFF", 
        borderRadius: 30 
      }}
    >
      <BottomSheetView className="p-8">
        <View className="gap-y-3">
          <Text className={`text-2xl font-black tracking-tighter ${t.text}`}>Authentication</Text>
          <Text className={`text-sm ${t.textMuted}`}>
            The sign-in and sign-up forms now live in the dedicated <Text className="font-semibold">AuthenticationForm</Text> component.
            Use it directly in the authentication page for a full-screen experience.
          </Text>
          <View className={`p-4 rounded-2xl ${t.bgSurface} border ${t.border}`}>
            <Text className={`text-xs ${t.textMuted}`}>
              To launch auth, navigate to the Authentication screen. This bottom sheet is kept for compatibility and no longer renders forms.
            </Text>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
