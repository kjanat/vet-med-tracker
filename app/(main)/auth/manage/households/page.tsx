"use client";

import { Building2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/app/button";
import { HouseholdCard } from "@/components/household/household-card";
import { HouseholdDetails } from "@/components/household/household-details";
import {
  EditHouseholdDialog,
  LeaveHouseholdDialog,
} from "@/components/household/household-dialogs";
import { type Member, MemberList } from "@/components/household/member-list";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/server/trpc/client";

export default function HouseholdsPage() {
  const { user, selectedHousehold, selectedAnimal, setSelectedHousehold } =
    useApp();

  // Get timezone from animal or household context
  const timezone =
    selectedAnimal?.timezone || selectedHousehold?.timezone || "UTC";
  const [, setCreatingHousehold] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [editingHouseholdId, setEditingHouseholdId] = useState<string | null>(
    null,
  );
  const [leavingHouseholdId, setLeavingHouseholdId] = useState<string | null>(
    null,
  );
  const [editedName, setEditedName] = useState("");
  const [editedTimezone, setEditedTimezone] = useState("");

  // Get user's households
  const {
    data: rawMemberships,
    isLoading,
    refetch,
  } = trpc.user.getMemberships.useQuery(undefined, {
    enabled: Boolean(user),
  });

  // Transform memberships to convert createdAt to Date
  const memberships = rawMemberships?.map((membership) => ({
    ...membership,
    household: {
      ...membership.household,
      createdAt: new Date(membership.household.createdAt),
    },
  }));

  // Get detailed data for selected household
  const { data: rawSelectedHouseholdData } = trpc.households.get.useQuery(
    { householdId: selectedHousehold?.id ?? "" },
    { enabled: Boolean(selectedHousehold?.id) },
  );

  // Transform selectedHouseholdData to convert createdAt to Date
  const selectedHouseholdData = rawSelectedHouseholdData
    ? {
        ...rawSelectedHouseholdData,
        createdAt: new Date(rawSelectedHouseholdData.createdAt),
      }
    : undefined;

  // Get members for selected household
  const { data: membersData } = trpc.households.getMembers.useQuery(
    { householdId: selectedHousehold?.id ?? "" },
    { enabled: Boolean(selectedHousehold?.id) },
  );

  // Transform members data
  const members: Member[] =
    membersData?.map((member) => ({
      id: member.id,
      userId: member.user.id,
      email: member.user.email,
      name: member.user.name ?? "",
      avatar: member.user.image ?? undefined,
      role: member.role,
      joinedAt: member.joinedAt,
      lastActiveAt: undefined,
    })) ?? [];

  // Find current user's role in selected household
  const currentUserMembership = membersData?.find(
    (member) => member.user.id === user?.id,
  );
  const userRoleInSelected = currentUserMembership?.role;

  // Mutations
  const updateHouseholdMutation = trpc.households.update.useMutation({
    onSuccess: (data) => {
      toast.success("Your household settings have been saved.");
      // Update the selected household in context if it was updated
      if (selectedHousehold && data.id === selectedHousehold.id) {
        setSelectedHousehold({ ...selectedHousehold, name: data.name });
      }
      setIsEditDialogOpen(false);
      setEditingHouseholdId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update household: ${error.message}`);
    },
  });

  const leaveHouseholdMutation = trpc.households.leave.useMutation({
    onSuccess: () => {
      toast.success("You have successfully left the household.");
      // Clear selected if leaving current household
      if (leavingHouseholdId === selectedHousehold?.id) {
        setSelectedHousehold(null);
      }
      setIsLeaveDialogOpen(false);
      setLeavingHouseholdId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to leave household: ${error.message}`);
    },
  });

  const handleEditHousehold = (householdId: string) => {
    const membership = memberships?.find((m) => m.household.id === householdId);
    if (!membership) return;

    setEditingHouseholdId(householdId);
    setEditedName(membership.household.name);
    setEditedTimezone(membership.household.timezone || timezone);
    setIsEditDialogOpen(true);
  };

  const handleSaveHousehold = () => {
    if (!editingHouseholdId) return;
    updateHouseholdMutation.mutate({
      id: editingHouseholdId,
      name: editedName,
      timezone: editedTimezone,
    });
  };

  const handleLeaveHousehold = () => {
    if (!leavingHouseholdId) return;
    leaveHouseholdMutation.mutate({
      householdId: leavingHouseholdId,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Manage your households and their members
        </p>
        <Button onClick={() => setCreatingHousehold(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Household
        </Button>
      </div>

      {/* Main Content with Tabs */}
      <Tabs className="space-y-6" defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Households</TabsTrigger>
          {selectedHousehold && (
            <TabsTrigger value="current">Current Household</TabsTrigger>
          )}
        </TabsList>

        {/* All Households Tab */}
        <TabsContent className="space-y-4" value="all">
          <div className="grid gap-4">
            {memberships?.map((membership) => (
              <HouseholdCard
                isSelected={selectedHousehold?.id === membership.household.id}
                key={membership.household.id}
                membership={membership}
                onEdit={() => handleEditHousehold(membership.household.id)}
                onLeave={() => {
                  setLeavingHouseholdId(membership.household.id);
                  setIsLeaveDialogOpen(true);
                }}
                onMakeActive={() => setSelectedHousehold(membership.household)}
              />
            ))}
          </div>

          {/* Empty State */}
          {(!memberships || memberships.length === 0) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 font-semibold text-lg">
                  No households yet
                </h3>
                <p className="mb-4 text-center text-muted-foreground">
                  Create your first household to start managing medications
                </p>
                <Button onClick={() => setCreatingHousehold(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Household
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Current Household Tab */}
        {selectedHousehold && (
          <TabsContent className="space-y-6" value="current">
            {selectedHouseholdData && (
              <HouseholdDetails
                household={selectedHouseholdData}
                onEdit={() => handleEditHousehold(selectedHousehold.id)}
                onLeave={() => {
                  setLeavingHouseholdId(selectedHousehold.id);
                  setIsLeaveDialogOpen(true);
                }}
                userRole={userRoleInSelected}
              />
            )}
            <MemberList members={members} userRole={userRoleInSelected} />
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <EditHouseholdDialog
        editedName={editedName}
        editedTimezone={editedTimezone}
        isSaving={updateHouseholdMutation.isPending}
        onNameChange={setEditedName}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveHousehold}
        onTimezoneChange={setEditedTimezone}
        open={isEditDialogOpen}
      />
      <LeaveHouseholdDialog
        isLeaving={leaveHouseholdMutation.isPending}
        onLeave={handleLeaveHousehold}
        onOpenChange={setIsLeaveDialogOpen}
        open={isLeaveDialogOpen}
      />
    </div>
  );
}
