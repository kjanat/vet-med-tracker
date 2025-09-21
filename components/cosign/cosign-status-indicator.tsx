"use client";

import { formatDistanceToNow, parseISO } from "date-fns";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileSignature,
  X,
} from "lucide-react";
import Image from "next/image";
import type React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAvatarColor } from "@/lib/utils/avatar-utils";
import { cn } from "@/lib/utils/general";

interface CoSignRequestData {
  id: string;
  status: "pending" | "approved" | "rejected" | "expired";
  signature?: string | null;
  signedAt?: Date | null;
  rejectionReason?: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  requester: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  cosigner?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

interface CoSignStatusIndicatorProps {
  administrationId: string;
  isCoSigned: boolean;
  // These parameters are defined but intentionally unused in current implementation
  coSignUserId?: string | null;
  coSignedAt?: string | null;
  coSignNotes?: string | null;
  cosignRequest?: CoSignRequestData | null;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function CoSignStatusIndicator({
  administrationId: _administrationId,
  isCoSigned,
  coSignUserId: _coSignUserId,
  coSignedAt,
  coSignNotes,
  cosignRequest,
  showDetails = true,
  compact = false,
  className,
}: CoSignStatusIndicatorProps) {
  // Determine the current co-sign status
  const getStatus = () => {
    if (isCoSigned && coSignedAt) {
      return "approved";
    }

    if (cosignRequest) {
      return cosignRequest.status;
    }

    return "none";
  };

  const status = getStatus();

  // Status configuration
  const statusConfig = {
    approved: {
      bgColor: "bg-green-100",
      color: "success",
      icon: CheckCircle,
      label: "Co-signed",
      show: true,
    },
    expired: {
      bgColor: "bg-amber-100",
      color: "warning",
      icon: AlertTriangle,
      label: "Co-sign request expired",
      show: true,
    },
    none: {
      bgColor: "bg-secondary",
      color: "secondary",
      icon: null,
      label: "No co-sign required",
      show: false,
    },
    pending: {
      bgColor: "bg-amber-100",
      color: "warning",
      icon: Clock,
      label: "Pending co-signature",
      show: true,
    },
    rejected: {
      bgColor: "bg-red-100",
      color: "destructive",
      icon: X,
      label: "Co-sign rejected",
      show: true,
    },
  };

  const config = statusConfig[status];

  if (!config.show) {
    return null;
  }

  const IconComponent = config.icon;

  // Compact version - just the badge
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn("flex items-center gap-1", className)}
            variant={
              config.color as
                | "default"
                | "secondary"
                | "destructive"
                | "outline"
                | "success"
                | "warning"
                | "info"
            }
          >
            {IconComponent && <IconComponent className="h-3 w-3" />}
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{config.label}</p>
            {status === "pending" && cosignRequest && (
              <p className="text-xs">
                Expires{" "}
                {cosignRequest.expiresAt &&
                  formatDistanceToNow(cosignRequest.expiresAt, {
                    addSuffix: true,
                  })}
              </p>
            )}
            {status === "approved" && coSignedAt && (
              <p className="text-xs">
                Approved {formatDistanceToNow(coSignedAt, { addSuffix: true })}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Full version with details
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge
        className="flex items-center gap-1"
        variant={
          config.color as
            | "default"
            | "secondary"
            | "destructive"
            | "outline"
            | "success"
            | "warning"
            | "info"
        }
      >
        {IconComponent && <IconComponent className="h-3 w-3" />}
        {config.label}
      </Badge>

      {showDetails &&
        (status === "pending" ||
          status === "approved" ||
          status === "rejected") && (
          <Popover>
            <PopoverTrigger asChild>
              <Button className="h-6 w-6 p-1" size="sm" variant="ghost">
                <FileSignature className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80">
              <CoSignDetails
                coSignedAt={coSignedAt}
                coSignNotes={coSignNotes}
                cosignRequest={cosignRequest}
                status={status}
              />
            </PopoverContent>
          </Popover>
        )}
    </div>
  );
}

interface CoSignDetailsProps {
  status: "pending" | "approved" | "rejected" | "expired";
  cosignRequest?: CoSignRequestData | null;
  coSignedAt?: string | null;
  coSignNotes?: string | null;
}

// Helper functions for formatting
const formatUserName = (
  user: { name: string | null; email: string | null } | null,
) => {
  if (!user) return "Unknown User";
  return user.name || user.email || "Unknown User";
};

const formatTimestamp = (timestamp: string | Date | null | undefined) => {
  if (!timestamp) return "Unknown";
  return formatDistanceToNow(
    typeof timestamp === "string" ? parseISO(timestamp) : timestamp,
    { addSuffix: true },
  );
};

// User display component to reduce duplication
function UserDisplay({
  user,
  textClassName,
}: {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  textClassName?: string;
}) {
  const userName = formatUserName(user);

  return (
    <div className="flex items-center gap-1">
      <Avatar className="h-4 w-4">
        {user?.image && <AvatarImage src={user.image} />}
        <AvatarFallback className={cn(getAvatarColor(userName), "text-[8px]")}>
          {userName[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className={cn("font-medium", textClassName)}>{userName}</span>
    </div>
  );
}

// Detail row component to reduce duplication
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between">
      <span>{label}:</span>
      {children}
    </div>
  );
}

function CoSignDetails({
  status,
  cosignRequest,
  coSignedAt,
  coSignNotes,
}: CoSignDetailsProps) {
  return (
    <Card className="border-0 shadow-none">
      <CardContent className="space-y-3 p-0">
        <div>
          <h4 className="mb-2 font-medium text-sm">Co-signature Details</h4>
          <div className="space-y-1 text-muted-foreground text-xs">
            <PendingDetails cosignRequest={cosignRequest} status={status} />
            <ApprovedDetails
              coSignedAt={coSignedAt}
              cosignRequest={cosignRequest}
              status={status}
            />
            <RejectedDetails cosignRequest={cosignRequest} status={status} />
            <NotesSection coSignNotes={coSignNotes} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Pending status details
function PendingDetails({
  status,
  cosignRequest,
}: {
  status: string;
  cosignRequest?: CoSignRequestData | null;
}) {
  if (status !== "pending" || !cosignRequest) return null;

  return (
    <>
      <DetailRow label="Requested by">
        <UserDisplay user={cosignRequest.requester} />
      </DetailRow>

      <DetailRow label="Assigned to">
        {cosignRequest.cosigner && (
          <UserDisplay user={cosignRequest.cosigner} />
        )}
      </DetailRow>

      <DetailRow label="Requested">
        <span>{formatTimestamp(cosignRequest.createdAt)}</span>
      </DetailRow>

      <DetailRow label="Expires">
        <span className="text-amber-600">
          {formatTimestamp(cosignRequest.expiresAt)}
        </span>
      </DetailRow>
    </>
  );
}

// Approved status details
function ApprovedDetails({
  status,
  cosignRequest,
  coSignedAt,
}: {
  status: string;
  cosignRequest?: CoSignRequestData | null;
  coSignedAt?: string | null;
}) {
  if (status !== "approved") return null;

  return (
    <>
      {cosignRequest && (
        <>
          <DetailRow label="Requested by">
            <UserDisplay user={cosignRequest.requester} />
          </DetailRow>

          <DetailRow label="Approved by">
            {cosignRequest.cosigner && (
              <UserDisplay
                textClassName="text-green-700"
                user={cosignRequest.cosigner}
              />
            )}
          </DetailRow>
        </>
      )}

      {(coSignedAt || cosignRequest?.signedAt) && (
        <DetailRow label="Signed">
          <span className="font-medium text-green-700">
            {formatTimestamp(coSignedAt || cosignRequest?.signedAt)}
          </span>
        </DetailRow>
      )}

      <DigitalSignature signature={cosignRequest?.signature ?? undefined} />
    </>
  );
}

// Rejected status details
function RejectedDetails({
  status,
  cosignRequest,
}: {
  status: string;
  cosignRequest?: CoSignRequestData | null;
}) {
  if (status !== "rejected" || !cosignRequest) return null;

  return (
    <>
      <DetailRow label="Requested by">
        <span className="font-medium">
          {formatUserName(cosignRequest.requester)}
        </span>
      </DetailRow>

      <DetailRow label="Rejected by">
        <span className="font-medium text-red-700">
          {formatUserName(cosignRequest.cosigner || null)}
        </span>
      </DetailRow>

      <DetailRow label="Rejected">
        <span className="text-red-700">
          {formatTimestamp(cosignRequest.createdAt)}
        </span>
      </DetailRow>

      <RejectionReason reason={cosignRequest.rejectionReason} />
    </>
  );
}

// Digital signature display
function DigitalSignature({ signature }: { signature?: string }) {
  if (!signature) return null;

  return (
    <>
      <Separator className="my-2" />
      <div className="space-y-1">
        <span className="font-medium text-xs">Digital Signature:</span>
        <div className="rounded-md border bg-background p-2">
          <Image
            alt="Digital signature"
            className="h-auto max-w-full"
            height={60}
            src={signature}
            style={{ maxHeight: "60px" }}
            unoptimized
            width={200}
          />
        </div>
      </div>
    </>
  );
}

// Rejection reason display
function RejectionReason({ reason }: { reason?: string | null }) {
  if (!reason) return null;

  return (
    <>
      <Separator className="my-2" />
      <div className="space-y-1">
        <span className="font-medium text-xs">Rejection Reason:</span>
        <p className="rounded border bg-red-50 p-2 text-red-800 text-xs">
          {reason}
        </p>
      </div>
    </>
  );
}

// Notes section
function NotesSection({ coSignNotes }: { coSignNotes?: string | null }) {
  if (!coSignNotes) return null;

  return (
    <>
      <Separator className="my-2" />
      <div className="space-y-1">
        <span className="font-medium text-xs">Notes:</span>
        <p className="rounded bg-muted p-2 text-xs">{coSignNotes}</p>
      </div>
    </>
  );
}
