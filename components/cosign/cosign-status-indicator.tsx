"use client";

import { formatDistanceToNow, parseISO } from "date-fns";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileSignature,
  X,
} from "lucide-react";
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
  signedAt?: string | null;
  rejectionReason?: string | null;
  expiresAt: string;
  createdAt: string;
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
  coSignUserId?: string | null;
  coSignedAt?: string | null;
  coSignNotes?: string | null;
  cosignRequest?: CoSignRequestData | null;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function CoSignStatusIndicator({
  administrationId,
  isCoSigned,
  coSignUserId,
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
    none: {
      icon: null,
      label: "No co-sign required",
      color: "secondary",
      bgColor: "bg-secondary",
      show: false,
    },
    pending: {
      icon: Clock,
      label: "Pending co-signature",
      color: "warning",
      bgColor: "bg-amber-100",
      show: true,
    },
    approved: {
      icon: CheckCircle,
      label: "Co-signed",
      color: "success",
      bgColor: "bg-green-100",
      show: true,
    },
    rejected: {
      icon: X,
      label: "Co-sign rejected",
      color: "destructive",
      bgColor: "bg-red-100",
      show: true,
    },
    expired: {
      icon: AlertTriangle,
      label: "Co-sign request expired",
      color: "warning",
      bgColor: "bg-amber-100",
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
            variant={config.color as any}
            className={cn("flex items-center gap-1", className)}
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
                {formatDistanceToNow(parseISO(cosignRequest.expiresAt), {
                  addSuffix: true,
                })}
              </p>
            )}
            {status === "approved" && coSignedAt && (
              <p className="text-xs">
                Approved{" "}
                {formatDistanceToNow(parseISO(coSignedAt), { addSuffix: true })}
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
      <Badge variant={config.color as any} className="flex items-center gap-1">
        {IconComponent && <IconComponent className="h-3 w-3" />}
        {config.label}
      </Badge>

      {showDetails &&
        (status === "pending" ||
          status === "approved" ||
          status === "rejected") && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-1">
                <FileSignature className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <CoSignDetails
                status={status}
                cosignRequest={cosignRequest}
                coSignedAt={coSignedAt}
                coSignNotes={coSignNotes}
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

function CoSignDetails({
  status,
  cosignRequest,
  coSignedAt,
  coSignNotes,
}: CoSignDetailsProps) {
  const formatUserName = (
    user: { name: string | null; email: string | null } | null,
  ) => {
    if (!user) return "Unknown User";
    return user.name || user.email || "Unknown User";
  };

  const formatTimestamp = (timestamp: string) => {
    return formatDistanceToNow(parseISO(timestamp), { addSuffix: true });
  };

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="space-y-3 p-0">
        <div>
          <h4 className="mb-2 font-medium text-sm">Co-signature Details</h4>
          <div className="space-y-1 text-muted-foreground text-xs">
            {status === "pending" && cosignRequest && (
              <>
                <div className="flex justify-between">
                  <span>Requested by:</span>
                  <div className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      {cosignRequest.requester.image && (
                        <AvatarImage src={cosignRequest.requester.image} />
                      )}
                      <AvatarFallback
                        className={cn(
                          getAvatarColor(
                            formatUserName(cosignRequest.requester),
                          ),
                          "text-[8px]",
                        )}
                      >
                        {formatUserName(
                          cosignRequest.requester,
                        )[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {formatUserName(cosignRequest.requester)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span>Assigned to:</span>
                  <div className="flex items-center gap-1">
                    {cosignRequest.cosigner && (
                      <>
                        <Avatar className="h-4 w-4">
                          {cosignRequest.cosigner.image && (
                            <AvatarImage src={cosignRequest.cosigner.image} />
                          )}
                          <AvatarFallback
                            className={cn(
                              getAvatarColor(
                                formatUserName(cosignRequest.cosigner || null),
                              ),
                              "text-[8px]",
                            )}
                          >
                            {formatUserName(
                              cosignRequest.cosigner || null,
                            )[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {formatUserName(cosignRequest.cosigner || null)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <span>Requested:</span>
                  <span>{formatTimestamp(cosignRequest.createdAt)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Expires:</span>
                  <span className="text-amber-600">
                    {formatTimestamp(cosignRequest.expiresAt)}
                  </span>
                </div>
              </>
            )}

            {status === "approved" && (
              <>
                {cosignRequest && (
                  <>
                    <div className="flex justify-between">
                      <span>Requested by:</span>
                      <div className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          {cosignRequest.requester.image && (
                            <AvatarImage src={cosignRequest.requester.image} />
                          )}
                          <AvatarFallback
                            className={cn(
                              getAvatarColor(
                                formatUserName(cosignRequest.requester),
                              ),
                              "text-[8px]",
                            )}
                          >
                            {formatUserName(
                              cosignRequest.requester,
                            )[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {formatUserName(cosignRequest.requester)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <span>Approved by:</span>
                      <div className="flex items-center gap-1">
                        {cosignRequest.cosigner && (
                          <>
                            <Avatar className="h-4 w-4">
                              {cosignRequest.cosigner.image && (
                                <AvatarImage
                                  src={cosignRequest.cosigner.image}
                                />
                              )}
                              <AvatarFallback
                                className={cn(
                                  getAvatarColor(
                                    formatUserName(
                                      cosignRequest.cosigner || null,
                                    ),
                                  ),
                                  "text-[8px]",
                                )}
                              >
                                {formatUserName(
                                  cosignRequest.cosigner,
                                )[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-green-700">
                              {formatUserName(cosignRequest.cosigner || null)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {(coSignedAt || cosignRequest?.signedAt) && (
                  <div className="flex justify-between">
                    <span>Signed:</span>
                    <span className="font-medium text-green-700">
                      {formatTimestamp(
                        coSignedAt || cosignRequest?.signedAt || "",
                      )}
                    </span>
                  </div>
                )}

                {cosignRequest?.signature && (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-1">
                      <span className="font-medium text-xs">
                        Digital Signature:
                      </span>
                      <div className="rounded-md border bg-background p-2">
                        <img
                          src={cosignRequest.signature}
                          alt="Digital signature"
                          className="h-auto max-w-full"
                          style={{ maxHeight: "60px" }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {status === "rejected" && cosignRequest && (
              <>
                <div className="flex justify-between">
                  <span>Requested by:</span>
                  <span className="font-medium">
                    {formatUserName(cosignRequest.requester)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Rejected by:</span>
                  <span className="font-medium text-red-700">
                    {formatUserName(cosignRequest.cosigner || null)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Rejected:</span>
                  <span className="text-red-700">
                    {formatTimestamp(cosignRequest.createdAt)}
                  </span>
                </div>

                {cosignRequest.rejectionReason && (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-1">
                      <span className="font-medium text-xs">
                        Rejection Reason:
                      </span>
                      <p className="rounded border bg-red-50 p-2 text-red-800 text-xs">
                        {cosignRequest.rejectionReason}
                      </p>
                    </div>
                  </>
                )}
              </>
            )}

            {coSignNotes && (
              <>
                <Separator className="my-2" />
                <div className="space-y-1">
                  <span className="font-medium text-xs">Notes:</span>
                  <p className="rounded bg-muted p-2 text-xs">{coSignNotes}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
