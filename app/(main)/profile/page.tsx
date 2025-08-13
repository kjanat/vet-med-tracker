// Stack Auth profile page - custom implementation
import { Heart, MapPin, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import HouseholdSettingsPage from "./components/household-settings";
import PersonalInfoSection from "./components/personal-info";
import VetMedPreferencesPage from "./components/vet-med-preferences";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="mb-8 font-bold text-3xl">User Profile</h1>

        {/* Custom profile pages for Stack Auth */}
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
              <PersonalInfoSection />
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
              <VetMedPreferencesPage />
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
              <HouseholdSettingsPage />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
