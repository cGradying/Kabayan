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

      // Use Google Geocoding API for consistent, accurate coordinates
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
          <View className={`max-h-[80%] bg-white rounded-t-[32px] p-6 ${t.bgCard}`}>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-blue-100 items-center justify-center mr-3">
                  <Feather name="briefcase" size={20} color="#2563eb" />
                </View>
                <View>
                  <Text className="text-xl font-black text-slate-900">Create Job Post</Text>
                  <Text className="text-xs text-slate-500">List what you need—skills, credentials, and scope.</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color="#475569" />
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
              />
              <Field
                label="Location"
                placeholder="e.g. Makati City, Philippines"
                value={location}
                onChangeText={setLocation}
                icon="map-pin"
              />
              <Field
                label="Budget range (PHP)"
                placeholder="Minimum"
                value={budgetMin}
                onChangeText={setBudgetMin}
                icon="dollar-sign"
                inline
                trailing={
                  <TextInput
                    keyboardType="numeric"
                    placeholder="Maximum"
                    placeholderTextColor="#94A3B8"
                    value={budgetMax}
                    onChangeText={setBudgetMax}
                    className="ml-3 flex-1 text-base font-semibold text-slate-900"
                    style={{ paddingVertical: 0 }}
                  />
                }
              />
              <Field
                label="What's the work?"
                placeholder="Describe the job, tools needed, schedule, scope…"
                value={description}
                onChangeText={setDescription}
                icon="file-text"
                multiline
              />
              <Field
                label="Requirements"
                placeholder="e.g. Plumbing license, TESDA cert, photos of past work"
                value={requirements}
                onChangeText={setRequirements}
                icon="check-square"
              />

              <View className="mt-5">
                <Text className="text-[11px] font-black text-slate-500 uppercase tracking-[1.5px] mb-2">
                  Tips like Indeed
                </Text>
                <Text className="text-slate-600 leading-5">
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
                  {saving ? "Saving…" : "Post Job"}
                </Text>
              </TouchableOpacity>
              {error && (
                <Text className="mt-3 text-red-500 text-sm font-semibold">{error}</Text>
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
  inline?: boolean;
  trailing?: React.ReactNode;
};

function Field({ label, value, onChangeText, placeholder, icon, multiline, inline, trailing }: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-2 ml-1">{label}</Text>
      <View className={`flex-row items-center px-4 rounded-2xl border border-slate-200 bg-slate-50 ${multiline ? "py-3" : "h-14"}`}>
        <Feather name={icon} size={18} color="#475569" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          multiline={multiline}
          keyboardType={icon === "dollar-sign" ? "numeric" : "default"}
          textAlignVertical={multiline ? "top" : "center"}
          className="flex-1 ml-3 font-semibold text-slate-900"
          style={multiline ? { minHeight: 80 } : undefined}
        />
        {inline && trailing}
      </View>
    </View>
  );
}
