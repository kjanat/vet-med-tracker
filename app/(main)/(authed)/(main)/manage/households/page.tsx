"use client";

import { Building2, Plus } from "lucide-react";
import { useState } from "react";
import { HouseholdCard } from "@/components/household/household-card";
import { HouseholdDetails } from "@/components/household/household-details";
import {
  EditHouseholdDialog,
  LeaveHouseholdDialog,
} from "@/components/household/household-dialogs";
import { type Member, MemberList } from "@/components/household/member-list";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/shared/use-toast";
import { trpc } from "@/server/trpc/client";

export default function HouseholdsPage() {
  const { user, selectedHousehold, selectedAnimal, setSelectedHousehold } =
    useApp();
  const { toast } = useToast();

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
    data: memberships,
    isLoading,
    refetch,
  } = trpc.user.getMemberships.useQuery(undefined, {
    enabled: !!user,
  });

  // Get detailed data for selected household
  const { data: selectedHouseholdData } = trpc.household.get.useQuery(
    { householdId: selectedHousehold?.id ?? "" },
    { enabled: !!selectedHousehold?.id },
  );

  // Get members for selected household
  const { data: membersData } = trpc.household.getMembers.useQuery(
    { householdId: selectedHousehold?.id ?? "" },
    { enabled: !!selectedHousehold?.id },
  );

  // Transform members data
  const members: Member[] =
    membersData?.map((member) => ({
      id: member.id,
      userId: member.userId,
      email: member.user.email,
      name: member.user.name || undefined,
      avatar: member.user.image || undefined,
      role: member.role,
      joinedAt: new Date(member.createdAt),
      lastActiveAt: member.updatedAt ? new Date(member.updatedAt) : undefined,
    })) ?? [];

  // Find current user's role in selected household
  const currentUserMembership = membersData?.find(
    (member) => member.userId === user?.id,
  );
  const userRoleInSelected = currentUserMembership?.role;

  // Mutations
  const updateHouseholdMutation = trpc.household.update.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Household updated",
        description: "Your household settings have been saved.",
      });
      // Update the selected household in context if it was updated
      if (selectedHousehold && data.id === selectedHousehold.id) {
        setSelectedHousehold({ ...selectedHousehold, name: data.name });
      }
      setIsEditDialogOpen(false);
      setEditingHouseholdId(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Failed to update household",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const leaveHouseholdMutation = trpc.household.leave.useMutation({
    onSuccess: () => {
      toast({
        title: "Left household",
        description: "You have successfully left the household.",
      });
      // Clear selected if leaving current household
      if (leavingHouseholdId === selectedHousehold?.id) {
        setSelectedHousehold(null);
      }
      setIsLeaveDialogOpen(false);
      setLeavingHouseholdId(null);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Failed to leave household",
        description: error.message,
        variant: "destructive",
      });
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
      householdId: editingHouseholdId,
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
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Households</TabsTrigger>
          {selectedHousehold && (
            <TabsTrigger value="current">Current Household</TabsTrigger>
          )}
        </TabsList>

        {/* All Households Tab */}
        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4">
            {memberships?.map((membership) => (
              <HouseholdCard
                key={membership.household.id}
                membership={membership}
                isSelected={selectedHousehold?.id === membership.household.id}
                onMakeActive={() => setSelectedHousehold(membership.household)}
                onEdit={() => handleEditHousehold(membership.household.id)}
                onLeave={() => {
                  setLeavingHouseholdId(membership.household.id);
                  setIsLeaveDialogOpen(true);
                }}
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
          <TabsContent value="current" className="space-y-6">
            {selectedHouseholdData && (
              <HouseholdDetails
                household={selectedHouseholdData}
                userRole={userRoleInSelected}
                onEdit={() => handleEditHousehold(selectedHousehold.id)}
                onLeave={() => {
                  setLeavingHouseholdId(selectedHousehold.id);
                  setIsLeaveDialogOpen(true);
                }}
              />
            )}
            <MemberList members={members} userRole={userRoleInSelected} />
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <EditHouseholdDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editedName={editedName}
        onNameChange={setEditedName}
        editedTimezone={editedTimezone}
        onTimezoneChange={setEditedTimezone}
        onSave={handleSaveHousehold}
        isSaving={updateHouseholdMutation.isPending}
      />
      <LeaveHouseholdDialog
        open={isLeaveDialogOpen}
        onOpenChange={setIsLeaveDialogOpen}
        onLeave={handleLeaveHousehold}
        isLeaving={leaveHouseholdMutation.isPending}
      />
    </div>
  );
}
