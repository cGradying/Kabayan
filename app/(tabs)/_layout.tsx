import React, { useState } from "react";
import { Tabs, useNavigation } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "@/hooks/useTheme";
import { DrawerActions } from "@react-navigation/native"

export default function TabsLayout() {
  const { t } = useTheme();
  const inset = useSafeAreaInsets()
  const navigation = useNavigation()
  const [unreadCount] = useState(3)

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: "800",
          color: t.isDarkMode ? "#F0F4FF" : "#0F172A",
        },
        headerTitle: () => null,
        headerStyle: {
          backgroundColor: t.isDarkMode ? "#0F172A" : "#FFFFFF",
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: t.isDarkMode ? "#1E293B" : "#F1F5F9",
          height: 100,
        },
        tabBarStyle: {
          backgroundColor: t.isDarkMode ? "#0F172A" : "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: t.isDarkMode ? "#1E293B" : "#F1F5F9",
          height: 60 + inset.bottom,
          paddingBottom: inset.bottom + 4,
          paddingTop: 6,
        },
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: t.isDarkMode ? "#64748B" : "#94A3B8",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        headerRight: () => (
          <Pressable
            className="mr-5 p-2 rounded-xl"
            onPress={() => Alert.alert("Notifications", "Push notifications coming soon!")}
            accessibilityLabel="Notifications"
            accessibilityRole="button"
          >
            <Ionicons name="notifications-outline" size={20} color={t.icon} />
          </Pressable>
        ),

      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="grid" color={color} size={focused ? 24 : 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Jobs",
          tabBarLabel: "Jobs",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name="briefcase-variant-outline" color={color} size={focused ? 24 : 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: "Kabayan AI",
          tabBarLabel: "AI",
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarButton: (props) => (
            <Pressable
              {...props}
              style={{ top: -18 }}
              className="items-center justify-center"
            >
              <View
                style={{
                  height: 68,
                  width: 68,
                  borderRadius: 22,
                  backgroundColor: t.isDarkMode ? '#0F172A' : '#FFFFFF',
                  padding: 4,
                  shadowColor: '#2563EB',
                  shadowOpacity: 0.35,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 12,
                }}
              >
                <View className="flex-1 rounded-[18px] bg-blue-600 items-center justify-center">
                  <MaterialCommunityIcons name="robot-excited-outline" color="#FFFFFF" size={28} />
                </View>
              </View>
              <Text className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-blue-600">AI</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="marketPlace"
        options={{
          title: "Market",
          tabBarLabel: "Market",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="shopping-bag" color={color} size={focused ? 24 : 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="message"
        options={{
          title: "Message",
          tabBarLabel: "Message",
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#EF4444',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: '800',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
          },
          tabBarIcon: ({ color, focused }) => (
            <Feather name="message-circle" color={color} size={focused ? 24 : 22} />
          ),
        }}
      />
    </Tabs>
  );
}
