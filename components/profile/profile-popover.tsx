"use client";

import { useUser } from "@stackframe/stack";
import { Edit, Loader2, Mail, MapPin, User as UserIcon } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/server/trpc/client";

interface ProfilePopoverProps {
  children: React.ReactNode;
  align?: "center" | "start" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

interface ProfileEditFormProps {
  profileData: {
    firstName: string;
    lastName: string;
    bio: string;
    location: string;
    pronouns: string;
  };
  onFieldChange: (
    field: keyof ProfileEditFormProps["profileData"],
    value: string,
  ) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

// Stack user type based on usage in the component
interface StackUser {
  displayName?: string | null;
  profileImageUrl?: string | null;
  primaryEmail?: string | null;
}

// Profile type based on tRPC getProfile query structure
interface ProfileData {
  id: string;
  stackUserId: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  pronouns: string | null;
  location: string | null;
  website: string | null;
  socialLinks: Record<string, unknown>;
  profileData: Record<string, unknown>;
  profileVisibility: Record<string, boolean>;
  profileCompletedAt: string | null;
  preferences: {
    timezone: string | null;
    phoneNumber: string | null;
    use24HourTime: boolean | null;
    temperatureUnit: string | null;
    weightUnit: string | null;
    weekStartsOn: number | null;
    theme: string | null;
    emailReminders: boolean | null;
    smsReminders: boolean | null;
    pushNotifications: boolean | null;
    reminderLeadTime: string | null;
    emergencyContact: {
      name: string | null;
      phone: string | null;
    };
    defaultHouseholdId: string | null;
    defaultAnimalId: string | null;
  };
  onboarding: {
    complete: boolean | null;
    completedAt: Date | null;
  };
  availableHouseholds: Array<{
    id: string;
    name: string;
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
    membership: {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      householdId: string;
      userId: string;
      role: "OWNER" | "CAREGIVER" | "VETREADONLY";
    };
  }>;
  currentHouseholdId: string | null;
}

interface ProfileDisplayProps {
  profile: ProfileData | null | undefined;
}

interface ProfileHeaderProps {
  user: StackUser | null | undefined;
  profile: ProfileData | null | undefined;
  userInitials: string;
  displayName: string;
  onEditClick: () => void;
}

// Profile Edit Form Component
function ProfileEditForm({
  profileData,
  onFieldChange,
  onSave,
  onCancel,
  isLoading,
}: ProfileEditFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs" htmlFor="firstName">
            First Name
          </Label>
          <Input
            className="h-8"
            id="firstName"
            onChange={(e) => onFieldChange("firstName", e.target.value)}
            placeholder="John"
            value={profileData.firstName}
          />
        </div>
        <div>
          <Label className="text-xs" htmlFor="lastName">
            Last Name
          </Label>
          <Input
            className="h-8"
            id="lastName"
            onChange={(e) => onFieldChange("lastName", e.target.value)}
            placeholder="Doe"
            value={profileData.lastName}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs" htmlFor="pronouns">
          Pronouns
        </Label>
        <Input
          className="h-8"
          id="pronouns"
          onChange={(e) => onFieldChange("pronouns", e.target.value)}
          placeholder="they/them, she/her, he/him"
          value={profileData.pronouns}
        />
      </div>

      <div>
        <Label className="text-xs" htmlFor="location">
          Location
        </Label>
        <Input
          className="h-8"
          id="location"
          onChange={(e) => onFieldChange("location", e.target.value)}
          placeholder="New York, NY"
          value={profileData.location}
        />
      </div>

      <div>
        <Label className="text-xs" htmlFor="bio">
          Bio
        </Label>
        <Textarea
          className="h-20 resize-none"
          id="bio"
          onChange={(e) => onFieldChange("bio", e.target.value)}
          placeholder="Tell us about yourself..."
          value={profileData.bio}
        />
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={isLoading}
          onClick={onSave}
          size="sm"
        >
          {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
          Save
        </Button>
        <Button
          className="flex-1"
          onClick={onCancel}
          size="sm"
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Profile Display Component
function ProfileDisplay({ profile }: ProfileDisplayProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium text-muted-foreground text-xs">
            First Name
          </p>
          <p>{profile?.firstName || "Not set"}</p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground text-xs">Last Name</p>
          <p>{profile?.lastName || "Not set"}</p>
        </div>
      </div>
      <div>
        <p className="font-medium text-muted-foreground text-xs">Bio</p>
        <p className="text-sm">{profile?.bio || "No bio added yet"}</p>
      </div>
    </div>
  );
}

// Profile Header Component
function ProfileHeader({
  user,
  profile,
  userInitials,
  displayName,
  onEditClick,
}: ProfileHeaderProps) {
  return (
    <>
      {/* Header */}
      <div className="relative h-24 bg-gradient-to-r from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
        <div className="-bottom-10 absolute left-6">
          <Avatar className="h-20 w-20 border-4 border-background">
            <AvatarImage
              alt={user?.displayName ?? "User avatar"}
              src={user?.profileImageUrl || undefined}
            />
            <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 pt-8">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{displayName}</h3>
            {profile?.pronouns && (
              <p className="text-muted-foreground text-sm">
                {profile.pronouns}
              </p>
            )}
          </div>
          <Button onClick={onEditClick} size="icon" variant="ghost">
            <Edit className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Mail className="h-3 w-3" />
            <span>{user?.primaryEmail}</span>
          </div>
          {profile?.location && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <MapPin className="h-3 w-3" />
              <span>{profile.location}</span>
            </div>
          )}
        </div>

        {profile?.bio && <p className="mt-3 text-sm">{profile.bio}</p>}
      </div>
    </>
  );
}

export function ProfilePopover({
  children,
  align = "end",
  side = "bottom",
}: ProfilePopoverProps) {
  const user = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    bio: "",
    firstName: "",
    lastName: "",
    location: "",
    pronouns: "",
  });

