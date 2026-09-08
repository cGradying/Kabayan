import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, SafeAreaView } from 'react-native';
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from '@/hooks/useTheme';
import MarketModal from '@/components/MarketPlace/MarketModal';
import MarketEditModal from '@/components/MarketPlace/MarketEditModal';
import EntityHeroBanner from '@/components/CustomComponents/EntityHeroBanner';
import { api, getStoredUser } from '@/utils/api';
import AppFlashMessage from '@/components/CustomComponents/AppFlashMessage';
import useFlashMessage from '@/hooks/useFlashMessage';
import humanizeError from '@/utils/humanizeError';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ListingFeedRow = {
  id: string;
  vendor_id: string;
  store_name: string;
  store_permit_verified: boolean;
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

type ReviewRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string;
  reviewer_avatar_url: string | null;
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

const normalizeReview = (row: any): ReviewRow => ({
  id: row.id,
  listing_id: row.listing_id,
  buyer_id: row.buyer_id,
  rating: Number(row.rating ?? 0),
  comment: row.comment ?? null,
  created_at: row.created_at,
  reviewer_name: row.reviewer_name ?? "Community Member",
  reviewer_avatar_url: row.reviewer_avatar_url ?? null,
});

export default function MarketPlaceView() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets()
  const { flashMessage, showFlashMessage, hideFlashMessage } = useFlashMessage();
  const [showModal, setShowModal] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [deliveryMode, setDeliveryMode] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [listings, setListings] = useState<ListingFeedRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [updatingOpenState, setUpdatingOpenState] = useState(false);
  const [deletingStore, setDeletingStore] = useState(false);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const params = useLocalSearchParams<{ openModal?: string; id?: string; scope?: string }>();

  const loadListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const data = await api.get<any[]>("/api/marketplace");
      const normalized = (data ?? []).map(normalizeListing);
      setListings(normalized);
      setSelectedId((prev) => {
        const requestedId = typeof params.id === "string" ? params.id : null;
        if (requestedId && normalized.some((item) => item.id === requestedId)) return requestedId;
        if (prev && normalized.some((item) => item.id === prev)) return prev;
        return normalized[0]?.id ?? null;
      });
    } catch {
      showFlashMessage("Marketplace Error", "Unable to load marketplace listings.", "error");
    }
    setLoadingListings(false);
  }, [params.id, showFlashMessage]);

  const loadReviews = useCallback(async (listingId: string) => {
    setLoadingReviews(true);
    try {
      const data = await api.get<any[]>(`/api/marketplace/${listingId}/reviews`);
      setReviews((data ?? []).map(normalizeReview));
    } catch {
      showFlashMessage("Reviews Error", "Unable to load reviews.", "error");
    }
    setLoadingReviews(false);
  }, [showFlashMessage]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  useEffect(() => {
    getStoredUser().then((user) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (params.openModal === "true") {
      setShowModal(true);
    }
  }, [params.openModal]);

  useEffect(() => {
    if (typeof params.id === "string") {
      setSelectedId(params.id);
    }
  }, [params.id]);

  const scopedListings = useMemo(() => {
    if (params.scope !== "mine") return listings;
    if (!currentUserId) return [];
    return listings.filter((item) => item.vendor_id === currentUserId);
  }, [currentUserId, listings, params.scope]);

  const featured = useMemo(() => {
    if (!scopedListings.length) return null;
    return scopedListings.find((item) => item.id === selectedId) ?? scopedListings[0];
  }, [scopedListings, selectedId]);

  useEffect(() => {
    if (!featured?.id) {
      setReviews([]);
      return;
    }
    loadReviews(featured.id);
  }, [featured?.id, loadReviews]);

  const permitVerified = useMemo(
    () => Boolean(featured?.store_permit_verified),
    [featured]
  );

  const vendorItems = useMemo(() => {
    if (!featured) return [];
    const source = params.scope === "mine" ? scopedListings : listings;
    const sameStore = source.filter(
      (item) =>
        item.vendor_id === featured.vendor_id &&
        item.store_name.trim().toLowerCase() === featured.store_name.trim().toLowerCase()
    );
    return sameStore.length > 0 ? sameStore : [featured];
  }, [featured, listings, params.scope, scopedListings]);

  useEffect(() => {
    if (!scopedListings.length) {
      setSelectedId(null);
      return;
    }

    if (selectedId && scopedListings.some((item) => item.id === selectedId)) return;
    setSelectedId(scopedListings[0].id);
  }, [scopedListings, selectedId]);

  const isOwner = Boolean(currentUserId && featured && featured.vendor_id === currentUserId);

  const handleOpenReviewModal = async () => {
    const user = await getStoredUser();
    if (!user) {
      showFlashMessage("Sign in required", "Please sign in before writing a review.", "warning");
      return;
    }
    if (!featured) return;
    setReviewModalVisible(true);
  };

  const handleOpenOrderModal = async () => {
    if (!featured || isOwner) return;

    const user = await getStoredUser();
    if (!user) {
      showFlashMessage("Sign in required", "Please sign in before placing an order.", "warning");
      return;
    }

    if (!featured.is_open) {
      showFlashMessage("Store closed", "This item is not accepting orders right now.", "warning");
      return;
    }

    setOrderModalVisible(true);
  };

  const handleSubmitReview = async () => {
    if (!featured || submittingReview) return;

    const rating = Math.max(1, Math.min(5, Math.round(reviewRating)));
    setSubmittingReview(true);

    try {
      const targetListingId = featured.id;
      const data = await api.post<any>(`/api/marketplace/${targetListingId}/reviews`, {
        rating,
        comment: reviewComment.trim() || null,
      });

      setReviewModalVisible(false);
      setReviewRating(5);
      setReviewComment("");

      if (data) {
        setListings((prev) =>
          prev.map((item) =>
            item.id === targetListingId
              ? {
                  ...item,
                  avg_rating: toNumber(data.avg_rating, item.avg_rating),
                  review_count: Number(data.review_count ?? item.review_count),
                }
              : item
          )
        );
      }

      await Promise.all([loadListings(), loadReviews(targetListingId)]);
      showFlashMessage("Review posted", "Thanks for sharing your feedback.", "success");
    } catch (err) {
      const message = humanizeError(err, "Unable to submit review.");
      showFlashMessage("Review Failed", message, "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleToggleListingOpen = async () => {
    if (!featured || !isOwner || updatingOpenState) return;

    const nextIsOpen = !featured.is_open;
    setUpdatingOpenState(true);
    try {
      const data = await api.patch<any>(`/api/marketplace/${featured.id}/status`, { is_open: nextIsOpen });
      const resolvedOpen = typeof data?.is_open === "boolean" ? data.is_open : nextIsOpen;
      setListings((prev) =>
        prev.map((item) =>
          item.id === featured.id
            ? {
                ...item,
                is_open: resolvedOpen,
              }
            : item
        )
      );
      showFlashMessage(
        resolvedOpen ? "Listing reopened" : "Listing closed",
        resolvedOpen ? "Customers can now place orders for this item." : "This listing is now closed to new orders.",
        "success"
      );
    } catch (err) {
      const message = humanizeError(err, "Unable to update listing state.");
      showFlashMessage("Update failed", message, "error");
    } finally {
      setUpdatingOpenState(false);
    }
  };

  const handleDeleteStore = () => {
    if (!featured || !isOwner || deletingStore) return;

    Alert.alert(
      "Delete store",
      `Delete ${featured.store_name} and all listings in it? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingStore(true);
            try {
              const data = await api.delete<any>(`/api/marketplace/${featured.id}`);

              const normalizedStoreName = featured.store_name.trim().toLowerCase();
              setListings((prev) =>
                prev.filter(
                  (item) =>
                    !(
                      item.vendor_id === currentUserId &&
                      item.store_name.trim().toLowerCase() === normalizedStoreName
                    )
                )
              );
              setSelectedId(null);
              showFlashMessage(
                "Store deleted",
                `${Number(data?.deleted_count ?? 0)} listing(s) were removed from ${featured.store_name}.`,
                "success"
              );
              router.replace("/marketPlace/marketPlaceView?scope=mine");
            } catch (err) {
              showFlashMessage("Delete failed", humanizeError(err, "Unable to delete this store."), "error");
            } finally {
              setDeletingStore(false);
            }
          },
        },
      ]
    );
  };

  const quantityValue = Math.max(1, Number.parseInt(orderQuantity || "1", 10) || 1);
  const featuredPrice = featured?.price ?? 0;
  const estimatedTotal = quantityValue * featuredPrice;

  const handleSubmitOrder = async () => {
    if (!featured || submittingOrder || isOwner) return;

    if (deliveryMode === "delivery" && !deliveryAddress.trim()) {
      showFlashMessage("Delivery address required", "Add a delivery address before placing the order.", "warning");
      return;
    }

    setSubmittingOrder(true);
    try {
      const data = await api.post<any>(`/api/marketplace/${featured.id}/orders`, {
        quantity: quantityValue,
        delivery_mode: deliveryMode,
        delivery_address: deliveryMode === "delivery" ? deliveryAddress.trim() : null,
        notes: orderNotes.trim() || null,
      });

      setOrderModalVisible(false);
      setOrderQuantity("1");
      setDeliveryMode("pickup");
      setDeliveryAddress("");
      setOrderNotes("");
      showFlashMessage(
        "Order placed",
        `Your order is now ${data?.status ?? "pending"} with a total of ₱${Number(data?.total_amount ?? estimatedTotal).toLocaleString()}.`,
        "success"
      );
    } catch (err) {
      showFlashMessage("Order failed", humanizeError(err, "Unable to place your order."), "error");
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loadingListings) {
    return (
      <View className={`flex-1 items-center justify-center ${t.bgPage}`}>
        <ActivityIndicator />
        <Text className={`mt-2 ${t.textMuted}`}>Loading stores…</Text>
      </View>
    );
  }

  if (!featured) {
    return (
      <View style={{paddingBottom: insets.bottom, paddingTop : insets.top}} className={`flex-1 items-center justify-center px-6 ${t.bgPage}`}>
        <AppFlashMessage message={flashMessage} onClose={hideFlashMessage} />
        <Text className={`text-base font-semibold ${t.text}`}>
          {params.scope === "mine" ? "You have no store listings yet" : "No store listings found"}
        </Text>
        <TouchableOpacity onPress={() => setShowModal(true)} className="mt-4 bg-blue-600 px-6 py-3 rounded-2xl">
          <Text className="text-white font-black text-xs uppercase tracking-widest">
            {params.scope === "mine" ? "Create Your First Store Listing" : "Add Store Item"}
          </Text>
        </TouchableOpacity>

        <MarketModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            loadListings();
          }}
        />
      </View>
    );
  }

  return (
    <View  style={{marginTop : insets.top}} className={`flex-1 ${t.bgPage}`}>
      <AppFlashMessage message={flashMessage} onClose={hideFlashMessage} />
      <ScrollView style={{marginBottom : insets.bottom}}  showsVerticalScrollIndicator={false}>
        <EntityHeroBanner
          title={featured.name}
          subtitle={featured.store_name}
          imageUri={featured.image_url}
          seed={`${featured.id}:${featured.name}`}
          onBack={() => router.back()}
        />

        <View className={`-mt-5 px-6 pt-6 pb-36 rounded-t-[36px] ${t.bgCard} border-t ${t.border}`}>
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <View className="flex-row items-center flex-wrap">
                <Text className={`text-3xl font-black tracking-tighter ${t.text}`}>{featured.name}</Text>
                {permitVerified && (
                  <View className="flex-row items-center bg-emerald-100 px-2 py-1 rounded-lg ml-2 mt-1">
                    <Ionicons name="shield-checkmark" size={14} color="#059669" />
                    <Text className="ml-1 text-[10px] font-black text-emerald-700">Permit Verified</Text>
                  </View>
                )}
              </View>
              <Text className={`mt-2 text-sm font-bold ${t.textMuted}`}>{featured.store_name}</Text>
              <View className="flex-row items-center mt-2">
                <View className={`${featured.is_open ? 'bg-emerald-50' : 'bg-rose-50'} px-2 py-1 rounded-md mr-3`}>
                  <Text className={`${featured.is_open ? 'text-emerald-600' : 'text-rose-600'} font-black text-[10px] uppercase`}>
                    {featured.is_open ? "Open Store" : "Closed Store"}
                  </Text>
                </View>
                <Ionicons name="star" size={14} color="#F59E0B" />
                {featured.review_count > 0 ? (
                  <>
                    <Text className={`ml-1 text-sm font-bold ${t.text}`}>{featured.avg_rating.toFixed(1)}</Text>
                    <Text className={`ml-1 text-sm font-medium ${t.textMuted}`}>
                      ({featured.review_count} review{featured.review_count === 1 ? "" : "s"})
                    </Text>
                  </>
                ) : (
                  <Text className={`ml-1 text-sm font-medium ${t.textMuted}`}>No reviews yet</Text>
                )}
              </View>
            </View>

            <View className="max-w-[42%] items-end">
              <Text className={`text-right text-2xl font-black ${t.price}`}>₱{featured.price.toLocaleString()}</Text>
              <Text className={`mt-1 text-right text-xs font-semibold ${t.textMuted}`} numberOfLines={2}>
                Per item • from {featured.store_name}
              </Text>
            </View>
          </View>

          {featured.description ? (
            <View className={`mt-6 px-5 py-5 rounded-[28px] border ${t.border} ${t.bgSurface}`}>
              <Text className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>Description</Text>
              <Text className={`mt-3 text-sm leading-6 ${t.textMuted}`}>{featured.description}</Text>
            </View>
          ) : null}
    {!isOwner ? (
              <View className={`mt-5 rounded-[22px] border px-4 py-4 ${t.border} ${t.bgCard}`}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>Availability</Text>
                    <Text className={`mt-1 text-sm font-semibold ${t.text}`}>
                      {featured.is_open ? "Pickup or delivery available" : "Currently unavailable"}
                    </Text>
                  </View>
                  <View className={`rounded-full px-3 py-1.5 ${featured.is_open ? "bg-emerald-50" : "bg-rose-50"}`}>
                    <Text className={`text-[10px] font-black uppercase tracking-widest ${featured.is_open ? "text-emerald-600" : "text-rose-600"}`}>
                      {featured.is_open ? "Open" : "Closed"}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

          <View className="flex-row flex-wrap mt-4" style={{ gap: 12 }}>
            <TouchableOpacity onPress={() => router.push({ pathname: "/map/mapView", params: { location: featured.location_label } })}>
              <InfoChip icon="map-pin" label={featured.location_label} t={t} />
            </TouchableOpacity>
            <InfoChip icon="tag" label={`${featured.category}`} t={t} />
          </View>

          {isOwner ? (
            <View className="mt-8">
              <Text className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted} mb-3`}>Store Controls</Text>
              <View className="gap-3">
                <TouchableOpacity
                  onPress={() => setEditModalVisible(true)}
                  className="h-12 rounded-2xl bg-blue-600 items-center justify-center"
                >
                  <Text className="text-white text-xs font-black uppercase tracking-widest">Edit Listing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleToggleListingOpen}
                  disabled={updatingOpenState}
                  className={`h-12 rounded-2xl items-center justify-center ${featured.is_open ? "bg-rose-600" : "bg-emerald-600"}`}
                >
                  <Text className="text-white text-xs font-black uppercase tracking-widest">
                    {updatingOpenState ? "Updating..." : featured.is_open ? "Close Listing" : "Reopen Listing"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View className={`mt-3 rounded-[22px] border px-4 py-4 ${t.border} ${t.bgSurface}`}>
                <Text className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>Danger Zone</Text>
                <Text className={`mt-2 text-sm leading-6 ${t.textMuted}`}>
                  Delete this store and every listing under <Text className={t.text}>{featured.store_name}</Text>.
                </Text>
                <TouchableOpacity
                  onPress={handleDeleteStore}
                  disabled={deletingStore}
                  className="mt-4 h-12 rounded-2xl items-center justify-center bg-slate-900"
                >
                  <Text className="text-white text-xs font-black uppercase tracking-widest">
                    {deletingStore ? "Deleting..." : "Delete Store & Listings"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View className="mt-10">
            <Text className={`text-lg font-black tracking-tight mb-4 ${t.text}`}>More from this store</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
              {vendorItems.map((item) => (
                <MenuCard
                  key={item.id}
                  name={item.name}
                  storeName={item.store_name}
                  price={`₱${item.price.toLocaleString()}`}
                  img={item.image_url}
                  verified={Boolean(item.store_permit_verified)}
                  t={t}
                  onPress={() => setSelectedId(item.id)}
                  isActive={item.id === featured.id}
                />
              ))}
            </ScrollView>
          </View>

          <View className="mt-12">
            <View className="flex-row justify-between items-center mb-5">
              <View className="flex-1 pr-4">
                <Text className={`text-lg font-black tracking-tight ${t.text}`}>Store Reviews</Text>
                <Text className={`mt-1 text-[12px] leading-5 ${t.textMuted}`}>
                  Buyer feedback for this store and item.
                </Text>
              </View>
              {!isOwner ? (
                <TouchableOpacity onPress={handleOpenReviewModal} className="px-4 py-2 rounded-2xl bg-blue-50">
                  <Text className={`text-[11px] font-black uppercase tracking-widest ${t.brand}`}>Write Review</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {loadingReviews ? (
              <View style={{paddingBottom : 20  + insets.bottom}} className="py-10 items-center">
                <ActivityIndicator />
                <Text className={`mt-2 text-xs ${t.textMuted}`}>Loading reviews…</Text>
              </View>
            ) : reviews.length === 0 ? (
              <View className={`px-5 py-6 rounded-3xl ${t.bgSurface} border ${t.border}`}>
                <Text className={`text-sm font-semibold ${t.text}`}>No reviews yet</Text>
                <Text className={`text-xs mt-2 leading-5 ${t.textMuted}`}>Be the first to leave feedback for this store item.</Text>
              </View>
            ) : (
              reviews.map((review) => (
                <ReviewItem key={review.id} review={review} t={t} />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {isOwner ? (
        <SafeAreaView
          style={{ paddingBottom: Math.max(insets.bottom, 8) }}
          className={`absolute bottom-0 left-0 right-0 px-6 pt-4 ${t.bgCard} border-t ${t.border}`}
        >
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            className="bg-blue-600 flex-1 h-14 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/40"
          >
                  <Text className="text-white font-black uppercase text-sm tracking-widest">Add Listing</Text>
          </TouchableOpacity>
        </SafeAreaView>
      ) : (
        <SafeAreaView
          style={{ paddingBottom: Math.max(insets.bottom, 8) }}
          className={`absolute bottom-0 left-0 right-0 px-6 pt-4 ${t.bgCard} border-t ${t.border}`}
        >
          <View className={`rounded-2xl px-4 py-3 ${t.bgSurface} border ${t.border}`}>
            <Text className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>Price</Text>
            <Text className={`mt-1 text-lg font-black ${t.price}`}>₱{featured.price.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            onPress={handleOpenOrderModal}
            disabled={!featured.is_open}
            className={`mt-3 h-14 rounded-2xl items-center justify-center ${
              featured.is_open ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <Text className="text-white font-black uppercase text-sm tracking-widest">
              {featured.is_open ? "Order Item" : "Unavailable"}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      <MarketModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => {
          setShowModal(false);
          loadListings();
        }}
      />

      <Modal
        visible={orderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOrderModalVisible(false)}
      >
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            >
              <View style={{ paddingBottom: insets.bottom + 18 }} className={`rounded-t-[32px] px-6 pt-6 ${t.bgCard}`}>
                <View className="mb-5 flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className={`text-xl font-black ${t.text}`}>Place Order</Text>
                    <Text className={`mt-1 text-[12px] leading-5 ${t.textMuted}`}>
                      Order from {featured.store_name} just like a store checkout.
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setOrderModalVisible(false)}>
                    <Ionicons name="close" size={22} color={t.icon} />
                  </TouchableOpacity>
                </View>

                <View className={`rounded-[24px] border p-4 ${t.border} ${t.bgSurface}`}>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>Item</Text>
                      <Text className={`mt-2 text-base font-black ${t.text}`}>{featured.name}</Text>
                      <Text className={`mt-1 text-xs font-semibold ${t.textMuted}`} numberOfLines={2}>{featured.store_name}</Text>
                    </View>
                    <Text className={`pl-2 text-right text-lg font-black ${t.price}`}>₱{featured.price.toLocaleString()}</Text>
                  </View>
                </View>

                <Text className={`mt-5 text-xs font-black uppercase tracking-widest ${t.textMuted}`}>Quantity</Text>
                <View className="mt-3 flex-row flex-wrap gap-3">
                  {[1, 2, 3, 4].map((value) => (
                    <TouchableOpacity
                      key={value}
                      onPress={() => setOrderQuantity(String(value))}
                      className={`h-11 w-11 items-center justify-center rounded-2xl border ${
                        quantityValue === value ? "border-blue-600 bg-blue-50" : `${t.border} ${t.bgSurface}`
                      }`}
                    >
                      <Text className={`font-black ${quantityValue === value ? "text-blue-600" : t.text}`}>{value}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className={`mt-5 text-xs font-black uppercase tracking-widest ${t.textMuted}`}>Fulfillment</Text>
                <View className="mt-3 gap-3">
                  {(["pickup", "delivery"] as const).map((mode) => {
                    const active = deliveryMode === mode;
                    return (
                      <TouchableOpacity
                        key={mode}
                        onPress={() => setDeliveryMode(mode)}
                        className={`flex-1 rounded-2xl border px-4 py-3 ${active ? "border-blue-600 bg-blue-50" : `${t.border} ${t.bgSurface}`}`}
                      >
                        <Text className={`text-[11px] font-black uppercase tracking-widest ${active ? "text-blue-600" : t.textMuted}`}>
                          {mode}
                        </Text>
                        <Text className={`mt-2 text-sm font-semibold ${t.text}`}>
                          {mode === "pickup" ? "Pick up from store" : "Request delivery"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {deliveryMode === "delivery" ? (
                  <>
                    <Text className={`mt-5 text-xs font-black uppercase tracking-widest ${t.textMuted}`}>Delivery Address</Text>
                    <View className={`mt-3 rounded-[24px] border px-4 py-4 ${t.border} ${t.bgSurface}`}>
                      <TextInput
                        value={deliveryAddress}
                        onChangeText={setDeliveryAddress}
                        placeholder="House number, street, barangay, and landmark"
                        placeholderTextColor={t.icon}
                        multiline
                        className={`${t.text}`}
                        style={{ minHeight: 84, textAlignVertical: "top" }}
                      />
                    </View>
                  </>
                ) : null}

                <Text className={`mt-5 text-xs font-black uppercase tracking-widest ${t.textMuted}`}>Order Notes</Text>
                <View className={`mt-3 rounded-[24px] border px-4 py-4 ${t.border} ${t.bgSurface}`}>
                  <TextInput
                    value={orderNotes}
                    onChangeText={setOrderNotes}
                    placeholder="Less spicy, extra sauce, call on arrival, or other notes"
                    placeholderTextColor={t.icon}
                    multiline
                    className={`${t.text}`}
                    style={{ minHeight: 84, textAlignVertical: "top" }}
                  />
                </View>

                <View className={`mt-5 rounded-[24px] border px-4 py-4 ${t.border} ${t.bgSurface}`}>
                  <View className="flex-row items-center justify-between">
                    <Text className={`text-sm font-semibold ${t.textMuted}`}>Estimated total</Text>
                    <Text className={`text-xl font-black ${t.price}`}>₱{estimatedTotal.toLocaleString()}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleSubmitOrder}
                  disabled={submittingOrder}
                  className="mt-6 h-12 rounded-2xl items-center justify-center bg-blue-600"
                >
                  <Text className="text-white font-black uppercase text-xs tracking-widest">
                    {submittingOrder ? "Placing Order..." : "Place Order"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
            >
              <View style={{ paddingBottom: insets.bottom + 18 }} className={`rounded-t-[32px] px-6 pt-6 ${t.bgCard}`}>
                <View className="flex-row items-center justify-between mb-5">
                  <View className="flex-1 pr-4">
                    <Text className={`text-xl font-black ${t.text}`}>Write a Store Review</Text>
                    <Text className={`mt-1 text-[12px] leading-5 ${t.textMuted}`}>Share your experience with this store and item.</Text>
                  </View>
                  <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                    <Ionicons name="close" size={22} color={t.icon} />
                  </TouchableOpacity>
                </View>

                <Text className={`text-xs font-black uppercase tracking-widest ${t.textMuted}`}>Rating</Text>
                <View className="flex-row mt-3 mb-5">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <TouchableOpacity key={value} onPress={() => setReviewRating(value)} className="mr-3">
                      <Ionicons
                        name={value <= reviewRating ? "star" : "star-outline"}
                        size={28}
                        color={value <= reviewRating ? "#F59E0B" : "#94A3B8"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className={`text-xs font-black uppercase tracking-widest ${t.textMuted}`}>Comment</Text>
                <View className={`mt-3 border ${t.border} rounded-[24px] ${t.bgSurface} px-4 py-4`}>
                  <TextInput
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    placeholder="Tell other buyers what this store did well."
                    placeholderTextColor={t.icon}
                    multiline
                    className={`${t.text}`}
                    style={{ minHeight: 110, textAlignVertical: "top" }}
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                  className="mt-6 bg-blue-600 h-12 rounded-2xl items-center justify-center"
                >
                  <Text className="text-white font-black uppercase text-xs tracking-widest">
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <MarketEditModal
        visible={editModalVisible}
        listing={featured}
        onClose={() => setEditModalVisible(false)}
        onSaved={(updated) => {
          setListings((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
          showFlashMessage("Listing updated", "Your listing changes are now live.", "success");
        }}
      />
    </View>
  );
}

function InfoChip({ icon, label, t }: any) {
  return (
    <View className={`${t.bgSurface} flex-row items-center px-4 py-2.5 rounded-xl border ${t.border}`}>
      <Feather name={icon} size={14} color={t.accent} />
      <Text className={`ml-2 text-xs font-bold ${t.textMuted}`}>{label}</Text>
    </View>
  );
}

function MenuCard({ name, storeName, price, img, verified, t, onPress, isActive }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`mr-4 w-52 rounded-[30px] overflow-hidden border ${isActive ? 'border-blue-500' : t.border}`}
      activeOpacity={0.95}
    >
      <View className={`${isActive ? "bg-slate-900" : "bg-slate-800"}`}>
        {img ? (
          <Image source={{ uri: img }} className="h-32 w-full opacity-90" />
        ) : (
          <View className="h-32 w-full px-4 py-4 justify-between bg-slate-800">
            <View className="w-10 h-10 rounded-2xl bg-white/10 items-center justify-center">
              <Feather name="shopping-bag" size={18} color="#E2E8F0" />
            </View>
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-300" numberOfLines={1}>
                {storeName ?? "Unnamed Store"}
              </Text>
              <Text className="mt-2 text-base font-black tracking-tight text-white" numberOfLines={2}>
                {name}
              </Text>
            </View>
          </View>
        )}
        <View className="absolute top-3 right-3 bg-black/35 px-2.5 py-1 rounded-full">
          <Text className="text-[10px] font-black uppercase tracking-widest text-white">{price}</Text>
        </View>
      </View>

      <View className={`px-4 py-4 ${t.bgCard}`}>
        <View className="flex-row items-start">
          <View className="flex-1 pr-2">
            <Text className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`} numberOfLines={1}>
              {storeName ?? "Unnamed Store"}
            </Text>
            <Text className={`mt-2 font-black text-sm tracking-tight ${t.text}`} numberOfLines={2}>
              {name}
            </Text>
          </View>
          {verified ? <MaterialIcons name="verified" size={16} color="#059669" /> : null}
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-emerald-600 font-black text-base">{price}</Text>
          <View className={`px-3 py-1.5 rounded-full ${isActive ? "bg-blue-50" : "bg-slate-100"}`}>
            <Text className={`text-[10px] font-black uppercase tracking-widest ${isActive ? "text-blue-600" : "text-slate-600"}`}>
              {isActive ? "Viewing" : "Open"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ReviewItem({ review, t }: { review: ReviewRow; t: any }) {
  return (
    <View className={`px-5 py-5 rounded-3xl ${t.bgSurface} border ${t.border} mb-4`}>
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-row items-center flex-1 pr-4">
          {review.reviewer_avatar_url ? (
            <Image source={{ uri: review.reviewer_avatar_url }} className="w-10 h-10 rounded-full mr-3" />
          ) : (
            <View className="w-10 h-10 rounded-full mr-3 bg-slate-200 items-center justify-center">
              <Text className="text-[11px] font-black text-slate-600">{review.reviewer_name.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View className="flex-1">
            <Text className={`font-black text-sm ${t.text}`}>{review.reviewer_name}</Text>
            <Text className={`text-[10px] mt-1 font-semibold ${t.textMuted}`}>{new Date(review.created_at).toLocaleDateString()}</Text>
          </View>
        </View>
        <View className="flex-row mt-1">
          {[...Array(5)].map((_, i) => (
            <Ionicons
              key={i}
              name={i < review.rating ? "star" : "star-outline"}
              size={12}
              color="#F59E0B"
            />
          ))}
        </View>
      </View>
      {review.comment ? (
        <Text className={`text-xs leading-6 font-medium ${t.textMuted}`}>{review.comment}</Text>
      ) : (
        <Text className={`text-xs leading-6 font-medium italic ${t.textMuted}`}>No written comment.</Text>
      )}
    </View>
  );
}
