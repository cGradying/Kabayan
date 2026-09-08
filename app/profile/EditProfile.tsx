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
  id_verification_status: "unverified" | "pending" | "verified" | "rejected" | null;
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
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState(false);

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
      setVerificationStatus(row?.id_verification_status ?? null);
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

  const handleResubmitId = async () => {
    if (submittingId || !userId) return;
    setSubmittingId(true);
    try {
      await api.post(`/api/profiles/${userId}/resubmit-id`, {});
      setVerificationStatus("pending");
      showFlashMessage("ID Resubmitted", "Your ID has been sent for re-verification.", "success");
    } catch (err) {
      showFlashMessage("Resubmit Failed", humanizeError(err, "Unable to resubmit ID."), "error");
    } finally {
      setSubmittingId(false);
    }
  };

  if (loading) {
    return (
      <View style={{paddingTop: inset.top}} className={`flex-1 items-center justify-center ${t.bgPage}`}>
        <ActivityIndicator />
        <Text className={`mt-2 ${t.textMuted}`}>Loading profile editor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
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
                  <View className={`w-24 h-24 rounded-3xl border-4 border-white ${t.bgSurface} items-center justify-center`}>
                    <Ionicons name="person" size={28} color={t.icon} />
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
                t={t}
              />
              <RoleChip
                label="Employer"
                active={form.jobRole === "employer"}
                onPress={() => setForm((prev) => ({ ...prev, jobRole: "employer" }))}
                t={t}
              />
            </View>

            <Text className={`text-[10px] font-black uppercase tracking-widest mt-5 ${t.textMuted}`}>Store Role</Text>
            <View className="mt-2 flex-row gap-2">
              <RoleChip
                label="Buyer"
                active={form.marketRole === "buyer"}
                onPress={() => setForm((prev) => ({ ...prev, marketRole: "buyer" }))}
                t={t}
              />
              <RoleChip
                label="Vendor"
                active={form.marketRole === "vendor"}
                onPress={() => setForm((prev) => ({ ...prev, marketRole: "vendor" }))}
                t={t}
              />
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className={`mt-6 h-12 rounded-2xl items-center justify-center ${saving ? "bg-blue-400" : t.brandBg}`}
            >
              <Text className="text-white font-black uppercase tracking-widest">
                {saving ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>

          <View className={`mt-6 rounded-3xl border px-5 py-5 ${t.border} ${t.bgCard}`}>
            <Text className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>ID Verification</Text>
            <Text className={`mt-2 text-sm leading-5 ${t.textMuted}`}>
              A valid government ID confirms your identity and builds trust.
            </Text>

            <View className={`mt-4 rounded-2xl border px-4 py-3 ${t.border} ${t.bgSurface}`}>
              <Text className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>Status</Text>
              <View className="mt-1.5 flex-row items-center gap-2">
                {verificationStatus === "verified" ? (
                  <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                ) : verificationStatus === "pending" ? (
                  <Ionicons name="time" size={20} color="#F59E0B" />
                ) : verificationStatus === "rejected" ? (
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                ) : (
                  <Ionicons name="shield-outline" size={20} color={t.icon} />
                )}
                <Text
                  className={`text-base font-extrabold ${
                    verificationStatus === "verified"
                      ? "text-emerald-600"
                      : verificationStatus === "pending"
                        ? "text-amber-600"
                        : verificationStatus === "rejected"
                          ? "text-rose-600"
                          : t.text
                  }`}
                >
                  {verificationStatus === "verified"
                    ? "Verified"
                    : verificationStatus === "pending"
                      ? "Under Review"
                      : verificationStatus === "rejected"
                        ? "Rejected"
                        : "Not Submitted"}
                </Text>
              </View>
            </View>

            <Text className={`mt-3 text-[10px] leading-4 ${t.textMuted}`}>
              Note: Google API keys used for location features may be exposed through client-side verification processes.
            </Text>

            {verificationStatus === "rejected" ? (
              <TouchableOpacity
                onPress={handleResubmitId}
                disabled={submittingId}
                className="mt-4 h-11 rounded-2xl items-center justify-center bg-amber-600"
              >
                <Text className="text-white font-black text-xs uppercase tracking-widest">
                  {submittingId ? "Resubmitting..." : "Resubmit for Verification"}
                </Text>
              </TouchableOpacity>
            ) : null}

            {verificationStatus === "unverified" || verificationStatus === null ? (
              <TouchableOpacity
                onPress={() => {
                  if (!userId) {
                    showFlashMessage("Sign in required", "Please sign in to submit your ID.", "warning");
                    return;
                  }
                  handleResubmitId();
                }}
                disabled={submittingId}
                className="mt-4 h-11 rounded-2xl items-center justify-center bg-blue-600"
              >
                <Text className="text-white font-black text-xs uppercase tracking-widest">
                  {submittingId ? "Submitting..." : "Submit ID for Verification"}
                </Text>
              </TouchableOpacity>
            ) : null}
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
  t,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  t: ReturnType<typeof useTheme>["t"];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 h-10 rounded-xl items-center justify-center border ${active ? "bg-blue-600 border-blue-600" : `${t.bgSurface} ${t.border}`}`}
    >
      <Text className={`text-xs font-black uppercase tracking-widest ${active ? "text-white" : t.text}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
