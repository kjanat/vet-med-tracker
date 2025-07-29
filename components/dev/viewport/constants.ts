export interface DeviceItem {
	id: string;
	slug: string;
	active: boolean;
	labels: Labels;
	tags: DeviceType[];
	attributes: Attributes;
	properties: Properties;
}

export interface Attributes {
	ranking: Ranking;
	icons: Icon[];
	width: number;
	height: number;
}

export type Icon =
	| "brandAndroid"
	| "brandApple"
	| "brandGoogle"
	| "deviceDesktop"
	| "deviceMobile"
	| "deviceTablet";

export interface Ranking {
	amongAll: number;
	amongBrand: number;
}

export interface Labels {
	primary: string;
	secondary: string; // This was an enum with a template string, but it should just be string
}

export interface Properties {
	screen: Dimensions;
	viewport: Dimensions;
	releaseDate: Date | null;
	discontinuedDate: Date | null;
	devicePixelRatio: number | null;
	operatingSystem: OperatingSystem | null;
	deviceType: DeviceType;
	brand: Brand | null;
}

export type Brand =
	| "Apple"
	| "Google"
	| "Huawei"
	| "Lenovo"
	| "LG"
	| "OnePlus"
	| "Samsung"
	| "Xiaomi";

export type DeviceType =
	| "apple"
	| "desktop"
	| "google"
	| "huawei"
	| "lenovo"
	| "lg"
	| "mobile"
	| "oneplus"
	| "phone"
	| "samsung"
	| "tablet"
	| "touch"
	| "xiaomi";

export type OperatingSystem =
	| "Android"
	| "HarmonyOS"
	| "iOS"
	| "iPadOS"
	| "macOS"
	| "Windows";

export interface Dimensions {
	width: number;
	height: number;
}

export type ColorScheme = "system" | "light" | "dark";
export type Orientation = "portrait" | "landscape";

export interface ViewportState {
	width: number;
	height: number;
	brand: string;
	name: string;
	orientation: Orientation;
	scheme: ColorScheme;
	baseUrl: string;
	deviceType: DeviceType;
}

export const DEVICE_ICONS: Record<string, string> = {
	phone: "📱",
	mobile: "📱",
	tablet: "📋",
	desktop: "🖥️",
	laptop: "💻",
	touch: "📋",
	apple: "📱",
	samsung: "📱",
	huawei: "📱",
	lenovo: "📱",
	google: "📱",
	lg: "📱",
	oneplus: "📱",
	xiaomi: "📱",
	default: "📱",
};

export const DEFAULT_VIEWPORT_STATE: ViewportState = {
	width: 375,
	height: 667,
	brand: "Apple",
	name: "iPhone SE",
	orientation: "portrait",
	scheme: "system",
	baseUrl: "http://localhost:3000/",
	deviceType: "phone",
};

export const COLOR_SCHEMES: ColorScheme[] = ["system", "light", "dark"];

export const DEVICES_API_URL =
	"https://cdn.jsdelivr.net/gh/bitcomplete/labs-viewports@refs/heads/main/items.json";

export const getDeviceIcon = (device: DeviceItem): string => {
	return DEVICE_ICONS[device.properties.deviceType] || DEVICE_ICONS.default;
};

export const withSchemeParam = (url: string, scheme: ColorScheme): string => {
	// No longer adding URL parameters - theme will be controlled via postMessage
	return url;
};
