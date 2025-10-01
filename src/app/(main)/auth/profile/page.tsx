"use client";

// Stack Auth profile page - fully self-contained
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@stackframe/stack";
import {
  Bell,
  Clock,
  Heart,
  Home,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Save,
  User,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/app/badge";
import { Button } from "@/components/app/button";
import type { UserProfile } from "@/components/providers/app-provider-consolidated";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TimezoneCombobox } from "@/components/ui/timezone-combobox";
import { defaultUserPreferences } from "@/db/schema/user-defaults";
import { trpc } from "@/lib/trpc/client";
import { getUserTimezone } from "@/lib/utils/timezone-helpers";

// Schemas for all three sections
const ProfileDataSchema = z.object({
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  location: z.string().optional(),
  profileVisibility: z
    .object({
      bio: z.boolean().optional(),
      email: z.boolean().optional(),
      location: z.boolean().optional(),
      name: z.boolean().optional(),
      social: z.boolean().optional(),
    })
    .optional(),
  pronouns: z.string().optional(),
  socialLinks: z
    .object({
      custom: z
        .array(
          z.object({
            label: z.string(),
            url: z.url("Please enter a valid URL"),
          }),
        )
        .optional(),
      github: z.string().optional(),
      instagram: z.string().optional(),
      linkedin: z.string().optional(),
      twitter: z.string().optional(),
    })
    .optional(),
  website: z.url("Please enter a valid URL").optional().or(z.literal("")),
});

const HouseholdSettingsSchema = z.object({
  defaultLocation: z.object({
    address: z.string().default(""),
    city: z.string().default(""),
    state: z.string().min(2).max(2).default(""),
    timezone: z.string().default(getUserTimezone() || "America/New_York"),
    zipCode: z.string().default(""),
  }),
  householdRoles: z.array(z.string()).default(["Owner", "Primary Caregiver"]),
  inventoryPreferences: z.object({
    autoReorderEnabled: z.boolean().default(false),
    expirationWarningDays: z.number().int().min(1).default(30),
    lowStockThreshold: z.number().int().min(1).default(7),
  }),
  preferredVeterinarian: z.object({
    address: z.string().default(""),
    name: z.string().default(""),
    phone: z.string().default(""),
  }),
  primaryHouseholdName: z.string().default(""),
});

const VetMedPreferencesSchema = z.object({
  defaultTimezone: z.string().default(defaultUserPreferences.defaultTimezone),
  displayPreferences: z
    .object({
      temperatureUnit: z
        .enum(["celsius", "fahrenheit"])
        .default(defaultUserPreferences.displayPreferences.temperatureUnit),
      use24HourTime: z
        .boolean()
        .default(defaultUserPreferences.displayPreferences.use24HourTime),
      weightUnit: z
        .enum(["kg", "lbs"])
        .default(defaultUserPreferences.displayPreferences.weightUnit),
    })
    .default(defaultUserPreferences.displayPreferences),
  emergencyContactName: z.string().default(""),
  emergencyContactPhone: z.string().default(""),
  notificationPreferences: z
    .object({
      emailReminders: z
        .boolean()
        .default(defaultUserPreferences.notificationPreferences.emailReminders),
      pushNotifications: z
        .boolean()
        .default(
          defaultUserPreferences.notificationPreferences.pushNotifications,
        ),
      reminderLeadTime: z
        .number()
        .int()
        .min(5)
        .max(1440)
        .default(
          defaultUserPreferences.notificationPreferences.reminderLeadTime,
        ),
      smsReminders: z
        .boolean()
        .default(defaultUserPreferences.notificationPreferences.smsReminders),
    })
    .default(defaultUserPreferences.notificationPreferences),
  preferredPhoneNumber: z.string().default(""),
});

type ProfileData = z.infer<typeof ProfileDataSchema>;
type HouseholdSettings = z.infer<typeof HouseholdSettingsSchema>;
type VetMedPreferences = z.infer<typeof VetMedPreferencesSchema>;

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

