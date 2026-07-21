import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import CustomSearchBarComponent from "@/components/CustomComponents/CustomSearchComponent";
import { LegendList } from '@legendapp/list';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { api } from '@/utils/api';
import { useRouter } from 'expo-router';

const CATEGORIES = ['All', 'Street Food', 'Kakanin', 'Ulam', 'Desserts', 'Other'];

type ListingFeedRow = {
  id: string;
  vendor_id: string;
  store_name: string;
  store_permit_verified?: boolean;
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

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const normalizeListing = (row: any): ListingFeedRow => ({
  id: row.id,
  vendor_id: row.vendor_id,
  store_name: row.store_name ?? "Unnamed Store",
  store_permit_verified: Boolean(row.store_permit_verified),
  name: row.name,
  description: row.description ?? null,
  category: row.category,
  price: toNumber(row.price, 0),
  location_label: row.location_label,
  image_url: row.image_url ?? null,
  is_open: Boolean(row.is_open),
  created_at: row.created_at,
  avg_rating: toNumber(row.avg_rating, 0),
  review_count: Number(row.review_count ?? 0),
});

export default function MarketPlace() {
  const { t } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState("");
  const [listings, setListings] = useState<ListingFeedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadListings = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>("/api/marketplace");
      setListings((data ?? []).map(normalizeListing));
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  useEffect(() => {
    loadListings();
  }, []);

  const filtered = useMemo(() => {
    const byCategory =
      activeTab === "All"
        ? listings
        : listings.filter((v) => (v.category ?? "").toLowerCase().includes(activeTab.toLowerCase()));
    const query = search.trim().toLowerCase();
    if (!query) return byCategory;
    return byCategory.filter((v) => {
      return (
        (v.name ?? "").toLowerCase().includes(query) ||
        (v.store_name ?? "").toLowerCase().includes(query) ||
        (v.description ?? "").toLowerCase().includes(query) ||
        (v.category ?? "").toLowerCase().includes(query) ||
        (v.location_label ?? "").toLowerCase().includes(query)
      );
    });
  }, [listings, activeTab, search]);

  return (
    <View className={`flex-1 ${t.bgPage}`}>
      <View className={`pt-6 pb-5 px-5 ${t.bgCard} border-b ${t.border}`}>
       <CustomSearchBarComponent
          value={search}
          onSearch={setSearch}
          placeholder="Search store items and stores"
          onNavigateToMap={() => router.push("/map/mapView")}
        />
       
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerStyle={{ paddingRight: 12 }}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity 
              key={cat}
              onPress={() => setActiveTab(cat)}
              className={`mr-2 px-5 py-3 rounded-2xl border ${activeTab === cat ? 'bg-blue-600 border-blue-600' : `${t.bgSurface} ${t.border}`}`}
            >
              <Text className={`text-[11px] font-black uppercase tracking-tight ${activeTab === cat ? 'text-white' : t.textMuted}`}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <Text className={`mt-2 ${t.textMuted}`}>Loading stores…</Text>
        </View>
      ) : (
        <LegendList
          data={filtered}
          keyExtractor={(item) => item.id}
          estimatedItemSize={340}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadListings} />}
          ListEmptyComponent={
            <View className={`py-16 px-6 items-center rounded-[28px] border ${t.border} ${t.bgCard}`}>
              <Text className={`text-sm ${t.textMuted}`}>
                {search.trim() ? "No store items or stores found" : "No stores found"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <VendorCard vendor={item} t={t} onPress={() => router.push({ pathname: "/marketPlace/marketPlaceView", params: { id: item.id } })} />
          )}
        />
      )}
    </View>
  );
}

