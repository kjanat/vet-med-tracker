"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnimalList } from "@/components/settings/animals/animal-list"
import { RegimenList } from "@/components/settings/regimens/regimen-list"
import { MemberList } from "@/components/settings/household/member-list"
import { PushPanel } from "@/components/settings/notifications/push-panel"
import { EscalationPanel } from "@/components/settings/notifications/escalation-panel"
import { DataPanel } from "@/components/settings/data/data-panel"
import { PrefsPanel } from "@/components/settings/preferences/prefs-panel"
import { useSettingsTabs } from "@/hooks/useSettingsTabs"

export default function SettingsPage() {
  const { activeTab, setActiveTab } = useSettingsTabs()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your household, animals, and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="animals">Animals</TabsTrigger>
          <TabsTrigger value="regimens">Regimens</TabsTrigger>
          <TabsTrigger value="household">Household</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="data">Data & Privacy</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="animals" className="mt-6">
          <AnimalList />
        </TabsContent>

        <TabsContent value="regimens" className="mt-6">
          <RegimenList />
        </TabsContent>

        <TabsContent value="household" className="mt-6">
          <MemberList />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <div className="space-y-6">
            <PushPanel />
            <EscalationPanel />
          </div>
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <DataPanel />
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <PrefsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
