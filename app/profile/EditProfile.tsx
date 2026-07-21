import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/hooks/useTheme";
import { api, getStoredUser } from "@/utils/api";
import AppFlashMessage from "@/components/CustomComponents/AppFlashMessage";
import useFlashMessage from "@/hooks/useFlashMessage";
import humanizeError from "@/utils/humanizeError";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type EditProfileRow = {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  location_label: string | null;
  avatar_url: string | null;
  job_role: "worker" | "employer";
  market_role: "buyer" | "vendor";
  birth_date: string | null;
};

type FormState = {
  displayName: string;
  bio: string;
  location: string;
  birthDate: string;
  jobRole: "worker" | "employer";
  marketRole: "buyer" | "vendor";
};

const emptyForm: FormState = {
  displayName: "",
  bio: "",
  location: "",
  birthDate: "",
  jobRole: "worker",
  marketRole: "buyer",
};

const isValidBirthDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
};

export default function EditProfile() {
  const { t } = useTheme();
  const inset = useSafeAreaInsets()
  const router = useRouter();
  const { flashMessage, showFlashMessage, hideFlashMessage } = useFlashMessage();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getStoredUser();
      const uid = user?.id ?? null;
      setUserId(uid);

      if (!uid) {
        setForm(emptyForm);
        setAvatarUri(null);
        return;
      }

      const data = await api.get<any>(`/api/profiles/${uid}`);

      const row = (data ?? null) as EditProfileRow | null;
      setForm({
        displayName: row?.display_name ?? "",
        bio: row?.bio ?? "",
        location: row?.location_label ?? "",
        birthDate: row?.birth_date ?? "",
        jobRole: row?.job_role ?? "worker",
        marketRole: row?.market_role ?? "buyer",
      });
      setAvatarUri(row?.avatar_url ?? null);
    } catch (err) {
      const message = humanizeError(err, "Failed to load profile.");
      showFlashMessage("Profile Load Failed", message, "error");
    } finally {
      setLoading(false);
    }
  }, [showFlashMessage]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showFlashMessage("Permission Required", "Allow photo library access to change your avatar.", "warning");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    if (!userId) {
      showFlashMessage("Sign in required", "Please sign in before editing your profile.", "warning");
      return;
    }

    const trimmedName = form.displayName.trim();
    const trimmedBirthDate = form.birthDate.trim();

    if (!trimmedName) {
      showFlashMessage("Missing name", "Display name is required.", "warning");
      return;
    }

    if (trimmedBirthDate && !isValidBirthDate(trimmedBirthDate)) {
      showFlashMessage("Invalid birth date", "Use YYYY-MM-DD format.", "warning");
      return;
    }

    setSaving(true);
    try {
      const data = await api.put<any>(`/api/profiles/${userId}`, {
        display_name: trimmedName,
        bio: form.bio.trim() || null,
        location_label: form.location.trim() || null,
        avatar_url: avatarUri,
        job_role: form.jobRole,
        market_role: form.marketRole,
        birth_date: trimmedBirthDate || null,
      });

      const row = (data ?? null) as EditProfileRow | null;
      if (row) {
        setForm({
          displayName: row.display_name ?? "",
          bio: row.bio ?? "",
          location: row.location_label ?? "",
          birthDate: row.birth_date ?? "",
          jobRole: row.job_role ?? "worker",
          marketRole: row.market_role ?? "buyer",
        });
        setAvatarUri(row.avatar_url ?? avatarUri);
      }

      showFlashMessage("Profile Updated", "Your changes were saved successfully.", "success");
    } catch (err) {
      const message = humanizeError(err, "Failed to save profile.");
      showFlashMessage("Save Failed", message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{paddingTop: inset.top}} className={`flex-1 items-center justify-center ${t.bgPage}`}>
        <ActivityIndicator />
        <Text className={`mt-2 ${t.textMuted}`}>Loading profile editor…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? inset.top + 18 : 12}
      style={{ flex: 1 }}
      className={`flex-1 ${t.bgPage}`}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentContainerStyle={{ paddingBottom: inset.bottom + 28 }}
      >
        <View className="h-32 bg-blue-600 w-full relative">
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-12 left-5 z-10 bg-white/20 p-2 rounded-full"
          >
            <Feather name="chevron-left" size={24} color="white" />
          </TouchableOpacity>
          <View className="absolute left-5 right-5 bottom-5">
            <Text className="text-white text-2xl font-black">Edit Profile</Text>
            <Text className="text-blue-100 text-xs font-semibold mt-1">
              Update your public details, roles, and account presence.
            </Text>
          </View>
        </View>

        <View style={{ paddingBottom: inset.bottom }} className="px-5 -mt-12">
          <AppFlashMessage message={flashMessage} onClose={hideFlashMessage} />

          <View className={`rounded-3xl p-5 border ${t.border} ${t.bgCard}`}>
            <View className="items-center">
              <View className="relative">
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} className="w-24 h-24 rounded-3xl border-4 border-white" />
                ) : (
                  <View className="w-24 h-24 rounded-3xl border-4 border-white bg-slate-200 items-center justify-center">
                    <Ionicons name="person" size={28} color="#64748B" />
                  </View>
                )}
                <TouchableOpacity
                  onPress={handlePickAvatar}
                  className="absolute bottom-0 right-0 bg-blue-600 w-8 h-8 rounded-full items-center justify-center border-2 border-white"
                >
                  <Feather name="camera" size={14} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-5">
              <Text className={`text-[10px] font-black uppercase tracking-widest mb-3 ${t.textMuted}`}>Basic Details</Text>
              <Field
                label="Display Name"
                value={form.displayName}
                onChangeText={(displayName) => setForm((prev) => ({ ...prev, displayName }))}
                placeholder="Your public name"
                t={t}
              />
              <Field
                label="Bio"
                value={form.bio}
                onChangeText={(bio) => setForm((prev) => ({ ...prev, bio }))}
                placeholder="Short professional summary"
                multiline
                t={t}
              />
              <Field
                label="Location"
                value={form.location}
                onChangeText={(location) => setForm((prev) => ({ ...prev, location }))}
                placeholder="City / area"
                t={t}
              />
              <Field
                label="Birth Date (YYYY-MM-DD)"
                value={form.birthDate}
                onChangeText={(birthDate) => setForm((prev) => ({ ...prev, birthDate }))}
                placeholder="1995-06-14"
                t={t}
              />
            </View>

            <Text className={`text-[10px] font-black uppercase tracking-widest mt-2 ${t.textMuted}`}>Job Role</Text>
            <View className="mt-2 flex-row gap-2">
              <RoleChip
                label="Worker"
                active={form.jobRole === "worker"}
                onPress={() => setForm((prev) => ({ ...prev, jobRole: "worker" }))}
              />
              <RoleChip
                label="Employer"
                active={form.jobRole === "employer"}
                onPress={() => setForm((prev) => ({ ...prev, jobRole: "employer" }))}
              />
            </View>

            <Text className={`text-[10px] font-black uppercase tracking-widest mt-5 ${t.textMuted}`}>Store Role</Text>
            <View className="mt-2 flex-row gap-2">
              <RoleChip
                label="Buyer"
                active={form.marketRole === "buyer"}
                onPress={() => setForm((prev) => ({ ...prev, marketRole: "buyer" }))}
              />
              <RoleChip
                label="Vendor"
                active={form.marketRole === "vendor"}
                onPress={() => setForm((prev) => ({ ...prev, marketRole: "vendor" }))}
              />
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className={`mt-6 h-12 rounded-2xl items-center justify-center ${saving ? "bg-blue-400" : "bg-blue-600"}`}
            >
              <Text className="text-white font-black uppercase tracking-widest">
                {saving ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  t,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  t: ReturnType<typeof useTheme>["t"];
}) {
  return (
    <View className="mb-4">
      <Text className={`text-[10px] font-black uppercase tracking-widest mb-2 ${t.textMuted}`}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.icon}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={`px-4 ${multiline ? "py-3 min-h-[90px]" : "h-12"} rounded-2xl border ${t.border} ${t.bgSurface} ${t.text}`}
      />
    </View>
  );
}

function RoleChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 h-10 rounded-xl items-center justify-center border ${active ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"}`}
    >
      <Text className={`text-xs font-black uppercase tracking-widest ${active ? "text-white" : "text-slate-700"}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
