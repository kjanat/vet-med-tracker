"use client";

import { MoreVertical, Search, Shield, UserPlus } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { trpc } from "@/server/trpc/client";

export default function UsersPage() {
  const { selectedHousehold, selectedAnimal } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setInvitingUser] = useState(false);

  // Get timezone from animal or household context
  const timezone =
    selectedAnimal?.timezone || selectedHousehold?.timezone || "UTC";

  // Get household members
  const { data: members, isLoading } = trpc.household.getMembers.useQuery(
    { householdId: selectedHousehold?.id || "" },
    { enabled: !!selectedHousehold },
  );

  // Check user's role in household
  const { data: userMembership } = trpc.user.getMembership.useQuery(
    { householdId: selectedHousehold?.id || "" },
    { enabled: !!selectedHousehold },
  );

  const canManageUsers = userMembership?.role === "OWNER";

  const filteredMembers = members?.filter(
    (member) =>
      member.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!selectedHousehold) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Please select a household to manage users
        </p>
      </div>
    );
  }

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
          Members of {selectedHousehold.name}
        </p>
        {canManageUsers && (
          <Button onClick={() => setInvitingUser(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredMembers?.map((member) => {
          const initials =
            member.user.name
              ?.split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase() ||
            member.user.email?.[0]?.toUpperCase() ||
            "?";

          return (
            <Card key={member.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={member.user.image || undefined}
                        alt={member.user.name || "User"}
                      />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {member.user.name || "Unknown User"}
                        </h3>
                        <Badge
                          variant={
                            member.role === "OWNER" ? "default" : "secondary"
                          }
                          className="flex items-center gap-1"
                        >
                          <Shield className="h-3 w-3" />
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {member.user.email}
                      </p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        Joined{" "}
                        {new Date(member.createdAt).toLocaleDateString(
                          "en-US",
                          { timeZone: timezone },
                        )}
                      </p>
                    </div>
                  </div>
                  {canManageUsers && member.role !== "OWNER" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Change Role</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Remove User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredMembers?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold text-lg">No users found</h3>
            <p className="text-center text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search"
                : "No members in this household yet"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
