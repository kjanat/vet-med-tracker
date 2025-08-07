// Stack Auth profile page - custom implementation
import { Heart, MapPin, User } from "lucide-react";
import HouseholdSettingsPage from "./components/household-settings";
import PersonalInfoSection from "./components/personal-info";
import VetMedPreferencesPage from "./components/vet-med-preferences";

export default function ProfilePage() {
	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="mx-auto max-w-4xl px-4">
				<h1 className="mb-8 font-bold text-3xl text-gray-900">User Profile</h1>

				{/* Custom profile pages for Stack Auth */}
				<div className="space-y-8">
					{/* Personal Information Section */}
					<div className="rounded-lg bg-white shadow-lg">
						<div className="flex items-center gap-2 border-b p-6">
							<User className="h-5 w-5" />
							<h2 className="font-semibold text-xl">Personal Information</h2>
						</div>
						<PersonalInfoSection />
					</div>

					{/* VetMed Preferences Section */}
					<div className="rounded-lg bg-white shadow-lg">
						<div className="flex items-center gap-2 border-b p-6">
							<Heart className="h-5 w-5" />
							<h2 className="font-semibold text-xl">VetMed Preferences</h2>
						</div>
						<VetMedPreferencesPage />
					</div>

					{/* Household Settings Section */}
					<div className="rounded-lg bg-white shadow-lg">
						<div className="flex items-center gap-2 border-b p-6">
							<MapPin className="h-5 w-5" />
							<h2 className="font-semibold text-xl">Household Settings</h2>
						</div>
						<HouseholdSettingsPage />
					</div>
				</div>
			</div>
		</div>
	);
}
