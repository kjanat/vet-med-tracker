import { MoreVertical, UserPlus } from "lucide-react";
import { Badge } from "@/components/app/badge";
import { Button } from "@/components/app/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface Member {
  id: string;
  name: string;
  email?: string;
  role: string;
  avatar?: string;
  joinedAt?: Date;
  userId?: string;
  lastActiveAt?: Date;
}

interface MemberListProps {
  members?: Member[];
  onInviteMember?: () => void;
  onMemberAction?: (member: Member, action: string) => void;
  userRole?: string;
}

export function MemberList({
  members = [],
  onInviteMember,
  onMemberAction,
}: MemberListProps) {
  const getRoleVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case "owner":
        return "default";
      case "caregiver":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Household Members</CardTitle>
        <Button onClick={onInviteMember} size="sm" variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="py-4 text-muted-foreground text-sm">
            No members yet. Invite someone to help manage your household.
          </p>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <div
                className="flex items-center justify-between"
                key={member.id}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {member.avatar && (
                      <AvatarImage alt={member.name} src={member.avatar} />
                    )}
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    {member.email && (
                      <p className="text-muted-foreground text-xs">
                        {member.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getRoleVariant(member.role)}>
                    {member.role}
                  </Badge>
                  <Button
                    onClick={() => onMemberAction?.(member, "options")}
                    size="sm"
                    variant="ghost"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
