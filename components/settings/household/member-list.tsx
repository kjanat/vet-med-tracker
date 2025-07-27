"use client"

import { useState } from "react"
import { Plus, Crown, Shield, Eye, MoreHorizontal, Mail, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { InviteForm } from "./invite-form"

export interface Member {
  id: string
  userId: string
  email: string
  name?: string
  avatar?: string
  role: "Owner" | "Caregiver" | "VetReadOnly"
  joinedAt: Date
  lastActiveAt?: Date
}

export interface PendingInvite {
  id: string
  email: string
  role: "Owner" | "Caregiver" | "VetReadOnly"
  invitedBy: string
  invitedAt: Date
  expiresAt: Date
}

// Mock data - replace with tRPC
const mockMembers: Member[] = [
  {
    id: "1",
    userId: "user-1",
    email: "john@example.com",
    name: "John Smith",
    avatar: "/placeholder.svg?height=40&width=40",
    role: "Owner",
    joinedAt: new Date("2024-01-01"),
    lastActiveAt: new Date(),
  },
  {
    id: "2",
    userId: "user-2",
    email: "jane@example.com",
    name: "Jane Doe",
    avatar: "/placeholder.svg?height=40&width=40",
    role: "Caregiver",
    joinedAt: new Date("2024-01-15"),
    lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
]

const mockPendingInvites: PendingInvite[] = [
  {
    id: "invite-1",
    email: "vet@example.com",
    role: "VetReadOnly",
    invitedBy: "John Smith",
    invitedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
  },
]

// Mock current user - replace with auth context
const currentUser = { id: "user-1", role: "Owner" }

const roleIcons = {
  Owner: Crown,
  Caregiver: Shield,
  VetReadOnly: Eye,
}

const roleColors = {
  Owner: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Caregiver: "bg-blue-100 text-blue-800 border-blue-200",
  VetReadOnly: "bg-gray-100 text-gray-800 border-gray-200",
}

export function MemberList() {
  const [inviteFormOpen, setInviteFormOpen] = useState(false)
  const [members, setMembers] = useState(mockMembers)
  const [pendingInvites, setPendingInvites] = useState(mockPendingInvites)

  const canManageRoles = currentUser.role === "Owner"

  const handleInvite = async (email: string, role: "Owner" | "Caregiver" | "VetReadOnly") => {
    console.log("Inviting:", { email, role })

    // Fire instrumentation event
    window.dispatchEvent(
      new CustomEvent("settings_household_invite", {
        detail: { email, role },
      }),
    )

    // TODO: tRPC mutation
    // await inviteMember.mutateAsync({ householdId, email, role })

    // Optimistic update
    const newInvite: PendingInvite = {
      id: `invite-${Date.now()}`,
      email,
      role,
      invitedBy: currentUser.id,
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }

    setPendingInvites((prev) => [...prev, newInvite])
    setInviteFormOpen(false)

    console.log(`Invited ${email} as ${role}`)
  }

  const handleRoleChange = async (memberId: string, newRole: "Owner" | "Caregiver" | "VetReadOnly") => {
    if (!canManageRoles) return

    console.log("Changing role:", { memberId, newRole })

    // Fire instrumentation event
    window.dispatchEvent(
      new CustomEvent("settings_household_role_change", {
        detail: { memberId, newRole },
      }),
    )

    // TODO: tRPC mutation
    // await updateMemberRole.mutateAsync({ membershipId: memberId, role: newRole })

    // Optimistic update
    setMembers((prev) => prev.map((member) => (member.id === memberId ? { ...member, role: newRole } : member)))

    console.log(`Updated role to ${newRole}`)
  }

  const handleRevokeInvite = async (inviteId: string) => {
    console.log("Revoking invite:", inviteId)

    // TODO: tRPC mutation
    // await revokeInvite.mutateAsync({ inviteId })

    setPendingInvites((prev) => prev.filter((invite) => invite.id !== inviteId))

    console.log("Invite revoked")
  }

  const handleResendInvite = async (inviteId: string) => {
    console.log("Resending invite:", inviteId)

    // TODO: tRPC mutation
    // await resendInvite.mutateAsync({ inviteId })

    console.log("Invite resent")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Household & Roles</h2>
          <p className="text-muted-foreground">Manage household members and their permissions</p>
        </div>
        {canManageRoles && (
          <Button onClick={() => setInviteFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Permission Matrix Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Owner</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Full access to everything</li>
                <li>• Manage members and roles</li>
                <li>• Delete household data</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Caregiver</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Record medications</li>
                <li>• Edit own records (10min window)</li>
                <li>• Manage inventory</li>
                <li>• Create non-high-risk regimens</li>
                <li>• Co-sign medications</li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Vet Read-Only</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View history and insights</li>
                <li>• Export data</li>
                <li>• No write permissions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={member.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{member.name?.[0] || member.email[0].toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="font-medium">{member.name || member.email}</div>
                    <div className="text-sm text-muted-foreground">{member.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Joined {member.joinedAt.toLocaleDateString()}
                      {member.lastActiveAt && <span> • Last active {member.lastActiveAt.toLocaleString()}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {canManageRoles && member.id !== currentUser.id ? (
                    <Select
                      value={member.role}
                      onValueChange={(value) => handleRoleChange(member.id, value as typeof member.role)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Owner">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4" />
                            Owner
                          </div>
                        </SelectItem>
                        <SelectItem value="Caregiver">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Caregiver
                          </div>
                        </SelectItem>
                        <SelectItem value="VetReadOnly">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Vet Read-Only
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={roleColors[member.role]}>
                      \{roleIcons[member.role] && <roleIcons[member.role] className=\"h-3 w-3 mr-1" />}
                      {member.role}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites ({pendingInvites.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div>
                      <div className="font-medium">{invite.email}</div>
                      <div className="text-sm text-muted-foreground">
                        Invited by {invite.invitedBy} • {invite.invitedAt.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Expires {invite.expiresAt.toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={roleColors[invite.role]}>
                      {roleIcons[invite.role] && <roleIcons[invite.role] className=\"h-3 w-3 mr-1" />}
                      {invite.role}
                    </Badge>

                    {canManageRoles && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleResendInvite(invite.id)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Resend Invite
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRevokeInvite(invite.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Revoke Invite
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Form */}
      <InviteForm open={inviteFormOpen} onOpenChange={setInviteFormOpen} onInvite={handleInvite} />
    </div>
  )
}
