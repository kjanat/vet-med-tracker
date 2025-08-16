"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@stackframe/stack";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/server/trpc/client";

const ProfileDataSchema = z.object({
  // Basic Info (all optional)
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  pronouns: z.string().optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  location: z.string().optional(),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),

  // Social Links
  socialLinks: z
    .object({
      linkedin: z.string().optional(),
      twitter: z.string().optional(),
      github: z.string().optional(),
      instagram: z.string().optional(),
      custom: z
        .array(
          z.object({
            label: z.string(),
            url: z.string().url("Please enter a valid URL"),
          }),
        )
        .optional(),
    })
    .optional(),

  // Privacy Settings
  profileVisibility: z
    .object({
      name: z.boolean().optional(),
      email: z.boolean().optional(),
      bio: z.boolean().optional(),
      location: z.boolean().optional(),
      social: z.boolean().optional(),
    })
    .optional(),
});

type ProfileData = z.infer<typeof ProfileDataSchema>;

export default function PersonalInfoSection() {
  const _user = useUser();
  const [isEditing, setIsEditing] = useState(false);

  // React Hook Form setup
  const form = useForm<ProfileData>({
    resolver: zodResolver(ProfileDataSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      pronouns: "",
      bio: "",
      location: "",
      website: "",
      socialLinks: {
        linkedin: "",
        twitter: "",
        github: "",
        instagram: "",
      },
      profileVisibility: {
        name: true,
        email: false,
        bio: true,
        location: true,
        social: true,
      },
    },
  });

  const {
    formState: { isSubmitting },
    handleSubmit,
    reset,
    watch,
  } = form;

  // tRPC mutations
  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  // Load current profile data
  const { data: currentProfile, isLoading } = trpc.user.getProfile.useQuery();

  useEffect(() => {
    if (currentProfile) {
      const profileData = {
        firstName: currentProfile.firstName || "",
        lastName: currentProfile.lastName || "",
        pronouns: currentProfile.pronouns || "",
        bio: currentProfile.bio || "",
        location: currentProfile.location || "",
        website: currentProfile.website || "",
        socialLinks: {
          linkedin: currentProfile.socialLinks?.linkedin || "",
          twitter: currentProfile.socialLinks?.twitter || "",
          github: currentProfile.socialLinks?.github || "",
          instagram: currentProfile.socialLinks?.instagram || "",
        },
        profileVisibility: {
          name: currentProfile.profileVisibility?.name ?? true,
          email: currentProfile.profileVisibility?.email ?? false,
          bio: currentProfile.profileVisibility?.bio ?? true,
          location: currentProfile.profileVisibility?.location ?? true,
          social: currentProfile.profileVisibility?.social ?? true,
        },
      };
      reset(profileData);
    }
  }, [currentProfile, reset]);

  const onSubmit = async (data: ProfileData) => {
    await updateProfileMutation.mutateAsync(data);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (currentProfile) {
      const profileData = {
        firstName: currentProfile.firstName || "",
        lastName: currentProfile.lastName || "",
        pronouns: currentProfile.pronouns || "",
        bio: currentProfile.bio || "",
        location: currentProfile.location || "",
        website: currentProfile.website || "",
        socialLinks: {
          linkedin: currentProfile.socialLinks?.linkedin || "",
          twitter: currentProfile.socialLinks?.twitter || "",
          github: currentProfile.socialLinks?.github || "",
          instagram: currentProfile.socialLinks?.instagram || "",
        },
        profileVisibility: {
          name: currentProfile.profileVisibility?.name ?? true,
          email: currentProfile.profileVisibility?.email ?? false,
          bio: currentProfile.profileVisibility?.bio ?? true,
          location: currentProfile.profileVisibility?.location ?? true,
          social: currentProfile.profileVisibility?.social ?? true,
        },
      };
      reset(profileData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
        {/* Personal Information */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium text-lg">Personal Information</h3>
            {!isEditing ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
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
                    disabled={!isEditing}
                    placeholder="Tell us a bit about yourself..."
                    rows={4}
                    className="resize-none"
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
                    type="url"
                    disabled={!isEditing}
                    placeholder="https://yourwebsite.com"
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
          <h3 className="mb-4 font-medium text-lg">Social Links (Optional)</h3>
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
          <h3 className="mb-4 font-medium text-lg">Privacy Settings</h3>
          <p className="mb-4 text-muted-foreground text-sm">
            Control what information is visible to other household members
          </p>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="profileVisibility.name"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="visibility-name">Show Name</Label>
                  <Switch
                    id="visibility-name"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    disabled={!isEditing}
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
                    id="visibility-email"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    disabled={!isEditing}
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
                    id="visibility-bio"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    disabled={!isEditing}
                  />
                </div>
              )}
            />
            <FormField
              control={form.control}
              name="profileVisibility.location"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="visibility-location">Show Location</Label>
                  <Switch
                    id="visibility-location"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    disabled={!isEditing}
                  />
                </div>
              )}
            />
            <FormField
              control={form.control}
              name="profileVisibility.social"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="visibility-social">Show Social Links</Label>
                  <Switch
                    id="visibility-social"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    disabled={!isEditing}
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
                Adding profile information helps other household members know
                more about you. All fields are optional - fill in only what
                you're comfortable sharing.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </form>
    </Form>
  );
}
