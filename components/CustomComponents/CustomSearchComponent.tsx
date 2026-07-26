import React from 'react';
import { TextInput, View, Pressable } from 'react-native';
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from '@/hooks/useTheme';

type Props = {
  onNavigateToMap?: () => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  value?: string;
};

export default function CustomSearchComponent({
  onNavigateToMap,
  onSearch,
  placeholder = "Search for skills or food...",
  value,
}: Props) {
  const { t } = useTheme();
  const showMapButton = typeof onNavigateToMap === "function";

  return (
      <View className={`flex-row items-center h-12 px-4 rounded-2xl border ${t.border} ${t.bgSurface}`}>
        <Feather name="search" color={t.icon} size={18} />
        
        <TextInput 
          className={`flex-1 h-full ml-3 text-sm font-medium ${t.text}`}
          placeholder={placeholder}
          placeholderTextColor={t.isDarkMode ? "#64748B" : "#94A3B8"}
          onChangeText={onSearch}
          value={value}
          selectionColor="#2563EB"
        />
        {showMapButton ? (
          <>
            <View style={{ width: 1, height: 24, marginHorizontal: 12, backgroundColor: t.isDarkMode ? '#1E293B' : '#E2E8F0' }} />
            <Pressable
              onPress={onNavigateToMap}
              className="p-1 active:opacity-50"
              accessibilityLabel="View map"
              accessibilityRole="button"
            >
              <FontAwesome5 name="map-marked-alt" color={t.accent} size={18} />
            </Pressable>
          </>
        ) : null}
        
      </View>
  );
}
