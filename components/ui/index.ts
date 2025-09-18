/**
 * UI Components Compatibility Layer
 * Maintains backward compatibility for @/components/ui/* imports
 * Routes to existing UI components in components/ui directory
 */

// ===========================
// PRIMITIVE UI COMPONENTS
// ===========================

// Re-export all UI components from current directory
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";
export { Alert, AlertDescription, AlertTitle } from "./alert";
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
export { AspectRatio } from "./aspect-ratio";
export { Avatar, AvatarFallback, AvatarImage } from "./avatar";
export { Badge, badgeVariants } from "./badge";
export {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";
export { Button, buttonVariants } from "./button";
export { Calendar } from "./calendar";
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./carousel";
export type { ChartConfig } from "./chart";
export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "./chart";
export { Checkbox } from "./checkbox";
export {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";
export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";
export {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./context-menu";
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
export { Drawer } from "./drawer";
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
export {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "./hover-card";
export { Input } from "./input";
export { InputOTP } from "./input-otp";
export { Label } from "./label";
export { Menubar } from "./menubar";
export { NavigationMenu } from "./navigation-menu";
export { Pagination } from "./pagination";
export {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
export { Progress } from "./progress";
export { RadioGroup, RadioGroupItem } from "./radio-group";
export { ScrollArea } from "./scroll-area";
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
export { Separator } from "./separator";
export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
export { Skeleton } from "./skeleton";
export { Slider } from "./slider";
export { Spinner } from "./spinner";
export { Switch } from "./switch";
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./tabs";
export { Textarea } from "./textarea";
export { Toaster } from "./toaster";
export { Toggle } from "./toggle";
export { ToggleGroup } from "./toggle-group";
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
export { toast, useToast } from "./use-toast";

// ===========================
// BUSINESS COMPONENTS
// ===========================

// Re-export business components from current ui/ location
// These maintain their current location for backward compatibility

export { AnimalAvatar } from "./animal-avatar";
export { AnimalBreadcrumb } from "./animal-breadcrumb";
export { AnimalSwitcher } from "./animal-switcher";
export { AnimalSwitcherDropdown } from "./animal-switcher-dropdown";
// Export bulk selection utilities
export * from "./bulk-selection";
export { BulkSelectionCheckbox } from "./bulk-selection-checkbox";
export { BulkSelectionTable } from "./bulk-selection-table";
// Export utility components and variants
// ClassVariants component not available
// export { default as ClassVariants } from "./class-variants";
export { DateInput } from "./date-input";
export { DesktopProductivityToolbar } from "./desktop-productivity-toolbar";
export { FloatingActionBar } from "./floating-action-bar";
export { HouseholdSwitcher } from "./household-switcher";
export { HoverPrefetchLink } from "./hover-prefetch-link";
export { InventorySourceSelect } from "./inventory-source-select";
export { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help";
export { LoadingIndicator } from "./loading-indicator";
export {
  CardGridLoadingSkeleton,
  PageLoadingSkeleton,
  TableLoadingSkeleton,
} from "./loading-skeleton";
export { Logo } from "./logo";
export { MedConfirmButton } from "./med-confirm-button";
export { MobileConfirmLayout } from "./mobile-confirm-layout";
export { MobileMedicationCard } from "./mobile-medication-card";
export { MobileRecordHeader } from "./mobile-record-header";
export { MobileRecordLayout } from "./mobile-record-layout";
export { MobileSuccessLayout } from "./mobile-success-layout";
export { NavigationGuardLink } from "./navigation-guard";
export { NotificationDropdown } from "./notification-dropdown";
export { PhotoGallery } from "./photo-gallery";
export { PhotoGalleryDemo } from "./photo-gallery-demo";
export { PhotoUploader } from "./photo-uploader";
export { ProgressiveImage } from "./progressive-image";
export { RecordButton } from "./record-button";
export {
  ScreenReaderAnnouncer,
  SkipNavigation,
  useScreenReaderAnnouncements,
} from "./screen-reader-announcer";
export { SelectAllCheckbox } from "./select-all-checkbox";
export { Sidebar } from "./sidebar";
// SidebarCSS component not available
// export { SidebarCSS } from "./sidebar-css";
// SkeletonVariants component not available
// export { SkeletonVariants } from "./skeleton-variants";
export { TabletConfirmLayout } from "./tablet-confirm-layout";
export { TabletRecordLayout } from "./tablet-record-layout";
export { TabletSuccessLayout } from "./tablet-success-layout";
export { TimezoneCombobox } from "./timezone-combobox";

// ===========================
// FACTORY INTEGRATION
// ===========================

// Provide factory access for components that want to use new system
// Factories not available
// export { buildComponent, createBusiness, createUI } from "../factories";

// ===========================
// MIGRATION HELPERS
// ===========================

/**
 * Helper to check if component should use factory system
 * This can be used by components to gradually migrate to factory pattern
 */
export function shouldUseFactory(_componentName: string): boolean {
  // For now, return false to maintain backward compatibility
  // This can be gradually enabled per component
  return false;
}

/**
 * Migration utility for components (EXPERIMENTAL - DISABLED)
 * Allows gradual migration from direct imports to factory system
 * Currently disabled due to build issues with dynamic imports
 */
export function migrateToFactory<T = unknown>(
  componentName: string,
  fallbackComponent: T,
  _options?: { strategy?: "mobile" | "desktop" | "responsive" },
): T {
  // Experimental factory system disabled - always return fallback
  void componentName; // Suppress unused variable warning
  return fallbackComponent;
}

// ===========================
// DEVELOPMENT AIDS
// ===========================

// Provide migration guidance
export const _migrationGuide =
  process.env.NODE_ENV === "development"
    ? {
        business:
          "Import from @/components/business/*/ or use createBusiness()",
        factory: "Use buildComponent() for complex configurations",
        primitives:
          "Import from @/components/primitives/ui/* or use createUI()",
      }
    : undefined;

if (process.env.NODE_ENV === "development") {
  // Log when ui/ components are imported to help track migration
  console.debug("📦 UI components loaded via compatibility layer");
}
