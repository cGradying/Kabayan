import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/utils/api";
import { geocodeAddress } from "@/utils/googleGeocode";
import humanizeError from "@/utils/humanizeError";

const FALLBACK_COORDINATE = {
  latitude: 14.5995,
  longitude: 120.9842,
};

type EditableJob = {
  id: string;
  title: string;
  description: string;
  requirements?: string[] | null;
  budget_min: number;
  budget_max: number;
  location_label: string;
  is_urgent: boolean;
  status: string;
};

type JobEditModalProps = {
  visible: boolean;
  job: EditableJob | null;
  onClose: () => void;
  onSaved: (updated: EditableJob) => void;
};

export default function JobEditModal({ visible, job, onClose, onSaved }: JobEditModalProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [requirements, setRequirements] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!job) return;
    setTitle(job.title ?? "");
    setDescription(job.description ?? "");
    setLocation(job.location_label ?? "");
    setBudgetMin(String(job.budget_min ?? 0));
    setBudgetMax(String(job.budget_max ?? 0));
    setRequirements((job.requirements ?? []).join(", "));
    setIsUrgent(Boolean(job.is_urgent));
    setError(null);
  }, [job, visible]);

  const handleSave = async () => {
    if (!job || saving) return;

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
      setError("Budget must be valid numbers.");
      return;
    }

    if (max < min) {
      setError("Maximum budget must be greater than or equal to minimum budget.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let latitude = FALLBACK_COORDINATE.latitude;
      let longitude = FALLBACK_COORDINATE.longitude;

      try {
        const geocoded = await geocodeAddress(trimmedLocation);
        if (geocoded) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
        }
      } catch {
        // Keep fallback coordinates when geocoding fails.
      }

      const requirementsArray = requirements
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const data = await api.put<any>(`/api/jobs/${job.id}`, {
        title: trimmedTitle,
        description: trimmedDescription,
        requirements: requirementsArray,
        budget_min: min,
        budget_max: max,
        location_label: trimmedLocation,
        latitude,
        longitude,
        is_urgent: isUrgent,
        status: job.status,
      });

      if (!data) throw new Error("No updated job returned.");

      onSaved({
        id: data.id,
        title: data.title,
        description: data.description,
        requirements: data.requirements ?? requirementsArray,
        budget_min: Number(data.budget_min ?? min),
        budget_max: Number(data.budget_max ?? max),
        location_label: data.location_label,
        is_urgent: Boolean(data.is_urgent),
        status: data.status,
      });
      onClose();
    } catch (err) {
      const message = humanizeError(err, "Failed to update job.");
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
          <View className={`max-h-[85%] rounded-t-[30px] px-6 pt-6 pb-4 ${t.bgCard}`}>
            <View className="items-center mb-3">
              <View className={`w-10 h-1 rounded-full ${t.isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
            </View>
            <View className="flex-row items-center justify-between mb-4">
              <Text className={`text-xl font-black ${t.text}`}>Edit Job</Text>
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
                label="Job Title"
                value={title}
                onChangeText={setTitle}
                placeholder="Master plumber needed"
                icon="briefcase"
                t={t}
              />
              <Field
                label="Location"
                value={location}
                onChangeText={setLocation}
                placeholder="City or address"
                icon="map-pin"
                t={t}
              />
              <View className="mb-4">
                <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1 ${t.textMuted}`}>
                  Budget (PHP)
                </Text>
                <View className="flex-row gap-3">
                  <View className={`flex-1 h-14 px-4 rounded-2xl border ${t.border} ${t.bgSurface} flex-row items-center`}>
                    <TextInput
                      value={budgetMin}
                      onChangeText={setBudgetMin}
                      placeholder="Min"
                      keyboardType="numeric"
                      placeholderTextColor={t.isDarkMode ? "#475569" : "#94A3B8"}
                      className={`flex-1 font-semibold ${t.text}`}
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
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Describe tasks, schedule, and scope"
                icon="file-text"
                multiline
                t={t}
              />
              <Field
                label="Requirements"
                value={requirements}
                onChangeText={setRequirements}
                placeholder="comma separated"
                icon="check-square"
                t={t}
              />

              <TouchableOpacity
                onPress={() => setIsUrgent((prev) => !prev)}
                className={`mb-3 h-12 px-4 rounded-2xl border flex-row items-center justify-between ${
                  isUrgent
                    ? 'border-red-400 bg-red-500/10'
                    : `${t.border} ${t.bgSurface}`
                }`}
              >
                <View className="flex-row items-center">
                  <Feather name="alert-triangle" size={16} color={isUrgent ? "#EF4444" : t.icon} />
                  <Text className={`ml-2 text-xs font-black uppercase tracking-widest ${isUrgent ? "text-red-500" : t.textMuted}`}>
                    {isUrgent ? "Urgent job enabled" : "Mark as urgent"}
                  </Text>
                </View>
                <Ionicons name={isUrgent ? "checkmark-circle" : "ellipse-outline"} size={18} color={isUrgent ? "#EF4444" : t.icon} />
              </TouchableOpacity>

              {error ? (
                <View className="mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-400/30">
                  <Text className="text-red-500 text-xs font-semibold">{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className={`mt-5 h-14 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/30 ${saving ? "bg-blue-400" : "bg-blue-600"}`}
              >
                <Text className="text-white text-xs font-black uppercase tracking-widest">
                  {saving ? "Saving..." : "Save Job Changes"}
                </Text>
              </TouchableOpacity>
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
