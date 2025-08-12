"use client";

import { useUser } from "@stackframe/stack";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/server/trpc/client";

interface ProfileData {
	// Basic Info (all optional)
	firstName?: string;
	lastName?: string;
	pronouns?: string;
	bio?: string;
	location?: string;
	website?: string;

	// Social Links
	socialLinks?: {
		linkedin?: string;
		twitter?: string;
		github?: string;
		instagram?: string;
		custom?: Array<{ label: string; url: string }>;
	};

	// Privacy Settings
	profileVisibility?: {
		name?: boolean;
		email?: boolean;
		bio?: boolean;
		location?: boolean;
		social?: boolean;
	};
}

export default function PersonalInfoSection() {
	const _user = useUser();
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [profileData, setProfileData] = useState<ProfileData>({
		profileVisibility: {
			name: true,
			email: false,
			bio: true,
			location: true,
			social: true,
		},
	});

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
			setProfileData({
				firstName: currentProfile.firstName || "",
				lastName: currentProfile.lastName || "",
				pronouns: currentProfile.pronouns || "",
				bio: currentProfile.bio || "",
				location: currentProfile.location || "",
				website: currentProfile.website || "",
				socialLinks: currentProfile.socialLinks || {},
				profileVisibility: currentProfile.profileVisibility || {
					name: true,
					email: false,
					bio: true,
					location: true,
					social: true,
				},
			});
		}
	}, [currentProfile]);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await updateProfileMutation.mutateAsync(profileData);
		} finally {
			setIsSaving(false);
		}
	};

	const updateField = (field: keyof ProfileData, value: any) => {
		setProfileData((prev) => ({ ...prev, [field]: value }));
	};

	const updateSocialLink = (platform: string, url: string) => {
		setProfileData((prev) => ({
			...prev,
			socialLinks: {
				...prev.socialLinks,
				[platform]: url,
			},
		}));
	};

	const updateVisibility = (field: string, visible: boolean) => {
		setProfileData((prev) => ({
			...prev,
			profileVisibility: {
				...prev.profileVisibility,
				[field]: visible,
			},
		}));
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6">
			{/* Personal Information */}
			<div>
				<div className="mb-4 flex items-center justify-between">
					<h3 className="font-medium text-lg">Personal Information</h3>
					{!isEditing ? (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsEditing(true)}
						>
							Edit Profile
						</Button>
					) : (
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsEditing(false)}
							>
								Cancel
							</Button>
							<Button size="sm" onClick={handleSave} disabled={isSaving}>
								{isSaving ? (
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
					<div>
						<Label htmlFor="firstName">First Name (Optional)</Label>
						<Input
							id="firstName"
							value={profileData.firstName || ""}
							onChange={(e) => updateField("firstName", e.target.value)}
							disabled={!isEditing}
							placeholder="Enter your first name"
						/>
					</div>
					<div>
						<Label htmlFor="lastName">Last Name (Optional)</Label>
						<Input
							id="lastName"
							value={profileData.lastName || ""}
							onChange={(e) => updateField("lastName", e.target.value)}
							disabled={!isEditing}
							placeholder="Enter your last name"
						/>
					</div>
					<div>
						<Label htmlFor="pronouns">Pronouns (Optional)</Label>
						<Input
							id="pronouns"
							value={profileData.pronouns || ""}
							onChange={(e) => updateField("pronouns", e.target.value)}
							disabled={!isEditing}
							placeholder="e.g., they/them, she/her, he/him"
						/>
					</div>
					<div>
						<Label htmlFor="location">Location (Optional)</Label>
						<Input
							id="location"
							value={profileData.location || ""}
							onChange={(e) => updateField("location", e.target.value)}
							disabled={!isEditing}
							placeholder="e.g., New York, NY"
						/>
					</div>
				</div>

				<div className="mt-4">
					<Label htmlFor="bio">Bio (Optional)</Label>
					<Textarea
						id="bio"
						value={profileData.bio || ""}
						onChange={(e) => updateField("bio", e.target.value)}
						disabled={!isEditing}
						placeholder="Tell us a bit about yourself..."
						rows={4}
						className="resize-none"
					/>
				</div>

				<div className="mt-4">
					<Label htmlFor="website">Website (Optional)</Label>
					<Input
						id="website"
						type="url"
						value={profileData.website || ""}
						onChange={(e) => updateField("website", e.target.value)}
						disabled={!isEditing}
						placeholder="https://yourwebsite.com"
					/>
				</div>
			</div>

			<Separator />

			{/* Social Links */}
			<div>
				<h3 className="mb-4 font-medium text-lg">Social Links (Optional)</h3>
				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<Label htmlFor="linkedin">LinkedIn</Label>
						<Input
							id="linkedin"
							value={profileData.socialLinks?.linkedin || ""}
							onChange={(e) => updateSocialLink("linkedin", e.target.value)}
							disabled={!isEditing}
							placeholder="linkedin.com/in/yourprofile"
						/>
					</div>
					<div>
						<Label htmlFor="twitter">Twitter/X</Label>
						<Input
							id="twitter"
							value={profileData.socialLinks?.twitter || ""}
							onChange={(e) => updateSocialLink("twitter", e.target.value)}
							disabled={!isEditing}
							placeholder="twitter.com/yourhandle"
						/>
					</div>
					<div>
						<Label htmlFor="github">GitHub</Label>
						<Input
							id="github"
							value={profileData.socialLinks?.github || ""}
							onChange={(e) => updateSocialLink("github", e.target.value)}
							disabled={!isEditing}
							placeholder="github.com/yourusername"
						/>
					</div>
					<div>
						<Label htmlFor="instagram">Instagram</Label>
						<Input
							id="instagram"
							value={profileData.socialLinks?.instagram || ""}
							onChange={(e) => updateSocialLink("instagram", e.target.value)}
							disabled={!isEditing}
							placeholder="instagram.com/yourhandle"
						/>
					</div>
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
					<div className="flex items-center justify-between">
						<Label htmlFor="visibility-name">Show Name</Label>
						<Switch
							id="visibility-name"
							checked={profileData.profileVisibility?.name ?? true}
							onCheckedChange={(checked) => updateVisibility("name", checked)}
							disabled={!isEditing}
						/>
					</div>
					<div className="flex items-center justify-between">
						<Label htmlFor="visibility-email">Show Email</Label>
						<Switch
							id="visibility-email"
							checked={profileData.profileVisibility?.email ?? false}
							onCheckedChange={(checked) => updateVisibility("email", checked)}
							disabled={!isEditing}
						/>
					</div>
					<div className="flex items-center justify-between">
						<Label htmlFor="visibility-bio">Show Bio</Label>
						<Switch
							id="visibility-bio"
							checked={profileData.profileVisibility?.bio ?? true}
							onCheckedChange={(checked) => updateVisibility("bio", checked)}
							disabled={!isEditing}
						/>
					</div>
					<div className="flex items-center justify-between">
						<Label htmlFor="visibility-location">Show Location</Label>
						<Switch
							id="visibility-location"
							checked={profileData.profileVisibility?.location ?? true}
							onCheckedChange={(checked) =>
								updateVisibility("location", checked)
							}
							disabled={!isEditing}
						/>
					</div>
					<div className="flex items-center justify-between">
						<Label htmlFor="visibility-social">Show Social Links</Label>
						<Switch
							id="visibility-social"
							checked={profileData.profileVisibility?.social ?? true}
							onCheckedChange={(checked) => updateVisibility("social", checked)}
							disabled={!isEditing}
						/>
					</div>
				</div>
			</div>

			{/* Profile Completion Status */}
			{!currentProfile?.profileCompletedAt && (
				<Card className="border-primary/20 bg-primary/5">
					<CardHeader>
						<CardTitle>
							Complete Your Profile
						</CardTitle>
						<CardDescription>
							Adding profile information helps other household members know more
							about you. All fields are optional - fill in only what you're
							comfortable sharing.
						</CardDescription>
					</CardHeader>
				</Card>
			)}
		</div>
	);
}
