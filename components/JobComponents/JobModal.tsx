import React, { useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { api, getStoredUser } from "@/utils/api";
import { geocodeAddress } from "@/utils/googleGeocode";
import humanizeError from "@/utils/humanizeError";

const FALLBACK_COORDINATE = {
  latitude: 14.5995,
  longitude: 120.9842,
};

type CreatedJob = {
  id: string;
  title: string;
  description: string;
  location_label: string;
  budget_min: number;
  budget_max: number;
  is_urgent: boolean;
  status: string;
  created_at: string;
};

type JobModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreated?: (job?: CreatedJob) => void;
};

export default function JobModal({ visible, onClose, onCreated }: JobModalProps) {
  const { t } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [requirements, setRequirements] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setBudgetMin("");
    setBudgetMax("");
    setRequirements("");
    setError(null);
  };

  const handleSave = async () => {
    if (saving) return;
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = location.trim();
    const min = budgetMin.trim() === "" ? 0 : Number(budgetMin);
    const max = budgetMax.trim() === "" ? 0 : Number(budgetMax);

    if (!trimmedTitle || !trimmedDescription || !trimmedLocation) {
      setError("Title, description, and location are required.");
      return;
    }

    if (Number.isNaN(min) || Number.isNaN(max)) {
      setError("Budget must be a valid number.");
      return;
    }

    if (max < min) {
      setError("Maximum budget must be greater than or equal to minimum budget.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const user = await getStoredUser();
      const employerId = user?.id;
      if (!employerId) {
        throw new Error("You must be signed in to post a job.");
      }

      let latitude = FALLBACK_COORDINATE.latitude;
      let longitude = FALLBACK_COORDINATE.longitude;
      try {
        const geo = await geocodeAddress(trimmedLocation);
        if (geo) {
          latitude = geo.latitude;
          longitude = geo.longitude;
        }
      } catch {
        // Keep fallback coordinates so the insert remains valid.
      }

      const requirementsArray = requirements
        ? requirements
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean)
        : [];

      const data = await api.post<any>("/api/jobs", {
        employer_id: employerId,
        title: trimmedTitle,
        description: trimmedDescription,
        location_label: trimmedLocation,
        latitude,
        longitude,
        budget_min: min,
        budget_max: max,
        requirements: requirementsArray,
        status: "open",
        is_urgent: false,
      });

      clearForm();
      onCreated?.(data as unknown as CreatedJob | undefined);
      onClose();
    } catch (err) {
      const message = humanizeError(err, "Failed to post job.");
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.bottom : 0}
        className="flex-1 justify-end"
      >
        <View style={{ paddingBottom: insets.bottom }} className="flex-1 bg-black/50 justify-end">
          <View className={`max-h-[80%] rounded-t-[32px] p-6 ${t.bgCard}`}>
            <View className="items-center mb-3">
              <View className={`w-10 h-1 rounded-full ${t.isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
            </View>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className={`w-10 h-10 rounded-2xl ${t.brandSoft} items-center justify-center mr-3`}>
                  <Feather name="briefcase" size={20} color={t.accent} />
                </View>
                <View>
                  <Text className={`text-xl font-black ${t.text}`}>Create Job Post</Text>
                  <Text className={`text-xs ${t.textMuted}`}>List what you need — skills, credentials, and scope.</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={t.icon} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <Field
                label="Job title"
                placeholder="e.g. Master Plumber needed for leak repair"
                value={title}
                onChangeText={setTitle}
                icon="edit-3"
                t={t}
              />
              <Field
                label="Location"
                placeholder="e.g. Makati City, Philippines"
                value={location}
                onChangeText={setLocation}
                icon="map-pin"
                t={t}
              />

              <View className="mb-4">
                <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1 ${t.textMuted}`}>
                  Budget Range (PHP)
                </Text>
                <View className="flex-row gap-3">
                  <View className={`flex-1 h-14 px-4 rounded-2xl border ${t.border} ${t.bgSurface} flex-row items-center`}>
                    <Feather name="dollar-sign" size={16} color={t.icon} />
                    <TextInput
                      value={budgetMin}
                      onChangeText={setBudgetMin}
                      placeholder="Min"
                      keyboardType="numeric"
                      placeholderTextColor={t.isDarkMode ? "#475569" : "#94A3B8"}
                      className={`flex-1 ml-2 font-semibold ${t.text}`}
                    />
                  </View>
                  <View className={`flex-1 h-14 px-4 rounded-2xl border ${t.border} ${t.bgSurface} flex-row items-center`}>
                    <TextInput
                      value={budgetMax}
                      onChangeText={setBudgetMax}
                      placeholder="Max"
                      keyboardType="numeric"
                      placeholderTextColor={t.isDarkMode ? "#475569" : "#94A3B8"}
                      className={`flex-1 font-semibold ${t.text}`}
                    />
                  </View>
                </View>
              </View>

              <Field
                label="What's the work?"
                placeholder="Describe the job, tools needed, schedule, scope…"
                value={description}
                onChangeText={setDescription}
                icon="file-text"
                multiline
                t={t}
              />
              <Field
                label="Requirements"
                placeholder="e.g. Plumbing license, TESDA cert, photos of past work"
                value={requirements}
                onChangeText={setRequirements}
                icon="check-square"
                t={t}
              />

              <View className="mt-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <Text className={`text-[10px] font-black uppercase tracking-[1.5px] mb-1 ${t.warning}`}>
                  Tips like Indeed
                </Text>
                <Text className={`text-xs leading-5 ${t.textMuted}`}>
                  Be specific about qualifications (certifications, years of experience, diploma), tools needed, and when the work should start. Clear posts attract better applicants.
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="mt-6 bg-blue-600 h-14 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/30"
                activeOpacity={0.9}
              >
                <Text className="text-white font-black uppercase text-base tracking-widest">
                  {saving ? "Saving\u2026" : "Post Job"}
                </Text>
              </TouchableOpacity>
              {error && (
                <View className="mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-400/30">
                  <Text className="text-red-500 text-xs font-semibold">{error}</Text>
                </View>
              )}
              <View className="h-4" />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  icon: keyof typeof Feather.glyphMap;
  multiline?: boolean;
  t: any;
};

function Field({ label, value, onChangeText, placeholder, icon, multiline, t }: FieldProps) {
  return (
    <View className="mb-4">
      <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1 ${t.textMuted}`}>{label}</Text>
      <View className={`flex-row items-center px-4 rounded-2xl border ${t.border} ${t.bgSurface} ${multiline ? "py-3" : "h-14"}`}>
        <Feather name={icon} size={18} color={t.icon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.isDarkMode ? "#475569" : "#94A3B8"}
          multiline={multiline}
          keyboardType={icon === "dollar-sign" ? "numeric" : "default"}
          textAlignVertical={multiline ? "top" : "center"}
          className={`flex-1 ml-3 font-semibold ${t.text}`}
          style={multiline ? { minHeight: 80 } : undefined}
        />
      </View>
    </View>
  );
}
