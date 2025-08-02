import { UserProfile } from "@clerk/nextjs";
import { Heart, MapPin } from "lucide-react";
import HouseholdSettingsPage from "./components/household-settings";
import VetMedPreferencesPage from "./components/vet-med-preferences";

export default function ProfilePage() {
	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="max-w-4xl mx-auto px-4">
				<h1 className="text-3xl font-bold text-gray-900 mb-8">User Profile</h1>

				<UserProfile
					path="/profile"
					routing="path"
					appearance={{
						elements: {
							card: "shadow-lg",
							headerTitle: "text-xl font-semibold",
							headerSubtitle: "text-gray-600",
						},
					}}
				>
					{/* Custom VetMed Preferences Page */}
					<UserProfile.Page
						label="VetMed Preferences"
						url="vetmed-preferences"
						labelIcon={<Heart className="w-4 h-4" />}
					>
						<VetMedPreferencesPage />
					</UserProfile.Page>

					{/* Household Settings Page */}
					<UserProfile.Page
						label="Household Settings"
						url="household-settings"
						labelIcon={<MapPin className="w-4 h-4" />}
					>
						<HouseholdSettingsPage />
					</UserProfile.Page>

					{/* Reorder default pages */}
					<UserProfile.Page label="account" />
					<UserProfile.Page label="security" />
				</UserProfile>
			</div>
		</div>
	);
}
