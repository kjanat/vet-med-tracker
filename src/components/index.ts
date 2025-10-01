/**
 * Components Index - Backward Compatibility Layer
 * Maintains all existing import paths while routing to new factory system
 */

// ===========================
// FACTORY SYSTEM EXPORTS
// ===========================

// Main factory system - MOVED TO EXPERIMENTAL
// export {
//   buildComponent,
//   builders,
//   ComponentBuilder,
//   ComponentRegistry,
//   componentFactory,
//   createBusiness,
//   createBusinessComponent,
//   createPrimitive,
//   createUI,
//   dev,
//   initializeComponentFactory
// } from './factories';

// Factory types - MOVED TO EXPERIMENTAL
// export type * from './factories/types';

// ===========================
// PRIMITIVE COMPONENTS
// ===========================

// Export all primitive components for backward compatibility
export * from "./ui";
export { Alert, AlertDescription, AlertTitle } from "./ui/alert.tsx";
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
} from "./ui/alert-dialog.tsx";
export { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar.tsx";
export { Badge } from "./ui/badge.tsx";
// Specific commonly-used primitive exports
export { Button, buttonVariants } from "./ui/button.tsx";
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card.tsx";
export { Checkbox } from "./ui/checkbox.tsx";
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog.tsx";
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.tsx";
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form.tsx";
export { Input } from "./ui/input.tsx";
export { Label } from "./ui/label.tsx";
export {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover.tsx";
export { Progress } from "./ui/progress.tsx";
export { RadioGroup, RadioGroupItem } from "./ui/radio-group.tsx";
export { ScrollArea } from "./ui/scroll-area.tsx";
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select.tsx";
export { Separator } from "./ui/separator.tsx";
export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet.tsx";
export { Skeleton } from "./ui/skeleton.tsx";
export { Toaster } from "./ui/sonner.tsx";
export { Spinner } from "./ui/spinner.tsx";
export { Switch } from "./ui/switch.tsx";
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table.tsx";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.tsx";
export { Textarea } from "./ui/textarea.tsx";
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip.tsx";
// export { toast, useToast } from "./ui/use-toast"; // Deprecated - use sonner instead

// ===========================
// BUSINESS COMPONENTS
// ===========================

// NOTE: These will be migrated individually as they're moved to business/ directories
// For now, maintain backward compatibility by re-exporting from ui/

// Animal-related components
export { AnimalAvatar } from "./ui/animal-avatar.tsx";
export { AnimalBreadcrumb } from "./ui/animal-breadcrumb.tsx";
export { AnimalSwitcher } from "./ui/animal-switcher.tsx";
export { AnimalSwitcherDropdown } from "./ui/animal-switcher-dropdown.tsx";
// Utility components
export { BulkSelectionCheckbox } from "./ui/bulk-selection-checkbox.tsx";
export { BulkSelectionTable } from "./ui/bulk-selection-table.tsx";
// Class variants and utilities
// export * as ClassVariants from "./ui/class-variants"; // File doesn't exist

// Specialized form components
export { DateInput } from "./ui/date-input.tsx";
// Desktop-specific components
export { DesktopProductivityToolbar } from "./ui/desktop-productivity-toolbar.tsx";
export { FloatingActionBar } from "./ui/floating-action-bar.tsx";
// Layout components
export { HouseholdSwitcher } from "./ui/household-switcher.tsx";
export { HoverPrefetchLink } from "./ui/hover-prefetch-link.tsx";
export { InventorySourceSelect } from "./ui/inventory-source-select.tsx";
export { KeyboardShortcutsHelp } from "./ui/keyboard-shortcuts-help.tsx";
export { LoadingIndicator } from "./ui/loading-indicator.tsx";
export { PageLoadingSkeleton as LoadingSkeleton } from "./ui/loading-skeleton.tsx";
export { Logo } from "./ui/logo.tsx";
export { MedConfirmButton } from "./ui/med-confirm-button.tsx";
// Mobile-specific components
export { MobileConfirmLayout } from "./ui/mobile-confirm-layout.tsx";
// Commented out - files don't exist yet:
// export { MobileMedicationCard } from "./ui/mobile-medication-card";
// export { MobileRecordHeader } from "./ui/mobile-record-header";
// export { MobileRecordLayout } from "./ui/mobile-record-layout";
// export { MobileSuccessLayout } from "./ui/mobile-success-layout";
// export { GuardedLink as NavigationGuard } from "./ui/navigation-guard"; // Commented out - export doesn't exist
export { NotificationDropdown } from "./ui/notification-dropdown.tsx";
export { PhotoGallery } from "./ui/photo-gallery.tsx";
// export { PhotoGalleryDemo } from "./ui/photo-gallery-demo"; // disabled - demo file
// Photo uploader complex component - commented out, files don't exist
// export { PhotoUploader } from "./ui/photo-uploader";
// export { ProgressiveImage } from "./ui/progressive-image";
export { RecordButton } from "./ui/record-button.tsx";
export {
  ScreenReaderAnnouncer,
  SkipNavigation,
  useScreenReaderAnnouncements,
} from "./ui/screen-reader-announcer.tsx";
// export { SelectAllCheckbox } from "./ui/select-all-checkbox"; // File doesn't exist
// Sidebar components
// export { Sidebar } from "./ui/sidebar"; // File doesn't exist
export { SidebarMenuButton as SidebarCSS } from "./ui/sidebar-css.tsx";
export * from "./ui/skeleton-variants.tsx";
// Tablet-specific components - files don't exist
// export { TabletConfirmLayout } from "./ui/tablet-confirm-layout";
// export { TabletRecordLayout } from "./ui/tablet-record-layout";
// export { TabletSuccessLayout } from "./ui/tablet-success-layout";
export { TimezoneCombobox } from "./ui/timezone-combobox.tsx";

// ===========================
// FEATURE COMPONENTS
// ===========================

// Feature components that exist and have index files
// export * from './admin';
// export * from './auth';
// export * from './dashboard';
// export * from './history';
// export * from './household';
// export * from './insights';
// export * from './inventory';
// export * from './landing';
// export * from './layout';
// export * from './loading';
// export * from './medication';
// export * from './notifications';
// export * from './profile';
// export * from './providers';
// export * from './regimens';
// export * from './settings';

// ===========================
// LEGACY SUPPORT
// ===========================

export { ErrorBoundary } from "./error-handling/error-boundary-page.tsx";
// Dosage calculator - file doesn't exist
// export { DosageCalculator } from "./medication/dosage-calculator";
// Error boundary components (these may not exist or have different exports)
// Maintain legacy theme provider export
export { ThemeProvider } from "./providers/theme-provider.tsx";

// ===========================
// DECORATOR & STRATEGY HOOKS
// ===========================

// Export useful hooks from decorators and strategies (commented out - moved to experimental)
// export { usePermissions } from './decorators/PermissionDecorator';
// export { useResponsive } from './strategies/ResponsiveStrategy';

// ===========================
// DEVELOPMENT UTILITIES
// ===========================

// Development and debugging exports (commented out - moved to experimental)
// if (process.env.NODE_ENV === 'development') {
//   export { dev as factoryDev } from './factories';
//   export { ComponentMigrationTool, runMigration } from './factories/ComponentMigrationTool';
// }

// ===========================
// AUTO-INITIALIZATION
// ===========================

// Auto-initialize factory system (commented out - moved to experimental)
// if (typeof window !== 'undefined') {
//   import('./factories').then(({ initializeComponentFactory }) => {
//     initializeComponentFactory();
//   });
// }
