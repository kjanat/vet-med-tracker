import { useCallback, useEffect, useMemo, useState } from "react";
import { formatErrorMessage, VIEWPORT_CONFIG } from "./config";
import {
  type ColorScheme,
  DEFAULT_VIEWPORT_STATE,
  type DeviceItem,
  type DeviceType,
  type ViewportState,
} from "./constants";

// Custom hook for fetching and caching device data
export function useDeviceData() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check local storage cache first
      const cacheKey = "viewport-devices-cache";
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < VIEWPORT_CONFIG.api.cacheTime) {
          setDevices(data.filter((d: DeviceItem) => d.active));
          setLoading(false);
          return;
        }
      }

      // Fetch fresh data
      const response = await fetch(
        "https://cdn.jsdelivr.net/gh/bitcomplete/labs-viewports@refs/heads/main/items.json",
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch device data: ${response.statusText}`);
      }

      const data: DeviceItem[] = await response.json();
      const activeDevices = data.filter((d) => d.active);

      // Cache the data
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: activeDevices,
          timestamp: Date.now(),
        }),
      );

      setDevices(activeDevices);
      setLoading(false);
    } catch (err) {
      const errorMessage = formatErrorMessage(err);
      setError(errorMessage);
      setLoading(false);

      // Auto-retry logic
      if (retryCount < VIEWPORT_CONFIG.api.retryAttempts) {
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
        }, VIEWPORT_CONFIG.api.retryDelay);
      }
    }
  }, [retryCount]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return { devices, error, loading, retry: () => setRetryCount(0) };
}

// Custom hook for window dimensions
export function useWindowDimensions() {
  const [dimensions, setDimensions] = useState({
    height:
      typeof window !== "undefined"
        ? window.innerHeight
        : VIEWPORT_CONFIG.defaults.windowHeight,
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return dimensions;
}

// Custom hook for device filtering
export function useDeviceFilters(devices: DeviceItem[]) {
  const [brandFilter, setBrandFilter] = useState<string>("All");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>("All");

  // Compute unique brands
  const brands = useMemo(() => {
    const uniqueBrands = Array.from(
      new Set(devices.map((d) => d.properties.brand).filter(Boolean)),
    ) as string[];
    return ["All", ...uniqueBrands.sort()];
  }, [devices]);

  // Compute device types
  const deviceTypes = useMemo(() => {
    const types = Array.from(
      new Set(devices.map((d) => d.properties.deviceType)),
    );
    return ["All", ...types.sort()];
  }, [devices]);

  // Compute available device types for selected brand
  const availableDeviceTypes = useMemo(() => {
    if (brandFilter === "All") {
      return new Set(devices.map((d) => d.properties.deviceType));
    }
    return new Set(
      devices
        .filter((d) => (d.properties.brand || "Unknown") === brandFilter)
        .map((d) => d.properties.deviceType),
    );
  }, [devices, brandFilter]);

  // Reset device type filter if not available
  useEffect(() => {
    if (
      deviceTypeFilter !== "All" &&
      !availableDeviceTypes.has(deviceTypeFilter as DeviceType)
    ) {
      setDeviceTypeFilter("All");
    }
  }, [availableDeviceTypes, deviceTypeFilter]);

  // Filter devices
  const filteredDevices = useMemo(() => {
    // Helper functions to reduce sort complexity
    const getDeviceReleaseDate = (device: DeviceItem) =>
      device.properties.releaseDate
        ? new Date(device.properties.releaseDate).getTime()
        : 0;

    const compareDevices = (a: DeviceItem, b: DeviceItem) => {
      const dateA = getDeviceReleaseDate(a);
      const dateB = getDeviceReleaseDate(b);

      // Both have dates - sort by newest first
      if (dateA && dateB) {
        return dateB - dateA;
      }

      // Only A has date - A comes first
      if (dateA && !dateB) {
        return -1;
      }

      // Only B has date - B comes first
      if (!dateA && dateB) {
        return 1;
      }

      // Neither has date - sort by ranking
      return a.attributes.ranking.amongAll - b.attributes.ranking.amongAll;
    };

    const deviceMatches = (device: DeviceItem) => {
      const brandMatch =
        brandFilter === "All" ||
        (device.properties.brand || "Unknown") === brandFilter;
      const typeMatch =
        deviceTypeFilter === "All" ||
        device.properties.deviceType === deviceTypeFilter;
      return brandMatch && typeMatch;
    };

    return devices.filter(deviceMatches).sort(compareDevices);
  }, [devices, brandFilter, deviceTypeFilter]);

  const resetFilters = useCallback(() => {
    setBrandFilter("All");
    setDeviceTypeFilter("All");
  }, []);

  return {
    availableDeviceTypes,
    brandFilter,
    brands,
    deviceTypeFilter,
    deviceTypes,
    filteredDevices,
    resetFilters,
    setBrandFilter,
    setDeviceTypeFilter,
  };
}

// Custom hook for viewport state management
export function useViewportState(devices: DeviceItem[]) {
  // Initialize with current URL if in browser
  const getInitialUrl = () => {
    if (typeof window !== "undefined") {
      const { protocol, hostname, port } = window.location;
      const portSuffix = port ? `:${port}` : "";
      return `${protocol}//${hostname}${portSuffix}/`;
    }
    return DEFAULT_VIEWPORT_STATE.baseUrl;
  };

  const [state, setState] = useState<ViewportState>({
    ...DEFAULT_VIEWPORT_STATE,
    baseUrl: getInitialUrl(),
  });
  const [urlInput, setUrlInput] = useState(getInitialUrl());

  const setDevice = useCallback((device: DeviceItem) => {
    const { width, height } = device.attributes;
    setState((prev) => ({
      ...prev,
      brand: device.properties.brand || "Unknown",
      deviceType: device.properties.deviceType,
      height,
      name: device.labels.primary,
      orientation: width >= height ? "landscape" : "portrait",
      width,
    }));
  }, []);

  const rotate = useCallback(() => {
    // noinspection JSSuspiciousNameCombination
    setState((prev) => ({
      ...prev,
      height: prev.width,
      orientation: prev.orientation === "portrait" ? "landscape" : "portrait",
      width: prev.height,
    }));
  }, []);

  const reset = useCallback(() => {
    const defaultDevice =
      devices.find((d) => d.slug === "iphone-se") || devices[0];
    if (defaultDevice) {
      setDevice(defaultDevice);
    }
    // Get fresh default URL in case it changed
    const defaultUrl =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ""}/`
        : DEFAULT_VIEWPORT_STATE.baseUrl;

    setState((prev) => ({
      ...prev,
      baseUrl: defaultUrl,
      scheme: "system",
    }));
    setUrlInput(defaultUrl);
  }, [devices, setDevice]);

  const applyUrl = useCallback(() => {
    setState((prev) => ({ ...prev, baseUrl: urlInput }));
  }, [urlInput]);

  const handleColorSchemeChange = useCallback((scheme: ColorScheme) => {
    setState((prev) => ({ ...prev, scheme }));
  }, []);

  return {
    applyUrl,
    handleColorSchemeChange,
    reset,
    rotate,
    setDevice,
    setUrlInput,
    state,
    urlInput,
  };
}
