import type { Route } from "next";
import { navigationConfig, pageMetadata } from "./config";
import type { NavigationItem } from "./types";

/**
 * Get navigation items for a specific section
 */
export function getNavigationSection(
  section: keyof typeof navigationConfig.main,
): NavigationItem | undefined {
  return navigationConfig.main[section];
}

/**
 * Get child navigation items for a section
 */
export function getSectionChildren(
  section: keyof typeof navigationConfig.main,
): NavigationItem[] {
  const sectionData = navigationConfig.main[section];
  if (!sectionData?.children) return [];

  return Object.entries(sectionData.children).map(([key, item]) => ({
    ...item,
    id: key,
  }));
}

/**
 * Get page metadata by path
 */
export function getPageMetadata(
  path: string,
): Partial<NavigationItem> | undefined {
  return pageMetadata[path];
}

/**
 * Generate breadcrumbs from a path
 */
export function generateBreadcrumbs(pathname: string): Array<{
  title: string;
  href?: Route;
}> {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: Array<{ title: string; href?: Route }> = [];

  // Add home
  breadcrumbs.push({ title: "Home", href: "/" as Route });

  // Build breadcrumbs from segments
  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const metadata = getPageMetadata(currentPath);

    if (metadata?.title) {
      breadcrumbs.push({
        title: metadata.title,
        href: currentPath as Route,
      });
    } else {
      // Fallback to capitalizing the segment
      breadcrumbs.push({
        title: segment.charAt(0).toUpperCase() + segment.slice(1),
        href: currentPath as Route,
      });
    }
  }

  return breadcrumbs;
}

/**
 * Find a navigation item by path
 */
export function findNavigationItemByPath(
  path: string,
): NavigationItem | undefined {
  // Helper function to check a single navigation array
  const findInArray = (items: NavigationItem[]): NavigationItem | undefined => {
    return items.find((item) => item.path === path);
  };

  // Helper function to check main navigation sections
  const findInMainSection = (): NavigationItem | undefined => {
    for (const section of Object.values(navigationConfig.main)) {
      if (section.path === path) return section;

      // Check children if they exist
      if (section.children) {
        const found = findInArray(Object.values(section.children));
        if (found) return found;
      }
    }
    return undefined;
  };

  // Check main navigation first
  const mainResult = findInMainSection();
  if (mainResult) return mainResult;

  // Check other navigation arrays
  const arrays = [
    navigationConfig.secondary,
    navigationConfig.mobile,
    navigationConfig.dashboard,
  ];

  for (const array of arrays) {
    const found = findInArray(array);
    if (found) return found;
  }

  return undefined;
}

/**
 * Get settings navigation tabs
 */
export function getSettingsTabs(): NavigationItem[] {
  const settings = navigationConfig.main.settings;
  if (!settings?.children) return [];

  return Object.entries(settings.children).map(([key, item]) => ({
    ...item,
    id: key,
  }));
}

/**
 * Get manage section cards
 */
export function getManageCards(): NavigationItem[] {
  const manage = navigationConfig.main.manage;
  if (!manage?.children) return [];

  return Object.entries(manage.children).map(([key, item]) => ({
    ...item,
    id: key,
  }));
}

/**
 * Transform navigation config to sidebar format
 */
export function getMainNavigation() {
  return Object.entries(navigationConfig.main).map(([key, section]) => {
    const items = section.children
      ? Object.entries(section.children).map(([childKey, child]) => ({
          ...child,
          id: childKey,
        }))
      : undefined;

    return {
      ...section,
      id: key,
      items,
    };
  });
}

/**
 * Get mobile navigation items
 */
export function getMobileNavigation() {
  return navigationConfig.mobile;
}

/**
 * Get dashboard quick access items
 */
export function getDashboardNavigation() {
  return navigationConfig.dashboard;
}
