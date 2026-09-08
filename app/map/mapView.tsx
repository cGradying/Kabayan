import CustomMapViewComponent, { type MapPoint } from "@/components/CustomComponents/CustomMapComponents";
import { View, Text, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { geocodeAddress } from "@/utils/googleGeocode";
import { api } from "@/utils/api";
import { useTheme } from "@/hooks/useTheme";

const DEFAULT_COORDINATE: [number, number] = [120.9842, 14.5995];

const normalizeParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const toFiniteNumber = (value?: string) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function CustomMapView() {
  const inset = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTheme();
  const params = useLocalSearchParams<{
    location?: string | string[];
    latitude?: string | string[];
    longitude?: string | string[];
  }>();

  const initialLocation = normalizeParam(params.location) ?? "Pinned location";
  const paramLatitude = toFiniteNumber(normalizeParam(params.latitude));
  const paramLongitude = toFiniteNumber(normalizeParam(params.longitude));

  const [targetCoordinate, setTargetCoordinate] = useState<[number, number]>(DEFAULT_COORDINATE);
  const [currentLabel, setCurrentLabel] = useState(initialLocation);
  const [resolving, setResolving] = useState(false);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const loadMapPoints = useCallback(async () => {
    try {
      const data = await api.get<any[]>("/api/entities");
      if (!Array.isArray(data)) {
        setMapPoints([]);
        return;
      }

      const normalized = data
        .map((row: any) => {
          const latitude = Number(row.latitude);
          const longitude = Number(row.longitude);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
          return {
            id: `${row.entity_type}:${row.entity_id}`,
            kind: row.entity_type === "job" ? "job" : "listing",
            title: row.title ?? (row.entity_type === "job" ? "Job" : "Store item"),
            subtitle: row.subtitle ?? null,
            locationLabel: row.location_label ?? "Pinned location",
            coordinate: [longitude, latitude] as [number, number],
            isOpen: Boolean(row.is_open),
            price: row.price == null ? null : Number(row.price),
          } satisfies MapPoint;
        })
        .filter(Boolean) as MapPoint[];

      setMapPoints(normalized);
    } catch {
      setMapPoints([]);
    }
  }, []);

  const handleLocationSelected = useCallback((coords: [number, number], label: string) => {
    setTargetCoordinate(coords);
    setCurrentLabel(label);
    setSelectedPointId(null);
  }, []);

  const handlePointSelect = useCallback((point: MapPoint) => {
    setTargetCoordinate(point.coordinate);
    setCurrentLabel(point.locationLabel);
    setSelectedPointId(point.id);
  }, []);

  const handlePrimaryAction = useCallback(
    (point: MapPoint) => {
      if (point.kind === "job") {
        router.push({ pathname: "/job/JobView", params: { jobId: point.id.replace("job:", "") } });
        return;
      }

      router.push({ pathname: "/marketPlace/marketPlaceView", params: { id: point.id.replace("listing:", "") } });
    },
    [router]
  );

  useEffect(() => {
    loadMapPoints();
  }, [loadMapPoints]);

  useEffect(() => {
    setCurrentLabel(initialLocation);
  }, [initialLocation, paramLatitude, paramLongitude]);

  useEffect(() => {
    let active = true;

    const resolveTarget = async () => {
      if (paramLatitude !== null && paramLongitude !== null) {
        if (active) setTargetCoordinate([paramLongitude, paramLatitude]);
        return;
      }

      const trimmedLocation = initialLocation.trim();
      if (!trimmedLocation || trimmedLocation === "Pinned location") {
        if (active) setTargetCoordinate(DEFAULT_COORDINATE);
        return;
      }

      setResolving(true);
      try {
        const result = await geocodeAddress(trimmedLocation);
        if (!active) return;

        if (result) {
          setTargetCoordinate([result.longitude, result.latitude]);
        } else {
          setTargetCoordinate(DEFAULT_COORDINATE);
        }
      } finally {
        if (active) setResolving(false);
      }
    };

    resolveTarget();
    return () => {
      active = false;
    };
  }, [initialLocation, paramLatitude, paramLongitude]);

  const markerLabel = useMemo(() => {
    if (currentLabel.trim() && currentLabel !== "Pinned location") return currentLabel;
    return "Pinned location";
  }, [currentLabel]);

  return (
    <View className={`flex flex-1 ${t.bgPage}`} style={{ paddingBottom: inset.bottom, paddingTop: inset.top }}>
      {resolving && (
        <View
          className={`absolute z-50 top-20 self-center rounded-2xl px-4 py-2 border flex-row items-center shadow-sm ${t.bgCard} ${t.border}`}
          style={{ elevation: 10 }}
        >
          <ActivityIndicator size="small" color={t.accent} />
          <Text className={`ml-2 text-xs font-semibold ${t.text}`}>Locating {markerLabel}…</Text>
        </View>
      )}

      <CustomMapViewComponent
        markerCoordinate={targetCoordinate}
        markerLabel={markerLabel}
        onLocationSelected={handleLocationSelected}
        mapPoints={mapPoints}
        selectedPointId={selectedPointId}
        onPointSelect={handlePointSelect}
        onPrimaryAction={handlePrimaryAction}
      />
    </View>
  );
}
