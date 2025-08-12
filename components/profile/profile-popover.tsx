"use client";

import { useUser } from "@stackframe/stack";
import { Edit, Loader2, Mail, MapPin, User as UserIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
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

export function ProfilePopover({
	children,
	align = "end",
	side = "bottom",
}: ProfilePopoverProps) {
	const user = useUser();
	const [isOpen, setIsOpen] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [profileData, setProfileData] = useState({
		firstName: "",
		lastName: "",
		bio: "",
		location: "",
		pronouns: "",
	});

	// tRPC queries
	const { data: profile, isLoading } = trpc.user.getProfile.useQuery(
		undefined,
		{ enabled: isOpen },
	);

	const updateProfileMutation = trpc.user.updateProfile.useMutation({
		onSuccess: () => {
			toast.success("Profile updated successfully!");
			setIsEditing(false);
		},
		onError: (error) => {
			toast.error(`Failed to update profile: ${error.message}`);
		},
	});

	// Update local state when profile data loads
	React.useEffect(() => {
		if (profile) {
			setProfileData({
				firstName: profile.firstName || "",
				lastName: profile.lastName || "",
				bio: profile.bio || "",
				location: profile.location || "",
				pronouns: profile.pronouns || "",
			});
		}
	}, [profile]);

	const handleSave = async () => {
		await updateProfileMutation.mutateAsync(profileData);
	};

	const userInitials =
		user?.displayName
			?.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase() || "U";

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>{children}</PopoverTrigger>
			<PopoverContent
				className="w-[400px] p-0"
				align={align}
				side={side}
				sideOffset={8}
			>
				<div className="space-y-4">
					{/* Header */}
					<div className="relative h-24 bg-gradient-to-r from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20">
						<div className="-bottom-10 absolute left-6">
							<Avatar className="h-20 w-20 border-4 border-background">
								<AvatarImage
									src={user?.profileImageUrl || undefined}
									alt={user?.displayName ?? "User avatar"}
								/>
								<AvatarFallback className="text-lg">
									{userInitials}
								</AvatarFallback>
							</Avatar>
						</div>
					</div>

					{/* User Info */}
					<div className="px-6 pt-8">
						<div className="flex items-start justify-between">
							<div>
								<h3 className="font-semibold text-lg">
									{profile?.firstName || profile?.lastName
										? `${profile.firstName} ${profile.lastName}`.trim()
										: user?.displayName || "User"}
								</h3>
								{profile?.pronouns && (
									<p className="text-muted-foreground text-sm">
										{profile.pronouns}
									</p>
								)}
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setIsEditing(!isEditing)}
							>
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

					<Separator />

					{/* Tabs for different sections */}
					<div className="px-6 pb-4">
						<Tabs defaultValue="info" className="w-full">
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="info">Info</TabsTrigger>
								<TabsTrigger value="preferences">Preferences</TabsTrigger>
							</TabsList>

							<TabsContent value="info" className="mt-4 space-y-4">
								{isLoading ? (
									<div className="flex items-center justify-center py-8">
										<Loader2 className="h-6 w-6 animate-spin" />
									</div>
								) : isEditing ? (
									<div className="space-y-4">
										<div className="grid grid-cols-2 gap-3">
											<div>
												<Label htmlFor="firstName" className="text-xs">
													First Name
												</Label>
												<Input
													id="firstName"
													value={profileData.firstName}
													onChange={(e) =>
														setProfileData({
															...profileData,
															firstName: e.target.value,
														})
													}
													className="h-8"
													placeholder="John"
												/>
											</div>
											<div>
												<Label htmlFor="lastName" className="text-xs">
													Last Name
												</Label>
												<Input
													id="lastName"
													value={profileData.lastName}
													onChange={(e) =>
														setProfileData({
															...profileData,
															lastName: e.target.value,
														})
													}
													className="h-8"
													placeholder="Doe"
												/>
											</div>
										</div>

										<div>
											<Label htmlFor="pronouns" className="text-xs">
												Pronouns
											</Label>
											<Input
												id="pronouns"
												value={profileData.pronouns}
												onChange={(e) =>
													setProfileData({
														...profileData,
														pronouns: e.target.value,
													})
												}
												className="h-8"
												placeholder="they/them, she/her, he/him"
											/>
										</div>

										<div>
											<Label htmlFor="location" className="text-xs">
												Location
											</Label>
											<Input
												id="location"
												value={profileData.location}
												onChange={(e) =>
													setProfileData({
														...profileData,
														location: e.target.value,
													})
												}
												className="h-8"
												placeholder="New York, NY"
											/>
										</div>

										<div>
											<Label htmlFor="bio" className="text-xs">
												Bio
											</Label>
											<Textarea
												id="bio"
												value={profileData.bio}
												onChange={(e) =>
													setProfileData({
														...profileData,
														bio: e.target.value,
													})
												}
												className="h-20 resize-none"
												placeholder="Tell us about yourself..."
											/>
										</div>

										<div className="flex gap-2">
											<Button
												size="sm"
												onClick={handleSave}
												disabled={updateProfileMutation.isPending}
												className="flex-1"
											>
												{updateProfileMutation.isPending ? (
													<Loader2 className="mr-2 h-3 w-3 animate-spin" />
												) : null}
												Save
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={() => setIsEditing(false)}
												className="flex-1"
											>
												Cancel
											</Button>
										</div>
									</div>
								) : (
									<div className="space-y-3">
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<p className="font-medium text-muted-foreground text-xs">
													First Name
												</p>
												<p>{profile?.firstName || "Not set"}</p>
											</div>
											<div>
												<p className="font-medium text-muted-foreground text-xs">
													Last Name
												</p>
												<p>{profile?.lastName || "Not set"}</p>
											</div>
										</div>
										<div>
											<p className="font-medium text-muted-foreground text-xs">
												Bio
											</p>
											<p className="text-sm">
												{profile?.bio || "No bio added yet"}
											</p>
										</div>
									</div>
								)}
							</TabsContent>

							<TabsContent value="preferences" className="mt-4 space-y-4">
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
									variant="outline"
									size="sm"
									className="w-full"
									onClick={() => {
										setIsOpen(false);
										// Navigate to full settings page
										window.location.href = "/settings";
									}}
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