function VendorCard({ vendor, t, onPress }: { vendor: any; t: any; onPress: () => void }) {
  const verified = Boolean(vendor.store_permit_verified);
  return (
    <TouchableOpacity activeOpacity={0.96} className={`rounded-[30px] overflow-hidden mb-5 ${t.bgCard} border ${t.border}`} onPress={onPress}>
      <View className="h-40 w-full relative">
        {vendor.image_url ? (
          <Image source={{ uri: vendor.image_url }} className="w-full h-full" />
        ) : (
          <View className={`w-full h-full px-5 pb-5 items-start justify-end ${t.bgSurface}`}>
            <View className="w-12 h-12 rounded-2xl bg-white/80 items-center justify-center">
              <Feather name="shopping-bag" size={20} color={t.icon} />
            </View>
            <Text className={`mt-3 text-lg font-black tracking-tight ${t.text}`}>{vendor.store_name}</Text>
            <Text className={`mt-1 text-xs font-semibold ${t.textMuted}`}>Store preview</Text>
          </View>
        )}
        <View className="absolute top-4 left-4 flex-row">
          <View className={`${vendor.is_open ? "bg-emerald-500" : "bg-rose-500"} px-3 py-1.5 rounded-full`}>
            <Text className="text-[10px] font-black uppercase tracking-widest text-white">
              {vendor.is_open ? "Open" : "Closed"}
            </Text>
          </View>
        </View>
        <View className="absolute top-4 right-4 bg-white/95 px-2.5 py-1.5 rounded-xl flex-row items-center">
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text className="text-[11px] font-black ml-1 text-slate-900">
            {vendor.review_count > 0 ? vendor.avg_rating.toFixed(1) : "New"}
          </Text>
        </View>
      </View>

      <View className="px-5 py-5 relative">
        <View className="absolute -top-12 left-5">
          {vendor.image_url ? (
            <Image
              source={{ uri: vendor.image_url }}
              className="w-24 h-24 rounded-[28px] border-4 border-white"
            />
          ) : (
            <View className="w-24 h-24 rounded-[28px] border-4 border-white bg-slate-200 items-center justify-center">
              <Text className="text-slate-600 font-black text-xl">{String(vendor.store_name ?? "S").slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View className="flex-row justify-between items-start pt-10">
          <View className="flex-1 pr-4">
            <View className="flex-row items-center flex-wrap">
              <Text className={`text-lg font-black tracking-tight ${t.text}`}>{vendor.store_name}</Text>
              {verified && <Ionicons name="shield-checkmark" size={14} color="#059669" style={{ marginLeft: 6, marginTop: 2 }} />}
            </View>
            <Text className={`text-sm mt-1 font-black ${t.text}`}>{vendor.name}</Text>
            <View className="flex-row items-center mt-2">
              <MaterialIcons name="location-on" size={14} color="#3B82F6" />
              <Text className={`text-xs ml-1 font-semibold ${t.textMuted}`}>{vendor.location_label}</Text>
            </View>
          </View>
          <View className={`${t.brandSoft} px-3 py-2 rounded-2xl items-end`}>
            <Text className={`${t.brand} font-black text-[10px] uppercase tracking-widest`}>{vendor.review_count} review{vendor.review_count === 1 ? "" : "s"}</Text>
            <Text className={`mt-1 text-[10px] font-semibold ${t.textMuted}`}>{vendor.category ?? "Store Item"}</Text>
          </View>
        </View>

        {vendor.description ? (
          <Text className={`mt-4 text-xs leading-5 ${t.textMuted}`} numberOfLines={2}>
            {vendor.description.replace(/\s+/g, " ")}
          </Text>
        ) : null}

        <View className={`mt-5 pt-4 border-t ${t.border} flex-row justify-between items-center`}>
          <View>
            <Text className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>Starting at</Text>
            <Text className={`mt-1 text-xl font-black ${t.price}`}>₱{Number(vendor.price || 0).toLocaleString()}</Text>
          </View>
          <View className="items-end">
            <Text className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>Tap to view</Text>
            <TouchableOpacity className="mt-2 bg-slate-900 px-5 py-3 rounded-2xl">
              <Text className="text-white font-black text-[10px] uppercase tracking-widest">
                {vendor.is_open ? "View & Order" : "View Item"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