export default function ProfilePage() {
  const user = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [_isSaving, _setIsSaving] = useState(false);
  const [isHouseholdSaving, setIsHouseholdSaving] = useState(false);
  const [isVetMedSaving, setIsVetMedSaving] = useState(false);

  // Default values - memoized to avoid recreating on every render
  const defaultSettings = useMemo<HouseholdSettings>(
    () => ({
      defaultLocation: {
        address: "",
        city: "",
        state: "",
        timezone: getUserTimezone() || "America/New_York",
        zipCode: "",
      },
      householdRoles: ["Owner", "Primary Caregiver"],
      inventoryPreferences: {
        autoReorderEnabled: false,
        expirationWarningDays: 30,
        lowStockThreshold: 7,
      },
      preferredVeterinarian: {
        address: "",
        name: "",
        phone: "",
      },
      primaryHouseholdName: "",
    }),
    [],
  );

  const defaultPreferences = useMemo<VetMedPreferences>(
    () => ({
      ...defaultUserPreferences,
      emergencyContactName: defaultUserPreferences.emergencyContactName || "",
      emergencyContactPhone: defaultUserPreferences.emergencyContactPhone || "",
      // Override nulls with empty strings for form handling
      preferredPhoneNumber: defaultUserPreferences.preferredPhoneNumber || "",
    }),
    [],
  );

  // State
  const [settings, setSettings] = useState<HouseholdSettings>(defaultSettings);
  const [preferences, setPreferences] =
    useState<VetMedPreferences>(defaultPreferences);

  // Form setup
  const form = useForm<ProfileData>({
    defaultValues: {
      bio: "",
      firstName: "",
      lastName: "",
      location: "",
      profileVisibility: {
        bio: true,
        email: false,
        location: true,
        name: true,
        social: true,
      },
      pronouns: "",
      socialLinks: {
        github: "",
        instagram: "",
        linkedin: "",
        twitter: "",
      },
      website: "",
    },
    resolver: zodResolver(ProfileDataSchema),
  });

  const {
    formState: { isSubmitting },
    handleSubmit,
    reset,
    watch: _watch,
  } = form;

  // tRPC mutations
  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    },
  });

  // Helper functions
  const transformProfileForForm = useCallback(
    (profile: UserProfile): ProfileData => ({
      bio: profile.bio ?? "",
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      location: profile.location ?? "",
      profileVisibility: {
        bio: profile.profileVisibility?.bio ?? true,
        email: profile.profileVisibility?.email ?? false,
        location: profile.profileVisibility?.location ?? true,
        name: profile.profileVisibility?.name ?? true,
        social: profile.profileVisibility?.social ?? true,
      },
      pronouns: profile.pronouns ?? "",
      socialLinks: {
        github: (profile.socialLinks?.["github"] as string) || "",
        instagram: (profile.socialLinks?.["instagram"] as string) || "",
        linkedin: (profile.socialLinks?.["linkedin"] as string) || "",
        twitter: (profile.socialLinks?.["twitter"] as string) || "",
      },
      website: profile.website ?? "",
    }),
    [],
  );

  // Load data
  const { data: rawCurrentProfile, isLoading } =
    trpc.user.getProfile.useQuery();

  const currentProfile = rawCurrentProfile
    ? {
        ...rawCurrentProfile,
        availableHouseholds: rawCurrentProfile.availableHouseholds.map(
          (household) => ({
            ...household,
            createdAt: new Date(household.createdAt),
            membership: {
              ...household.membership,
              createdAt: new Date(household.membership.createdAt),
              updatedAt: new Date(household.membership.updatedAt),
            },
            updatedAt: new Date(household.updatedAt),
          }),
        ),
        onboarding: {
          ...rawCurrentProfile.onboarding,
          completedAt: rawCurrentProfile.onboarding.completedAt
            ? new Date(rawCurrentProfile.onboarding.completedAt)
            : null,
        },
      }
    : undefined;

  useEffect(() => {
    if (currentProfile) {
      reset(transformProfileForForm(currentProfile));
    }
  }, [currentProfile, reset, transformProfileForForm]);

  useEffect(() => {
    if (user) {
      // Load household settings
      const rawHousehold = user.clientMetadata?.householdSettings;
      const parsedHousehold = HouseholdSettingsSchema.safeParse(rawHousehold);
      if (parsedHousehold.success) {
        setSettings({ ...defaultSettings, ...parsedHousehold.data });
      }

      // Load vet med preferences
      const rawVetMed = user.clientMetadata?.vetMedPreferences;
      const parsedVetMed = VetMedPreferencesSchema.safeParse(rawVetMed);
      if (parsedVetMed.success) {
        setPreferences({ ...defaultPreferences, ...parsedVetMed.data });
      }
    }
  }, [user, defaultPreferences, defaultSettings]);

  // Event handlers
  const onSubmit = async (data: ProfileData) => {
    await updateProfileMutation.mutateAsync(data);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (currentProfile) {
      reset(transformProfileForForm(currentProfile));
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setIsHouseholdSaving(true);
    try {
      await user.update({
        clientMetadata: {
          ...user.clientMetadata,
          householdSettings: settings,
        },
      });
      toast.success("Household settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsHouseholdSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setIsVetMedSaving(true);
    try {
      await user.update({
        clientMetadata: {
          ...user.clientMetadata,
          vetMedPreferences: preferences,
        },
      });
      toast.success("Preferences saved successfully!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setIsVetMedSaving(false);
    }
  };

  // Update functions
  const updateSettings = (updates: Partial<HouseholdSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const updateLocation = (
    updates: Partial<HouseholdSettings["defaultLocation"]>,
  ) => {
    setSettings((prev) => ({
      ...prev,
      defaultLocation: { ...prev.defaultLocation, ...updates },
    }));
  };

  const updateVeterinarian = (
    updates: Partial<HouseholdSettings["preferredVeterinarian"]>,
  ) => {
    setSettings((prev) => ({
      ...prev,
      preferredVeterinarian: { ...prev.preferredVeterinarian, ...updates },
    }));
  };

  const updateInventoryPreferences = (
    updates: Partial<HouseholdSettings["inventoryPreferences"]>,
  ) => {
    setSettings((prev) => ({
      ...prev,
      inventoryPreferences: { ...prev.inventoryPreferences, ...updates },
    }));
  };

  const updatePreferences = (updates: Partial<VetMedPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  };

  const updateNotificationPreferences = (
    updates: Partial<VetMedPreferences["notificationPreferences"]>,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      notificationPreferences: { ...prev.notificationPreferences, ...updates },
    }));
  };

  const updateDisplayPreferences = (
    updates: Partial<VetMedPreferences["displayPreferences"]>,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      displayPreferences: { ...prev.displayPreferences, ...updates },
    }));
  };

  const addRole = () => {
    if (newRole.trim() && !settings.householdRoles.includes(newRole.trim())) {
      setSettings((prev) => ({
        ...prev,
        householdRoles: [...prev.householdRoles, newRole.trim()],
      }));
      setNewRole("");
    }
  };

  const removeRole = (roleToRemove: string) => {
    setSettings((prev) => ({
      ...prev,
      householdRoles: prev.householdRoles.filter(
        (role) => role !== roleToRemove,
      ),
    }));
  };

  if (isLoading || user === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="mb-8 font-bold text-3xl">User Profile</h1>

        <div className="space-y-8">
          {/* Personal Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Form {...form}>
                <form
                  className="space-y-6 p-6"
                  onSubmit={handleSubmit(onSubmit)}
                >
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-medium text-lg">
                        Personal Information
                      </h3>
                      {!isEditing ? (
                        <Button
                          onClick={() => setIsEditing(true)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Edit Profile
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={handleCancel}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Cancel
                          </Button>
                          <Button
                            disabled={isSubmitting}
                            size="sm"
                            type="submit"
                          >
                            {isSubmitting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!isEditing}
                                placeholder="Enter your first name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!isEditing}
                                placeholder="Enter your last name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pronouns"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pronouns (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!isEditing}
                                placeholder="e.g., they/them, she/her, he/him"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!isEditing}
                                placeholder="e.g., New York, NY"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Bio (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="resize-none"
                              disabled={!isEditing}
                              placeholder="Tell us a bit about yourself..."
                              rows={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Website (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!isEditing}
                              placeholder="https://yourwebsite.com"
                              type="url"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Social Links */}
                  <div>
                    <h3 className="mb-4 font-medium text-lg">
                      Social Links (Optional)
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="socialLinks.linkedin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>LinkedIn</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!isEditing}
                                placeholder="linkedin.com/in/yourprofile"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="socialLinks.twitter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Twitter/X</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!isEditing}
                                placeholder="twitter.com/yourhandle"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="socialLinks.github"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GitHub</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!isEditing}
                                placeholder="github.com/yourusername"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="socialLinks.instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instagram</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!isEditing}
                                placeholder="instagram.com/yourhandle"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Privacy Settings */}
                  <div>
                    <h3 className="mb-4 font-medium text-lg">
                      Privacy Settings
                    </h3>
                    <p className="mb-4 text-muted-foreground text-sm">
                      Control what information is visible to other household
                      members
                    </p>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="profileVisibility.name"
                        render={({ field }) => (
                          <div className="flex items-center justify-between">
                            <Label htmlFor="visibility-name">Show Name</Label>
                            <Switch
                              checked={field.value ?? true}
                              disabled={!isEditing}
                              id="visibility-name"
                              onCheckedChange={field.onChange}
                            />
                          </div>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="profileVisibility.email"
                        render={({ field }) => (
                          <div className="flex items-center justify-between">
                            <Label htmlFor="visibility-email">Show Email</Label>
                            <Switch
                              checked={field.value ?? false}
                              disabled={!isEditing}
                              id="visibility-email"
                              onCheckedChange={field.onChange}
                            />
                          </div>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="profileVisibility.bio"
                        render={({ field }) => (
                          <div className="flex items-center justify-between">
                            <Label htmlFor="visibility-bio">Show Bio</Label>
                            <Switch
                              checked={field.value ?? true}
                              disabled={!isEditing}
                              id="visibility-bio"
                              onCheckedChange={field.onChange}
                            />
                          </div>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="profileVisibility.location"
                        render={({ field }) => (
                          <div className="flex items-center justify-between">
                            <Label htmlFor="visibility-location">
                              Show Location
                            </Label>
                            <Switch
                              checked={field.value ?? true}
                              disabled={!isEditing}
                              id="visibility-location"
                              onCheckedChange={field.onChange}
                            />
                          </div>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="profileVisibility.social"
                        render={({ field }) => (
                          <div className="flex items-center justify-between">
                            <Label htmlFor="visibility-social">
                              Show Social Links
                            </Label>
                            <Switch
                              checked={field.value ?? true}
                              disabled={!isEditing}
                              id="visibility-social"
                              onCheckedChange={field.onChange}
                            />
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  {/* Profile Completion Status */}
                  {!currentProfile?.profileCompletedAt && (
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader>
                        <CardTitle>Complete Your Profile</CardTitle>
                        <CardDescription>
                          Adding profile information helps other household
                          members know more about you. All fields are optional -
                          fill in only what you're comfortable sharing.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* VetMed Preferences Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                VetMed Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-6 p-6">
                <div>
                  <h2 className="font-bold text-2xl text-gray-900">
                    VetMed Tracker Preferences
                  </h2>
                  <p className="mt-1 text-gray-600">
                    Customize your medication tracking experience
                  </p>
                </div>

                {/* Location & Time Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Location & Time Settings
                    </CardTitle>
                    <CardDescription>
                      Set your timezone and display preferences for accurate
                      medication schedules
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Default Timezone</Label>
                      <TimezoneCombobox
                        onChange={(value) =>
                          updatePreferences({ defaultTimezone: value })
                        }
                        value={preferences.defaultTimezone}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="flex items-center justify-between space-x-2">
                        <Label htmlFor="use24hour">
                          Use 24-hour time format
                        </Label>
                        <Switch
                          checked={preferences.displayPreferences.use24HourTime}
                          id="use24hour"
                          onCheckedChange={(checked) =>
                            updateDisplayPreferences({ use24HourTime: checked })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Temperature Unit</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          onChange={(e) =>
                            updateDisplayPreferences({
                              temperatureUnit: e.target.value as
                                | "celsius"
                                | "fahrenheit",
                            })
                          }
                          value={preferences.displayPreferences.temperatureUnit}
                        >
                          <option value="fahrenheit">Fahrenheit (°F)</option>
                          <option value="celsius">Celsius (°C)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>Weight Unit</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          onChange={(e) =>
                            updateDisplayPreferences({
                              weightUnit: e.target.value as "kg" | "lbs",
                            })
                          }
                          value={preferences.displayPreferences.weightUnit}
                        >
                          <option value="lbs">Pounds (lbs)</option>
                          <option value="kg">Kilograms (kg)</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      Contact Information
                    </CardTitle>
                    <CardDescription>
                      Phone numbers for reminders and emergency contacts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Preferred Phone Number</Label>
                      <Input
                        id="phone"
                        onChange={(e) =>
                          updatePreferences({
                            preferredPhoneNumber: e.target.value,
                          })
                        }
                        placeholder="+1 (555) 123-4567"
                        type="tel"
                        value={preferences.preferredPhoneNumber}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Emergency Contact</h4>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="emergency-name">Contact Name</Label>
                          <Input
                            id="emergency-name"
                            onChange={(e) =>
                              updatePreferences({
                                emergencyContactName: e.target.value,
                              })
                            }
                            placeholder="Dr. Smith"
                            value={preferences.emergencyContactName}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="emergency-phone">Contact Phone</Label>
                          <Input
                            id="emergency-phone"
                            onChange={(e) =>
                              updatePreferences({
                                emergencyContactPhone: e.target.value,
                              })
                            }
                            placeholder="+1 (555) 987-6543"
                            type="tel"
                            value={preferences.emergencyContactPhone}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Preferences
                    </CardTitle>
                    <CardDescription>
                      Control how and when you receive medication reminders
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email-reminders">
                            Email Reminders
                          </Label>
                          <p className="text-gray-500 text-sm">
                            Receive medication reminders via email
                          </p>
                        </div>
                        <Switch
                          checked={
                            preferences.notificationPreferences.emailReminders
                          }
                          id="email-reminders"
                          onCheckedChange={(checked) =>
                            updateNotificationPreferences({
                              emailReminders: checked,
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="sms-reminders">SMS Reminders</Label>
                          <p className="text-gray-500 text-sm">
                            Receive medication reminders via text message
                          </p>
                        </div>
                        <Switch
                          checked={
                            preferences.notificationPreferences.smsReminders
                          }
                          id="sms-reminders"
                          onCheckedChange={(checked) =>
                            updateNotificationPreferences({
                              smsReminders: checked,
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="push-notifications">
                            Push Notifications
                          </Label>
                          <p className="text-gray-500 text-sm">
                            Receive browser push notifications
                          </p>
                        </div>
                        <Switch
                          checked={
                            preferences.notificationPreferences
                              .pushNotifications
                          }
                          id="push-notifications"
                          onCheckedChange={(checked) =>
                            updateNotificationPreferences({
                              pushNotifications: checked,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lead-time">
                          Reminder Lead Time (minutes)
                        </Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          id="lead-time"
                          onChange={(e) =>
                            updateNotificationPreferences({
                              reminderLeadTime: parseInt(e.target.value, 10),
                            })
                          }
                          value={preferences.notificationPreferences.reminderLeadTime.toString()}
                        >
                          <option value="5">5 minutes before</option>
                          <option value="15">15 minutes before</option>
                          <option value="30">30 minutes before</option>
                          <option value="60">1 hour before</option>
                          <option value="120">2 hours before</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    disabled={isVetMedSaving}
                    onClick={handleSavePreferences}
                    size="lg"
                  >
                    {isVetMedSaving ? "Saving..." : "Save Preferences"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Household Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Household Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-6 p-6">
                <div>
                  <h2 className="font-bold text-2xl text-gray-900">
                    Household Settings
                  </h2>
                  <p className="mt-1 text-gray-600">
                    Manage your household information and preferences
                  </p>
                </div>

                {/* Basic Household Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Household Information
                    </CardTitle>
                    <CardDescription>
                      Basic information about your household
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="household-name">Household Name</Label>
                      <Input
                        id="household-name"
                        onChange={(e) =>
                          updateSettings({
                            primaryHouseholdName: e.target.value,
                          })
                        }
                        placeholder="The Smith Family"
                        value={settings.primaryHouseholdName}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Location Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Default Location
                    </CardTitle>
                    <CardDescription>
                      Primary location for medication schedules and veterinary
                      visits
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address</Label>
                      <Input
                        id="address"
                        onChange={(e) =>
                          updateLocation({ address: e.target.value })
                        }
                        placeholder="123 Main Street"
                        value={settings.defaultLocation.address}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          onChange={(e) =>
                            updateLocation({ city: e.target.value })
                          }
                          placeholder="Anytown"
                          value={settings.defaultLocation.city}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Select
                          onValueChange={(value) =>
                            updateLocation({ state: value })
                          }
                          value={settings.defaultLocation.state}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                          <SelectContent>
                            {US_STATES.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zip">ZIP Code</Label>
                        <Input
                          id="zip"
                          onChange={(e) =>
                            updateLocation({ zipCode: e.target.value })
                          }
                          placeholder="12345"
                          value={settings.defaultLocation.zipCode}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Household Roles */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Household Roles
                    </CardTitle>
                    <CardDescription>
                      Define roles for household members who care for your
                      animals
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {settings.householdRoles.map((role) => (
                        <Badge
                          className="flex items-center gap-1"
                          key={role}
                          variant="secondary"
                        >
                          {role}
                          <button
                            className="ml-1 hover:text-red-600"
                            onClick={() => removeRole(role)}
                            type="button"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        onChange={(e) => setNewRole(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addRole()}
                        placeholder="Add new role (e.g., Foster Parent, Sitter)"
                        value={newRole}
                      />
                      <Button onClick={addRole} size="sm" variant="outline">
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Preferred Veterinarian */}
                <Card>
                  <CardHeader>
                    <CardTitle>Preferred Veterinarian</CardTitle>
                    <CardDescription>
                      Default veterinary clinic information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="vet-name">Veterinarian/Clinic Name</Label>
                      <Input
                        id="vet-name"
                        onChange={(e) =>
                          updateVeterinarian({ name: e.target.value })
                        }
                        placeholder="Dr. Johnson's Animal Hospital"
                        value={settings.preferredVeterinarian.name}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="vet-phone">Phone Number</Label>
                        <Input
                          id="vet-phone"
                          onChange={(e) =>
                            updateVeterinarian({ phone: e.target.value })
                          }
                          placeholder="+1 (555) 123-4567"
                          type="tel"
                          value={settings.preferredVeterinarian.phone}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vet-address">Address</Label>
                        <Input
                          id="vet-address"
                          onChange={(e) =>
                            updateVeterinarian({ address: e.target.value })
                          }
                          placeholder="456 Pet Street, Petville, ST 12345"
                          value={settings.preferredVeterinarian.address}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Inventory Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Management</CardTitle>
                    <CardDescription>
                      Set preferences for medication inventory tracking
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="low-stock">
                          Low Stock Threshold (days)
                        </Label>
                        <Select
                          onValueChange={(value) =>
                            updateInventoryPreferences({
                              lowStockThreshold: parseInt(value, 10),
                            })
                          }
                          value={settings.inventoryPreferences.lowStockThreshold.toString()}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 days</SelectItem>
                            <SelectItem value="7">1 week</SelectItem>
                            <SelectItem value="14">2 weeks</SelectItem>
                            <SelectItem value="30">1 month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expiration-warning">
                          Expiration Warning (days)
                        </Label>
                        <Select
                          onValueChange={(value) =>
                            updateInventoryPreferences({
                              expirationWarningDays: parseInt(value, 10),
                            })
                          }
                          value={settings.inventoryPreferences.expirationWarningDays.toString()}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">1 week</SelectItem>
                            <SelectItem value="14">2 weeks</SelectItem>
                            <SelectItem value="30">1 month</SelectItem>
                            <SelectItem value="60">2 months</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto-reorder">
                          Auto-reorder Notifications
                        </Label>
                        <p className="text-gray-500 text-sm">
                          Get notified when medications run low
                        </p>
                      </div>
                      <Switch
                        checked={
                          settings.inventoryPreferences.autoReorderEnabled
                        }
                        id="auto-reorder"
                        onCheckedChange={(checked) =>
                          updateInventoryPreferences({
                            autoReorderEnabled: checked,
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    disabled={isHouseholdSaving}
                    onClick={handleSaveSettings}
                    size="lg"
                  >
                    {isHouseholdSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
