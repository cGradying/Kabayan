import React, { useEffect, useState } from "react";
import { Modal, SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform } from "react-native";
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
        <SafeAreaView className="flex-1 bg-black/50 justify-end">
          <View className={`max-h-[85%] bg-white rounded-t-[32px] p-6 ${t.bgCard}`}>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-emerald-100 items-center justify-center mr-3">
                  <Feather name="shopping-bag" size={20} color="#059669" />
                </View>
                <View>
                  <Text className="text-xl font-black text-slate-900">Add Store Item</Text>
                  <Text className="text-xs text-slate-500">Publish an item on your store menu for customers to browse and order.</Text>
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
              contentContainerStyle={{ paddingBottom: insets.bottom + 8 }}
            >
              <Field
                label="Store name"
                placeholder="e.g. Nanay Nena's Kitchen"
                value={storeName}
                onChangeText={setStoreName}
                icon="home"
              />
              <Field
                label="Item name"
                placeholder="e.g. Chicken Inasal Bilao or Laundry Pickup"
                value={name}
                onChangeText={setName}
                icon="edit-3"
              />
              <Field
                label="Category"
                placeholder="Meals, Drinks, Grocery, Services"
                value={category}
                onChangeText={setCategory}
                icon="tag"
              />
              <Field
                label="Price (PHP)"
                placeholder="Base price shown on your menu"
                value={price}
                onChangeText={setPrice}
                icon="currency-php"
              />
              <Field
                label="Store area"
                placeholder="Where customers can find or receive this item"
                value={location}
                onChangeText={setLocation}
                icon="map-pin"
              />
              <Field
                label="Description"
                placeholder="Describe the item, what is included, serving size, prep time, or service coverage."
                value={description}
                onChangeText={setDescription}
                icon="file-text"
                multiline
              />
              <Field
                label="Allergens / Warnings"
                placeholder="e.g. Contains peanuts, dairy. Prepared in shared kitchen."
                value={allergens}
                onChangeText={setAllergens}
                icon="alert-triangle"
                multiline
              />
              <Field
                label="Pickup, storage, or prep notes"
                placeholder="Fresh daily until 8PM. Keep chilled. Delivery within 3km."
                value={storage}
                onChangeText={setStorage}
                icon="clock"
                multiline
              />

              <Text className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-2 ml-1">Photos</Text>
              <View className="flex-row gap-3 mb-4">
                <TouchableOpacity onPress={handlePickForeground} className="flex-1 h-36 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 items-center justify-center">
                  {image?.uri ? (
                    <Image source={{ uri: image.uri }} className="w-full h-full rounded-2xl" />
                  ) : (
                    <Text className="text-emerald-700 font-semibold">Add store item photo</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePickBackground} className="flex-1 h-36 rounded-2xl border border-dashed border-blue-300 bg-blue-50 items-center justify-center">
                  {backgroundUri ? (
                    <Image source={{ uri: backgroundUri }} className="w-full h-full rounded-2xl" />
                  ) : (
                    <Text className="text-blue-700 font-semibold">Add banner</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View className="mt-2">
                <Text className="text-[11px] font-black text-slate-500 uppercase tracking-[1.5px] mb-2">Store Listing Tips</Text>
                <Text className="text-slate-600 leading-5">
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
                  {saving ? "Saving…" : "Publish To Store"}
                </Text>
              </TouchableOpacity>
              {error && (
                <Text className="mt-3 text-red-500 text-sm font-semibold">{error}</Text>
              )}
              <View className="h-6" />
            </ScrollView>
          </View>
        </SafeAreaView>
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
};

function Field({ label, value, onChangeText, placeholder, icon, multiline }: FieldProps) {
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
          textAlignVertical={multiline ? "top" : "center"}
          className="flex-1 ml-3 font-semibold text-slate-900"
          style={multiline ? { minHeight: 80 } : undefined}
        />
      </View>
    </View>
  );
}