  // tRPC queries
  const { data: rawProfile, isLoading } = trpc.user.getProfile.useQuery(
    undefined,
    { enabled: isOpen },
  );

  // Transform API response to match ProfileData interface with proper Date objects
  const profile = rawProfile
    ? {
        ...rawProfile,
        availableHouseholds: rawProfile.availableHouseholds.map(
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
          ...rawProfile.onboarding,
          completedAt: rawProfile.onboarding.completedAt
            ? new Date(rawProfile.onboarding.completedAt)
            : null,
        },
      }
    : undefined;

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    },
  });

  // Update local state when profile data loads
  React.useEffect(() => {
    if (profile) {
      setProfileData({
        bio: profile.bio || "",
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        location: profile.location || "",
        pronouns: profile.pronouns || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    await updateProfileMutation.mutateAsync(profileData);
  };

  const handleFieldChange = (
    field: keyof typeof profileData,
    value: string,
  ) => {
    setProfileData({
      ...profileData,
      [field]: value,
    });
  };

  const getUserInitials = () =>
    user?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  const getDisplayName = () => {
    if (profile?.firstName || profile?.lastName) {
      return `${profile.firstName} ${profile.lastName}`.trim();
    }
    return user?.displayName || "User";
  };

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-[400px] p-0"
        side={side}
        sideOffset={8}
      >
        <div className="space-y-4">
          <ProfileHeader
            displayName={getDisplayName()}
            onEditClick={() => setIsEditing(!isEditing)}
            profile={profile}
            user={user}
            userInitials={getUserInitials()}
          />

          <Separator />

          {/* Tabs for different sections */}
          <div className="px-6 pb-4">
            <Tabs className="w-full" defaultValue="info">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>

              <TabsContent className="mt-4 space-y-4" value="info">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : isEditing ? (
                  <ProfileEditForm
                    isLoading={updateProfileMutation.isPending}
                    onCancel={() => setIsEditing(false)}
                    onFieldChange={handleFieldChange}
                    onSave={handleSave}
                    profileData={profileData}
                  />
                ) : (
                  <ProfileDisplay profile={profile} />
                )}
              </TabsContent>

              <TabsContent className="mt-4 space-y-4" value="preferences">
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-sm">Theme</p>
                    <p className="text-muted-foreground text-xs">
                      System default
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Language</p>
                    <p className="text-muted-foreground text-xs">
                      English (US)
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Timezone</p>
                    <p className="text-muted-foreground text-xs">
                      America/New_York
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    setIsOpen(false);
                    // Navigate to full settings page
                    window.location.href = "/settings";
                  }}
                  size="sm"
                  variant="outline"
                >
                  <UserIcon className="mr-2 h-3 w-3" />
                  View All Settings
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
