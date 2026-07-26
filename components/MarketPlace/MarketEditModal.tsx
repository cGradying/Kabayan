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
  Image,
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

type EditableListing = {
  id: string;
  vendor_id: string;
  store_name: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  location_label: string;
  image_url: string | null;
  is_open: boolean;
  created_at: string;
  avg_rating: number;
  review_count: number;
};

type MarketEditModalProps = {
  visible: boolean;
  listing: EditableListing | null;
  onClose: () => void;
  onSaved: (updated: EditableListing) => void;
};

export default function MarketEditModal({ visible, listing, onClose, onSaved }: MarketEditModalProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listing) return;
    setStoreName(listing.store_name ?? "");
    setName(listing.name ?? "");
    setDescription(listing.description ?? "");
    setCategory(listing.category ?? "");
    setPrice(String(listing.price ?? 0));
    setLocation(listing.location_label ?? "");
    setImageUrl(listing.image_url ?? "");
    setIsOpen(Boolean(listing.is_open));
    setError(null);
  }, [listing, visible]);

  const handleSave = async () => {
    if (!listing || saving) return;

    const trimmedStoreName = storeName.trim();
    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const trimmedLocation = location.trim();
    const trimmedDescription = description.trim();
    const trimmedImageUrl = imageUrl.trim();
    const numericPrice = Number(price);

    if (!trimmedStoreName || !trimmedName || !trimmedCategory || !trimmedLocation) {
      setError("Store name, item name, category, and location are required.");
      return;
    }

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      setError("Price must be a valid non-negative number.");
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
        // Keep fallback coordinates.
      }

      const data = await api.put<any>(`/api/marketplace/${listing.id}`, {
        store_name: trimmedStoreName,
        name: trimmedName,
        description: trimmedDescription || null,
        category: trimmedCategory,
        price: numericPrice,
        location_label: trimmedLocation,
        latitude,
        longitude,
        image_url: trimmedImageUrl || null,
        is_open: isOpen,
      });

      if (!data) throw new Error("No updated listing returned.");

      onSaved({
        id: data.id,
        vendor_id: data.vendor_id,
        store_name: data.store_name ?? trimmedStoreName,
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        price: Number(data.price ?? numericPrice),
        location_label: data.location_label,
        image_url: data.image_url ?? null,
        is_open: Boolean(data.is_open),
        created_at: data.created_at ?? listing.created_at,
        avg_rating: listing.avg_rating,
        review_count: listing.review_count,
      });
      onClose();
    } catch (err) {
      const message = humanizeError(err, "Failed to update store listing.");
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
              <Text className={`text-xl font-black ${t.text}`}>Edit Store Listing</Text>
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
              <Field label="Store Name" value={storeName} onChangeText={setStoreName} placeholder="Your customer-facing store name" icon="home" t={t} />
              <Field label="Item Name" value={name} onChangeText={setName} placeholder="Store item name" icon="tag" t={t} />
              <Field label="Category" value={category} onChangeText={setCategory} placeholder="Meals, Drinks, Grocery, Services" icon="grid" t={t} />
              <Field label="Price (PHP)" value={price} onChangeText={setPrice} placeholder="0" icon="dollar-sign" t={t} />
              <Field label="Location" value={location} onChangeText={setLocation} placeholder="City / area" icon="map-pin" t={t} />

              <View className="mb-4">
                <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1 ${t.textMuted}`}>Item Image URL</Text>
                {imageUrl.trim() !== '' && (
                  <Image source={{ uri: imageUrl }} className="w-full h-36 rounded-2xl mb-2" resizeMode="cover" />
                )}
                <View className={`flex-row items-center px-4 h-12 rounded-2xl border ${t.border} ${t.bgSurface}`}>
                  <Feather name="image" size={16} color={t.icon} />
                  <TextInput
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    placeholder="https://..."
                    placeholderTextColor={t.isDarkMode ? "#475569" : "#94A3B8"}
                    autoCapitalize="none"
                    keyboardType="url"
                    className={`flex-1 ml-2 font-semibold ${t.text}`}
                  />
                </View>
              </View>

              <Field
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Description, item details, and store notes"
                icon="file-text"
                multiline
                t={t}
              />

              <TouchableOpacity
                onPress={() => setIsOpen((prev) => !prev)}
                className={`mb-3 h-12 px-4 rounded-2xl border flex-row items-center justify-between ${
                  isOpen
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : `${t.border} ${t.bgSurface}`
                }`}
              >
                <View className="flex-row items-center">
                  <Feather name="toggle-right" size={16} color={isOpen ? "#059669" : t.icon} />
                  <Text className={`ml-2 text-xs font-black uppercase tracking-widest ${isOpen ? "text-emerald-600" : t.textMuted}`}>
                    {isOpen ? "Store is Open" : "Store is Closed"}
                  </Text>
                </View>
                <Ionicons name={isOpen ? "checkmark-circle" : "ellipse-outline"} size={18} color={isOpen ? "#059669" : t.icon} />
              </TouchableOpacity>

              {error ? (
                <View className="mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-400/30">
                  <Text className="text-red-500 text-xs font-semibold">{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className={`mt-5 h-14 rounded-2xl items-center justify-center shadow-lg shadow-emerald-500/30 ${saving ? "bg-emerald-400" : "bg-emerald-600"}`}
              >
                <Text className="text-white text-xs font-black uppercase tracking-widest">
                  {saving ? "Saving..." : "Save Store Changes"}
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
