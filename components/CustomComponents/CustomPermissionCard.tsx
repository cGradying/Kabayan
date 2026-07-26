
import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from '@/hooks/useTheme';

interface PermissionProps {
  title: string;
  description: string;
  icon: keyof typeof Feather | any;
  buttonLabel?: string;
  onGrant: () => void;
  onSkip?: () => void;
  isVerifying?: boolean;
}

export default function CustomPermissionGate({ 
  title, 
  description, 
  icon, 
  buttonLabel = "Allow Access", 
  onGrant, 
  onSkip,
  isVerifying = false 
}: PermissionProps) {
  const { t } = useTheme();

  return (
    <SafeAreaView className={`flex-1 ${t.bgPage}`}>
      <View className="flex-1 px-10 justify-center items-center">
        
        <View className={`${t.brandSoft} w-32 h-32 rounded-[48px] items-center justify-center mb-10 shadow-sm border ${t.border}`}>
          <Feather name={icon} size={48} color={t.accent} />
          <View className="absolute -bottom-1 -right-1 bg-blue-600 p-2 rounded-full border-4 border-white">
            <Feather name="plus" size={14} color="white" />
          </View>
        </View>

        <View className="items-center mb-12">
          <Text className={`text-3xl font-black tracking-tighter text-center leading-9 ${t.text}`}>
            {title}
          </Text>
          <Text className={`text-sm font-medium text-center mt-4 leading-6 ${t.textMuted}`}>
            {description}
          </Text>
        </View>

        <View className="w-full gap-y-4">
          <TouchableOpacity 
            onPress={onGrant}
            disabled={isVerifying}
            activeOpacity={0.8}
            className="bg-blue-600 h-16 rounded-3xl items-center justify-center shadow-lg shadow-blue-500/30"
          >
            <Text className="text-white font-black uppercase text-sm tracking-widest">
              {isVerifying ? "Requesting..." : buttonLabel}
            </Text>
          </TouchableOpacity>

          {onSkip && (
            <TouchableOpacity 
              onPress={onSkip}
              activeOpacity={0.7}
              className={`h-16 rounded-3xl items-center justify-center border ${t.border} ${t.bgCard}`}
            >
              <Text className={`font-black uppercase text-sm tracking-widest ${t.textMuted}`}>
                Not Now
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          onPress={() => Linking.openSettings()}
          className="mt-10"
        >
          <Text className={`text-[10px] font-black uppercase tracking-[2px] ${t.brand}`}>
            Open System Settings
          </Text>
        </TouchableOpacity>

      </View>

      <View className="absolute bottom-10 left-0 right-0 items-center px-12">
        <View className={`flex-row items-center px-4 py-2 rounded-full ${t.bgSurface} border ${t.border}`}>
          <MaterialCommunityIcons name="shield-check" size={14} color="#10B981" />
          <Text className={`ml-2 text-[10px] font-bold ${t.textMuted}`}>
            Kabayan Security & Privacy
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}