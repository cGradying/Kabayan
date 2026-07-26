import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

interface CustomBackButtonProps {
  color?: string;
}

export default function CustomBackButton({ color }: CustomBackButtonProps) {
  const router = useRouter();
  const { t } = useTheme();

  return (
    <Pressable
      className="ml-5 h-10 w-10 items-center justify-center rounded-2xl"
      style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
      onPress={() => router.back()}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Feather size={18} color={color ?? "#FFFFFF"} name="arrow-left" />
    </Pressable>
  );
}
