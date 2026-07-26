import React, { useEffect, useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { api, getStoredUser } from "@/utils/api";
import { useImagePicker } from "@/context/ImagePicker";
import { geocodeAddress } from "@/utils/googleGeocode";
import humanizeError from "@/utils/humanizeError";

const FALLBACK_COORDINATE = {
  latitude: 14.5995,
  longitude: 120.9842,
};

type MarketModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export default function MarketModal({ visible, onClose, onCreated }: MarketModalProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { pickImage, image, setImage } = useImagePicker();

  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Store Item");
  const [location, setLocation] = useState("");
  const [backgroundUri, setBackgroundUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allergens, setAllergens] = useState("");
  const [storage, setStorage] = useState("");

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const preloadStoreName = async () => {
      const user = await getStoredUser();
      const vendorId = user?.id;
      if (!vendorId) return;

      try {
        const data = await api.get<any[]>("/api/marketplace");
        if (cancelled || !Array.isArray(data)) return;

        const ownListing = data.find((row: any) => row.vendor_id === vendorId && typeof row.store_name === "string");
        if (ownListing?.store_name && !cancelled) {
          setStoreName((current) => current.trim() || ownListing.store_name);
        }
      } catch {
        // silently fail
      }
    };

    preloadStoreName();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const clearForm = () => {
    setName("");
    setStoreName("");
    setDescription("");
    setPrice("");
    setCategory("Store Item");
    setLocation("");
    setImage(null);
    setBackgroundUri(null);
    setAllergens("");
    setStorage("");
    setError(null);
  };

  const handlePickForeground = async () => {
    const asset = await pickImage();
    if (asset) setImage(asset);
  };

  const handlePickBackground = async () => {
    const asset = await pickImage();
    if (asset) setBackgroundUri(asset.uri);
  };

  const handleSave = async () => {
    if (saving) return;
    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const trimmedLocation = location.trim();
    const trimmedDescription = description.trim();
    const priceValue = price.trim() === "" ? 0 : Number(price);

    const trimmedStoreName = storeName.trim();

    if (!trimmedStoreName || !trimmedName || !trimmedCategory || !trimmedLocation) {
      setError("Store name, item name, category, and location are required.");
      return;
    }

    if (Number.isNaN(priceValue) || priceValue < 0) {
      setError("Price must be a valid non-negative number.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const user = await getStoredUser();
      const vendorId = user?.id;
      if (!vendorId) {
        throw new Error("You must be signed in to publish a store item.");
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

      const composedDescription = [
        trimmedDescription,
        allergens ? `Allergens: ${allergens.trim()}` : "",
        storage ? `Storage: ${storage.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      await api.post("/api/marketplace", {
        vendor_id: vendorId,
        store_name: trimmedStoreName,
        name: trimmedName,
        description: composedDescription || null,
        category: trimmedCategory,
        price: priceValue,
        location_label: trimmedLocation,
        latitude,
        longitude,
        image_url: image?.uri ?? null,
        is_open: true,
      });

      clearForm();
      onCreated?.();
      onClose();
    } catch (err) {
      const message = humanizeError(err, "Failed to publish store item.");
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
          <View className={`max-h-[85%] rounded-t-[32px] p-6 ${t.bgCard}`}>
            <View className="items-center mb-3">
              <View className={`w-10 h-1 rounded-full ${t.isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
            </View>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-emerald-100 items-center justify-center mr-3">
                  <Feather name="shopping-bag" size={20} color="#059669" />
                </View>
                <View>
                  <Text className={`text-xl font-black ${t.text}`}>Add Store Item</Text>
                  <Text className={`text-xs ${t.textMuted}`}>Publish an item on your store menu for customers to browse and order.</Text>
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
              contentContainerStyle={{ paddingBottom: insets.bottom + 8 }}
            >
              <Field
                label="Store name"
                placeholder="e.g. Nanay Nena's Kitchen"
                value={storeName}
                onChangeText={setStoreName}
                icon="home"
                t={t}
              />
              <Field
                label="Item name"
                placeholder="e.g. Chicken Inasal Bilao or Laundry Pickup"
                value={name}
                onChangeText={setName}
                icon="edit-3"
                t={t}
              />
              <Field
                label="Category"
                placeholder="Meals, Drinks, Grocery, Services"
                value={category}
                onChangeText={setCategory}
                icon="tag"
                t={t}
              />
              <Field
                label="Price (PHP)"
                placeholder="Base price shown on your menu"
                value={price}
                onChangeText={setPrice}
                icon="currency-php"
                t={t}
              />
              <Field
                label="Store area"
                placeholder="Where customers can find or receive this item"
                value={location}
                onChangeText={setLocation}
                icon="map-pin"
                t={t}
              />
              <Field
                label="Description"
                placeholder="Describe the item, what is included, serving size, prep time, or service coverage."
                value={description}
                onChangeText={setDescription}
                icon="file-text"
                multiline
                t={t}
              />
              <Field
                label="Allergens / Warnings"
                placeholder="e.g. Contains peanuts, dairy. Prepared in shared kitchen."
                value={allergens}
                onChangeText={setAllergens}
                icon="alert-triangle"
                multiline
                t={t}
              />
              <Field
                label="Pickup, storage, or prep notes"
                placeholder="Fresh daily until 8PM. Keep chilled. Delivery within 3km."
                value={storage}
                onChangeText={setStorage}
                icon="clock"
                multiline
                t={t}
              />

              <Text className={`text-[10px] font-black uppercase tracking-[2px] mb-2 ml-1 ${t.textMuted}`}>Photos</Text>
              <View className="flex-row gap-3 mb-4">
                <TouchableOpacity onPress={handlePickForeground} className={`flex-1 h-36 rounded-2xl border-2 border-dashed items-center justify-center overflow-hidden ${t.isDarkMode ? 'border-emerald-700 bg-emerald-900/20' : 'border-emerald-300 bg-emerald-50'}`}>
                  {image?.uri ? (
                    <Image source={{ uri: image.uri }} className="w-full h-full rounded-2xl" />
                  ) : (
                    <View className="items-center px-3">
                      <Feather name="image" size={22} color={t.isDarkMode ? '#059669' : '#059669'} />
                      <Text className={`text-xs font-semibold mt-1 text-center ${t.isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        Item Photo
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePickBackground} className={`flex-1 h-36 rounded-2xl border-2 border-dashed items-center justify-center overflow-hidden ${t.isDarkMode ? 'border-blue-700 bg-blue-900/20' : 'border-blue-300 bg-blue-50'}`}>
                  {backgroundUri ? (
                    <Image source={{ uri: backgroundUri }} className="w-full h-full rounded-2xl" />
                  ) : (
                    <View className="items-center px-3">
                      <Feather name="layout" size={22} color={t.isDarkMode ? '#2563EB' : '#2563EB'} />
                      <Text className={`text-xs font-semibold mt-1 text-center ${t.isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                        Store Banner
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View className="mt-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <Text className={`text-[10px] font-black uppercase tracking-[1.5px] mb-1 ${t.success}`}>Store Listing Tips</Text>
                <Text className={`text-xs leading-5 ${t.textMuted}`}>
                  Focus on the menu item, price clarity, prep or delivery notes, and details that help customers order with confidence.
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="mt-6 bg-emerald-600 h-14 rounded-2xl items-center justify-center shadow-lg shadow-emerald-500/30"
                activeOpacity={0.9}
              >
                <Text className="text-white font-black uppercase text-base tracking-widest">
                  {saving ? "Saving\u2026" : "Publish To Store"}
                </Text>
              </TouchableOpacity>
              {error && (
                <View className="mt-3 p-3 rounded-2xl bg-red-500/10 border border-red-400/30">
                  <Text className="text-red-500 text-xs font-semibold">{error}</Text>
                </View>
              )}
              <View className="h-6" />
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
