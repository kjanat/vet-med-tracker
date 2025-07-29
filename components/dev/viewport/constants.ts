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

export enum Icon {
	BrandAndroid = "brandAndroid",
	BrandApple = "brandApple",
	BrandGoogle = "brandGoogle",
	DeviceDesktop = "deviceDesktop",
	DeviceMobile = "deviceMobile",
	DeviceTablet = "deviceTablet",
}

export interface Ranking {
	amongAll: number;
	amongBrand: number;
}

export interface Labels {
	primary: string;
	secondary: Secondary;
}

export enum Secondary {
	ItemAttributesWidthXItemAttributesHeight = "{{item.attributes.width}}x{{item.attributes.height}}",
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

export enum Brand {
	Apple = "Apple",
	Google = "Google",
	Huawei = "Huawei",
	Lenovo = "Lenovo",
	Lg = "LG",
	OnePlus = "OnePlus",
	Samsung = "Samsung",
	Xiaomi = "Xiaomi",
}

export enum DeviceType {
	Apple = "apple",
	Desktop = "desktop",
	Google = "google",
	Huawei = "huawei",
	Lenovo = "lenovo",
	Lg = "lg",
	Mobile = "mobile",
	Oneplus = "oneplus",
	Phone = "phone",
	Samsung = "samsung",
	Tablet = "tablet",
	Touch = "touch",
	Xiaomi = "xiaomi",
}

export enum OperatingSystem {
	Android = "Android",
	HarmonyOS = "HarmonyOS",
	IOS = "iOS",
	IPadOS = "iPadOS",
	MACOS = "macOS",
	Windows = "Windows",
}

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
	deviceType: "phone" as DeviceType,
};

export const COLOR_SCHEMES: ColorScheme[] = ["system", "light", "dark"];

export const DEVICES_API_URL =
	"https://cdn.jsdelivr.net/gh/bitcomplete/labs-viewports@refs/heads/main/items.json";

export const getDeviceIcon = (device: DeviceItem): string => {
	return DEVICE_ICONS[device.properties.deviceType] || DEVICE_ICONS.default;
};

export const withSchemeParam = (url: string, scheme: ColorScheme): string => {
	try {
		const u = new URL(url);
		if (scheme !== "system") {
			u.searchParams.set("simulatedPrefersColorScheme", scheme);
		} else {
			u.searchParams.delete("simulatedPrefersColorScheme");
		}
		return u.toString();
	} catch {
		const sep = url.includes("?") ? "&" : "?";
		return scheme !== "system"
			? `${url}${sep}simulatedPrefersColorScheme=${scheme}`
			: url;
	}
};
