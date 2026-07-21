import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import CustomSearchComponent from "@/components/CustomComponents/CustomSearchComponent";
import { useTheme } from "@/hooks/useTheme";
import { api, getStoredUser } from "@/utils/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SearchCategory = "All" | "People" | "Jobs" | "Marketplace";

const SEARCH_CATEGORIES: SearchCategory[] = ["All", "People", "Jobs", "Marketplace"];

type JobRow = {
  id: string;
  title: string;
  description?: string;
  location_label: string;
  budget_min: number;
  budget_max: number;
  is_urgent: boolean;
  status: string;
  created_at: string;
};

type ListingRow = {
  id: string;
  store_name: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  location_label: string;
  image_url: string | null;
};

type PersonRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  location_label: string | null;
  job_role: string;
  market_role: string;
};

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const normalizeListing = (row: any): ListingRow => ({
  id: row.id,
  store_name: row.store_name ?? "Unnamed Store",
  name: row.name,
  description: row.description ?? null,
  category: row.category,
  price: toNumber(row.price, 0),
  location_label: row.location_label,
  image_url: row.image_url ?? null,
});

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const insets = useSafeAreaInsets()
  const { t } = useTheme();

  const [search, setSearch] = useState(() => (typeof params.q === "string" ? params.q : ""));
  const [searchCategory, setSearchCategory] = useState<SearchCategory>("All");

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (typeof params.q === "string") {
      setSearch(params.q);
    }
  }, [params.q]);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const data = await api.get<JobRow[]>("/api/jobs");
      setJobs(data ?? []);
    } catch {
      // silently fail
    }
    setLoadingJobs(false);
  }, []);

  const loadMarketplace = useCallback(async () => {
    setLoadingListings(true);
    try {
      const data = await api.get<any[]>("/api/marketplace");
      setListings((data ?? []).map(normalizeListing));
    } catch {
      // silently fail
    }
    setLoadingListings(false);
  }, []);

  const loadPeople = useCallback(async () => {
    setLoadingPeople(true);

    const user = await getStoredUser();
    const uid = user?.id ?? null;

    if (!uid) {
      setHasSession(false);
      setPeople([]);
      setLoadingPeople(false);
      return;
    }

    setHasSession(true);
    try {
      const data = await api.get<PersonRow[]>("/api/people/search?q=");
      setPeople(data ?? []);
    } catch {
      // silently fail
    }

    setLoadingPeople(false);
  }, []);

  useEffect(() => {
    loadJobs();
    loadMarketplace();
    loadPeople();
  }, [loadJobs, loadMarketplace, loadPeople]);

  const query = search.trim().toLowerCase();
  const showSearchResults = query.length > 0 || searchCategory !== "All";

  const filteredJobs = useMemo(() => {
    const source = jobs.filter((job) => job.status === "open");
    return source.filter((job) => {
      if (!query) return true;
      return (
        (job.title ?? "").toLowerCase().includes(query) ||
        (job.location_label ?? "").toLowerCase().includes(query) ||
        (job.description ?? "").toLowerCase().includes(query)
      );
    });
  }, [jobs, query]);

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      if (!query) return true;
      return (
        (listing.name ?? "").toLowerCase().includes(query) ||
        (listing.store_name ?? "").toLowerCase().includes(query) ||
        (listing.description ?? "").toLowerCase().includes(query) ||
        (listing.category ?? "").toLowerCase().includes(query) ||
        (listing.location_label ?? "").toLowerCase().includes(query)
      );
    });
  }, [listings, query]);

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      if (!query) return true;
      return (
        (person.display_name ?? "").toLowerCase().includes(query) ||
        (person.location_label ?? "").toLowerCase().includes(query) ||
        (person.job_role ?? "").toLowerCase().includes(query) ||
        (person.market_role ?? "").toLowerCase().includes(query)
      );
    });
  }, [people, query]);

  return (
    <View style={{paddingTop : insets.top, paddingBottom : insets.bottom }} className={`flex flex-1 flex-col  ${t.bgPage}`}>

      <View className="pt-6 px-[5%]">
        <CustomSearchComponent
          onSearch={setSearch}
          value={search}
          placeholder="Search people, jobs, or marketplace"
        />
      </View>

      <View
        className="mt-3 mb-5 flex flex-row   px-[5%]"
        style={{height : 20}}
      >
        {SEARCH_CATEGORIES.map((category) => {
          const isActive = searchCategory === category;
          return (
            <TouchableOpacity
              key={category}
              onPress={() => setSearchCategory(category)}
              className={`mr-2 px-4 h-9 rounded-xl border items-center justify-center ${
                isActive ? "bg-blue-600 border-blue-600" : `${t.bgCard} ${t.border}`
              }`}
            >
              <Text className={`text-[11px] font-black uppercase ${isActive ? "text-white" : t.textMuted}`}>
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="  px-[5%] ">
        {showSearchResults ? (
          <View className="pb-8">
            <Text className={`text-lg font-black tracking-tight mb-4 ${t.text}`}>Search Results</Text>

            {(searchCategory === "All" || searchCategory === "People") && (
              <SearchSection
                title="People"
                actionLabel="Open Connect"
                onAction={() => router.push({ pathname: "/profile/PeopleConnect", params: { q: search.trim() } })}
              >
                {loadingPeople ? (
                  <LoadingCard text="Searching people..." t={t} />
                ) : !hasSession ? (
                  <EmptyCard title="Sign in required" subtitle="People search is available after sign in." t={t} />
                ) : filteredPeople.length === 0 ? (
                  <EmptyCard title="No people found" subtitle="Try another keyword for people." t={t} />
                ) : (
                  filteredPeople.slice(0, 6).map((person) => (
                    <TouchableOpacity
                      key={person.user_id}
                      onPress={() =>
                        router.push({
                          pathname: "/profile/PeopleConnect",
                          params: { q: person.display_name },
                        })
                      }
                      className={`mb-3 p-4 rounded-2xl border ${t.border} ${t.bgCard} flex-row items-center`}
                    >
                      {person.avatar_url ? (
                        <Image source={{ uri: person.avatar_url }} className="w-11 h-11 rounded-xl" />
                      ) : (
                        <View className="w-11 h-11 rounded-xl bg-slate-200 items-center justify-center">
                          <Text className="text-slate-700 font-black">
                            {person.display_name.slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="ml-3 flex-1 pr-2">
                        <Text className={`text-sm font-black ${t.text}`}>{person.display_name}</Text>
                        <Text className={`text-[11px] mt-1 ${t.textMuted}`}>
                          {person.job_role} • {person.market_role}
                          {person.location_label ? ` • ${person.location_label}` : ""}
                        </Text>
                      </View>
                      <Text className="text-blue-600 text-[10px] font-black uppercase">View</Text>
                    </TouchableOpacity>
                  ))
                )}
              </SearchSection>
            )}

            {(searchCategory === "All" || searchCategory === "Jobs") && (
              <SearchSection title="Jobs" actionLabel="See All" onAction={() => router.push("/jobs") }>
                {loadingJobs ? (
                  <LoadingCard text="Searching jobs..." t={t} />
                ) : filteredJobs.length === 0 ? (
                  <EmptyCard title="No jobs found" subtitle="Try another keyword for jobs." t={t} />
                ) : (
                  filteredJobs.slice(0, 6).map((job) => (
                    <TouchableOpacity
                      key={job.id}
                      onPress={() => router.push({ pathname: "/job/JobView", params: { jobId: job.id } })}
                      className={`p-4 mb-3 rounded-2xl ${t.bgCard} border ${t.border}`}
                      activeOpacity={0.85}
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-3">
                          <Text className={`text-base font-black ${t.text}`}>{job.title}</Text>
                          <View className="flex-row items-center mt-1">
                            <Feather name="map-pin" size={12} color={t.icon} />
                            <Text className={`ml-1 text-[11px] font-semibold ${t.textMuted}`}>{job.location_label}</Text>
                          </View>
                        </View>
                        <Text className="text-emerald-600 text-xs font-black">{formatBudget(job.budget_min, job.budget_max)}</Text>
                      </View>

                      <View className="mt-3 flex-row justify-between items-center">
                        <View className="flex-row items-center">
                          <MaterialCommunityIcons
                            name={job.is_urgent ? "lightning-bolt" : "briefcase-outline"}
                            size={13}
                            color={job.is_urgent ? "#DC2626" : "#2563EB"}
                          />
                          <Text className={`ml-1 text-[10px] font-black uppercase ${t.textMuted}`}>
                            {job.is_urgent ? "Urgent" : job.status}
                          </Text>
                        </View>
                        <Text className={`text-[10px] font-bold ${t.textMuted}`}>{formatTime(job.created_at)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </SearchSection>
            )}

            {(searchCategory === "All" || searchCategory === "Marketplace") && (
              <SearchSection title="Marketplace" actionLabel="Open" onAction={() => router.push("/marketPlace") }>
                {loadingListings ? (
                  <LoadingCard text="Searching marketplace..." t={t} />
                ) : filteredListings.length === 0 ? (
                  <EmptyCard title="No store items found" subtitle="Try another keyword for the store or item name." t={t} />
                ) : (
                  filteredListings.slice(0, 6).map((listing) => (
                    <TouchableOpacity
                      key={listing.id}
                      onPress={() =>
                        router.push({
                          pathname: "/marketPlace/marketPlaceView",
                          params: { id: listing.id },
                        })
                      }
                      className={`mb-3 p-4 rounded-2xl border ${t.border} ${t.bgCard}`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-3">
                          <Text className={`text-sm font-black ${t.text}`}>{listing.name}</Text>
                          <Text className={`text-[11px] mt-1 font-semibold ${t.textMuted}`}>{listing.store_name}</Text>
                          <Text className={`text-[11px] mt-1 ${t.textMuted}`}>
                            {listing.category} • {listing.location_label}
                          </Text>
                        </View>
                        <Text className="text-emerald-600 text-xs font-black">₱{listing.price.toLocaleString()}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </SearchSection>
            )}
          </View>
        ) : (
          <View className={`p-6 rounded-[24px] ${t.bgCard} border ${t.border} mt-3`}>
            <Text className={`text-sm font-semibold ${t.text}`}>Search across the app</Text>
            <Text className={`mt-2 text-xs ${t.textMuted}`}>
              Type a keyword and use category tabs to narrow down to People, Jobs, or Marketplace.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SearchSection({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTheme();

  return (
    <View className="mb-7">
      <View className="flex-row items-end justify-between mb-3">
        <Text className={`text-base font-black ${t.text}`}>{title}</Text>
        {actionLabel && onAction ? (
          <TouchableOpacity onPress={onAction}>
            <Text className={`text-xs font-black ${t.brand}`}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function LoadingCard({ text, t }: { text: string; t: any }) {
  return (
    <View className={`p-6 rounded-[24px] ${t.bgCard} border ${t.border} items-center`}>
      <ActivityIndicator />
      <Text className={`mt-2 text-xs ${t.textMuted}`}>{text}</Text>
    </View>
  );
}

function EmptyCard({ title, subtitle, t }: { title: string; subtitle: string; t: any }) {
  return (
    <View className={`p-6 rounded-[24px] ${t.bgCard} border ${t.border}`}>
      <Text className={`text-sm font-semibold ${t.text}`}>{title}</Text>
      <Text className={`mt-2 text-xs ${t.textMuted}`}>{subtitle}</Text>
    </View>
  );
}

const formatBudget = (min: number, max: number) => {
  if (!min && !max) return "N/A";
  if (min === max) return `₱${min.toLocaleString()}`;
  return `₱${min.toLocaleString()} - ₱${max.toLocaleString()}`;
};

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
};
