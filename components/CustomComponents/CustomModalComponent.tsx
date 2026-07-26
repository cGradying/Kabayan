import { router } from "expo-router";
import { Modal, Text, KeyboardAvoidingView, Platform, View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

interface CustomModalProps {
  authModalVisible: boolean;
  setAuthModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function CustomModal({ authModalVisible, setAuthModalVisible }: CustomModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTheme();

  return (
    <Modal
      visible={authModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setAuthModalVisible(false)}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <View className="flex-1 bg-black/50 justify-center px-5">
          <View className={`rounded-[28px] p-6 border ${t.border} ${t.bgCard}`}>

            {/* Icon */}
            <View className="items-center mb-4">
              <View className={`w-16 h-16 rounded-[22px] ${t.brandSoft} items-center justify-center`}>
                <MaterialCommunityIcons name="message-lock-outline" size={28} color="#2563EB" />
              </View>
            </View>

            <Text className={`text-xl font-black text-center ${t.text}`}>
              Sign in to Message
            </Text>
            <Text className={`text-sm text-center mt-2 mb-6 leading-5 ${t.textMuted}`}>
              Create an account to send messages and connect with employers and vendors.
            </Text>

            <TouchableOpacity
              onPress={() => {
                setAuthModalVisible(false);
                router.push("/(ProtectedRoutes)/AuthenticationPage");
              }}
              className="h-12 rounded-2xl bg-blue-600 items-center justify-center mb-3"
              activeOpacity={0.88}
            >
              <Text className="text-white font-black text-sm uppercase tracking-widest">
                Create Account
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAuthModalVisible(false)}
              className={`h-12 rounded-2xl border items-center justify-center ${t.border} ${t.bgSurface}`}
              activeOpacity={0.88}
            >
              <Text className={`font-black text-sm uppercase tracking-widest ${t.textMuted}`}>
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
