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
        style={{ flex: 1, justifyContent: "flex-end", paddingBottom: insets.bottom }}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`max-h-[85%] rounded-t-[30px] px-6 pt-6 pb-4 ${t.bgCard}`}>
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
              />
              <Field
                label="Location"
                value={location}
                onChangeText={setLocation}
                placeholder="City or address"
                icon="map-pin"
              />
              <View className="mb-4">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Budget (PHP)</Text>
                <View className="flex-row gap-2">
                  <View className="flex-1 h-12 px-3 rounded-2xl border border-slate-200 bg-slate-50 flex-row items-center">
                    <TextInput
                      value={budgetMin}
                      onChangeText={setBudgetMin}
                      placeholder="Min"
                      keyboardType="numeric"
                      className="flex-1 text-slate-900 font-semibold"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View className="flex-1 h-12 px-3 rounded-2xl border border-slate-200 bg-slate-50 flex-row items-center">
                    <TextInput
                      value={budgetMax}
                      onChangeText={setBudgetMax}
                      placeholder="Max"
                      keyboardType="numeric"
                      className="flex-1 text-slate-900 font-semibold"
                      placeholderTextColor="#94A3B8"
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
              />
              <Field
                label="Requirements"
                value={requirements}
                onChangeText={setRequirements}
                placeholder="comma separated"
                icon="check-square"
              />

              <TouchableOpacity
                onPress={() => setIsUrgent((prev) => !prev)}
                className={`mb-3 h-12 px-4 rounded-2xl border ${isUrgent ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"} flex-row items-center justify-between`}
              >
                <View className="flex-row items-center">
                  <Feather name="alert-triangle" size={16} color={isUrgent ? "#DC2626" : "#64748B"} />
                  <Text className={`ml-2 text-xs font-black uppercase tracking-widest ${isUrgent ? "text-red-600" : "text-slate-600"}`}>
                    {isUrgent ? "Urgent job enabled" : "Mark as urgent"}
                  </Text>
                </View>
                <Ionicons name={isUrgent ? "checkmark-circle" : "ellipse-outline"} size={18} color={isUrgent ? "#DC2626" : "#94A3B8"} />
              </TouchableOpacity>

              {error ? <Text className="text-xs font-semibold text-red-600">{error}</Text> : null}

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className={`mt-5 h-12 rounded-2xl items-center justify-center ${saving ? "bg-blue-400" : "bg-blue-600"}`}
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

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: keyof typeof Feather.glyphMap;
  multiline?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</Text>
      <View className={`rounded-2xl border border-slate-200 bg-slate-50 px-4 ${multiline ? "py-3" : "h-12"} flex-row items-start`}>
        <Feather name={icon} size={16} color="#64748B" style={{ marginTop: multiline ? 2 : 12 }} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          className="ml-2 flex-1 text-slate-900 font-semibold"
          style={multiline ? { minHeight: 90, textAlignVertical: "top" } : { height: 48 }}
        />
      </View>
    </View>
  );
}
