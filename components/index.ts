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
export * from './primitives/ui';
export { Alert, AlertDescription, AlertTitle } from './primitives/ui/alert';
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './primitives/ui/alert-dialog';
export { Avatar, AvatarFallback, AvatarImage } from './primitives/ui/avatar';
export { Badge } from './primitives/ui/badge';
// Specific commonly-used primitive exports
export { Button, buttonVariants } from './primitives/ui/button';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './primitives/ui/card';
export { Checkbox } from './primitives/ui/checkbox';
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './primitives/ui/dialog';
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './primitives/ui/dropdown-menu';
export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './primitives/ui/form';
export { Input } from './primitives/ui/input';
export { Label } from './primitives/ui/label';
export { Popover, PopoverContent, PopoverTrigger } from './primitives/ui/popover';
export { Progress } from './primitives/ui/progress';
export { RadioGroup, RadioGroupItem } from './primitives/ui/radio-group';
export { ScrollArea } from './primitives/ui/scroll-area';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './primitives/ui/select';
export { Separator } from './primitives/ui/separator';
export { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './primitives/ui/sheet';
export { Skeleton } from './primitives/ui/skeleton';
export { Spinner } from './primitives/ui/spinner';
export { Switch } from './primitives/ui/switch';
export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './primitives/ui/table';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './primitives/ui/tabs';
export { Textarea } from './primitives/ui/textarea';
export { Toaster } from './primitives/ui/toaster';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './primitives/ui/tooltip';
export { toast, useToast } from './primitives/ui/use-toast';

// ===========================
// BUSINESS COMPONENTS
// ===========================

// NOTE: These will be migrated individually as they're moved to business/ directories
// For now, maintain backward compatibility by re-exporting from ui/

// Animal-related components
export { AnimalAvatar } from './ui/animal-avatar';
export { AnimalBreadcrumb } from './ui/animal-breadcrumb';
export { AnimalSwitcher } from './ui/animal-switcher';
export { AnimalSwitcherDropdown } from './ui/animal-switcher-dropdown';
// Utility components
export { BulkSelectionCheckbox } from './ui/bulk-selection-checkbox';
export { BulkSelectionTable } from './ui/bulk-selection-table';
// Class variants and utilities
export { default as ClassVariants } from './ui/class-variants';

// Specialized form components  
export { DateInput } from './ui/date-input';
// Desktop-specific components
export { DesktopProductivityToolbar } from './ui/desktop-productivity-toolbar';
export { FloatingActionBar } from './ui/floating-action-bar';
// Layout components
export { HouseholdSwitcher } from './ui/household-switcher';
export { HoverPrefetchLink } from './ui/hover-prefetch-link';
export { InventorySourceSelect } from './ui/inventory-source-select';
export { KeyboardShortcutsHelp } from './ui/keyboard-shortcuts-help';
export { LoadingIndicator } from './ui/loading-indicator';
export { LoadingSkeleton } from './ui/loading-skeleton';
export { Logo } from './ui/logo';
export { MedConfirmButton } from './ui/med-confirm-button';
// Mobile-specific components
export { MobileConfirmLayout } from './ui/mobile-confirm-layout';
export { MobileMedicationCard } from './ui/mobile-medication-card';
export { MobileRecordHeader } from './ui/mobile-record-header';
export { MobileRecordLayout } from './ui/mobile-record-layout';
export { MobileSuccessLayout } from './ui/mobile-success-layout';
export { NavigationGuard } from './ui/navigation-guard';
export { NotificationDropdown } from './ui/notification-dropdown';
export { PhotoGallery } from './ui/photo-gallery';
export { PhotoGalleryDemo } from './ui/photo-gallery-demo';
// Photo uploader complex component
export { PhotoUploader } from './ui/photo-uploader';
export { ProgressiveImage } from './ui/progressive-image';
export { RecordButton } from './ui/record-button';
export { ScreenReaderAnnouncer, SkipNavigation, useScreenReaderAnnouncements } from './ui/screen-reader-announcer';
export { SelectAllCheckbox } from './ui/select-all-checkbox';
// Sidebar components
export { Sidebar } from './ui/sidebar';
export { SidebarCSS } from './ui/sidebar-css';
export { SkeletonVariants } from './ui/skeleton-variants';
// Tablet-specific components
export { TabletConfirmLayout } from './ui/tablet-confirm-layout';
export { TabletRecordLayout } from './ui/tablet-record-layout';
export { TabletSuccessLayout } from './ui/tablet-success-layout';
export { TimezoneCombobox } from './ui/timezone-combobox';

// ===========================
// FEATURE COMPONENTS
// ===========================


// Admin components  
export * from './admin';
// Auth components
export * from './auth';

// Dashboard components
export * from './dashboard';

// History components
export * from './history';

// Household components
export * from './household';

// Insights components
export * from './insights';

// Inventory components
export * from './inventory';

// Landing components
export * from './landing';

// Layout components
export * from './layout';

// Loading components
export * from './loading';

// Medication components
export * from './medication';

// Notification components
export * from './notifications';

// Profile components
export * from './profile';

// Provider components
export * from './providers';

// Regimen components  
export * from './regimens';

// Settings components
export * from './settings';

// ===========================
// LEGACY SUPPORT
// ===========================


// Dosage calculator
export { DosageCalculator } from './dosage-calculator';
export { default as ErrorBoundary } from './error-boundary';
// Error boundary components
export { ErrorBoundaryComponent } from './error-boundary-component';
export { ErrorBoundaryPage } from './error-boundary-page';
// Maintain legacy theme provider export
export { ThemeProvider } from './theme-provider';

// ===========================
// DECORATOR & STRATEGY HOOKS
// ===========================

// Export useful hooks from decorators and strategies
export { usePermissions } from './decorators/PermissionDecorator';
export { useResponsive } from './strategies/ResponsiveStrategy';

// ===========================
// DEVELOPMENT UTILITIES
// ===========================

// Development and debugging exports (only in dev mode)
if (process.env.NODE_ENV === 'development') {
  // Factory development tools
  export { dev as factoryDev } from './factories';
  
  // Component migration tools
  export { ComponentMigrationTool, runMigration } from './factories/ComponentMigrationTool';
}

// ===========================
// AUTO-INITIALIZATION
// ===========================

// Auto-initialize factory system
if (typeof window !== 'undefined') {
  import('./factories').then(({ initializeComponentFactory }) => {
    initializeComponentFactory();
  });
}