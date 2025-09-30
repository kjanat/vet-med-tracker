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
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/app/badge";
import { Button } from "@/components/app/button";
// Simple inline signature pad replacement
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getAvatarColor } from "@/lib/utils/avatar-utils";
import { cn } from "@/lib/utils/general";
import { trpc } from "@/server/trpc/client";

// Hook for request management logic
function useCoSignRequests(householdId: string | undefined) {
  const pendingQuery = trpc.cosigner.listPending.useQuery(
    { householdId: householdId || "" },
    { enabled: Boolean(householdId) },
  );

  const allQuery = trpc.cosigner.listAll.useQuery(
    { householdId: householdId || "" },
    { enabled: Boolean(householdId) },
  );

  const refetchAll = () => {
    pendingQuery.refetch();
    allQuery.refetch();
  };

  const approveMutation = trpc.cosigner.approve.useMutation({
    onSuccess: () => {
      toast.success("The co-sign request has been approved successfully.");
      refetchAll();
    },
    onError: (error) => {
      toast.error(`Error approving request: ${error.message}`);
    },
  });

  const rejectMutation = trpc.cosigner.reject.useMutation({
    onSuccess: () => {
      toast.success("The co-sign request has been rejected.");
      refetchAll();
    },
    onError: (error) => {
      toast.error(`Error rejecting request: ${error.message}`);
    },
  });

  return {
    pendingRequests: pendingQuery.data as BaseRequestItem[] | undefined,
    allRequests: allQuery.data as RequestItemWithCosigner[] | undefined,
    loadingPending: pendingQuery.isLoading,
    loadingAll: allQuery.isLoading,
    approveMutation,
    rejectMutation,
  };
}

// Hook for dialog state management
function useCoSignDialogs() {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  const openApprovalDialog = (requestId: string) => {
    setSelectedRequest(requestId);
    setSignature(null);
    setShowApprovalDialog(true);
  };

  const openRejectionDialog = (requestId: string) => {
    setSelectedRequest(requestId);
    setRejectionReason("");
    setShowRejectionDialog(true);
  };

  const closeDialogs = () => {
    setShowApprovalDialog(false);
    setShowRejectionDialog(false);
    setSelectedRequest(null);
    setSignature(null);
    setRejectionReason("");
  };

  return {
    selectedRequest,
    signature,
    rejectionReason,
    showApprovalDialog,
    showRejectionDialog,
    setSignature,
    setRejectionReason,
    setShowApprovalDialog,
    setShowRejectionDialog,
    openApprovalDialog,
    openRejectionDialog,
    closeDialogs,
  };
}

// Utility function
const formatUserName = (
  user: { name: string | null; email: string | null } | null,
) => {
  if (!user) return "Unknown User";
  return user.name || user.email || "Unknown User";
};

export default function CoSignPage() {
  const { selectedHousehold } = useApp();
  const [activeTab, setActiveTab] = useState("pending");

  const {
    pendingRequests,
    allRequests,
    loadingPending,
    loadingAll,
    approveMutation,
    rejectMutation,
  } = useCoSignRequests(selectedHousehold?.id);

  const {
    selectedRequest,
    signature,
    rejectionReason,
    showApprovalDialog,
    showRejectionDialog,
    setSignature,
    setRejectionReason,
    setShowApprovalDialog,
    setShowRejectionDialog,
    openApprovalDialog,
    openRejectionDialog,
    closeDialogs,
  } = useCoSignDialogs();

  const handleConfirmApproval = () => {
    if (!selectedRequest || !signature) return;

    approveMutation.mutate({
      householdId: selectedHousehold?.id || "",
      requestId: selectedRequest,
      signature,
    });
    closeDialogs();
  };

  const handleConfirmRejection = () => {
    if (!selectedRequest || !rejectionReason.trim()) return;

    rejectMutation.mutate({
      householdId: selectedHousehold?.id || "",
      requestId: selectedRequest,
      rejectionReason: rejectionReason.trim(),
    });
    closeDialogs();
  };

  if (!selectedHousehold) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please select a household to view co-sign requests.
        </AlertDescription>
      </Alert>
    );
  }

  const pendingCount = pendingRequests?.length || 0;
  const recentRequests =
    allRequests?.filter((req) => req.request.status !== "pending") || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-2xl">Co-sign Requests</h1>
        <p className="text-muted-foreground">
          Manage medication administration co-signature requests
        </p>
      </div>

      <CoSignTabs
        activeTab={activeTab}
        formatUserName={formatUserName}
        loadingAll={loadingAll}
        loadingPending={loadingPending}
        onApprove={openApprovalDialog}
        onReject={openRejectionDialog}
        pendingCount={pendingCount}
        pendingRequests={pendingRequests}
        recentRequests={recentRequests}
        setActiveTab={setActiveTab}
      />

      <ApprovalDialog
        isPending={approveMutation.isPending}
        onConfirm={handleConfirmApproval}
        onOpenChange={setShowApprovalDialog}
        onSignatureChange={setSignature}
        open={showApprovalDialog}
        signature={signature}
      />

      <RejectionDialog
        isPending={rejectMutation.isPending}
        onConfirm={handleConfirmRejection}
        onOpenChange={setShowRejectionDialog}
        onReasonChange={setRejectionReason}
        open={showRejectionDialog}
        rejectionReason={rejectionReason}
      />
    </div>
  );
}

// Component for the tabs section
function CoSignTabs({
  activeTab,
  setActiveTab,
  pendingCount,
  pendingRequests,
  recentRequests,
  loadingPending,
  loadingAll,
  onApprove,
  onReject,
  formatUserName,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  pendingRequests: BaseRequestItem[] | undefined;
  recentRequests: RequestItemWithCosigner[];
  loadingPending: boolean;
  loadingAll: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  formatUserName: (
    user: { name: string | null; email: string | null } | null,
  ) => string;
}) {
  return (
    <Tabs className="w-full" onValueChange={setActiveTab} value={activeTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger className="flex items-center gap-2" value="pending">
          <Clock className="h-4 w-4" />
          Pending
          {pendingCount > 0 && (
            <Badge className="ml-1 h-5 min-w-5 text-xs" variant="default">
              {pendingCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger className="flex items-center gap-2" value="history">
          <FileSignature className="h-4 w-4" />
          History
        </TabsTrigger>
      </TabsList>

      <TabsContent className="space-y-4" value="pending">
        <PendingRequestsContent
          formatUserName={formatUserName}
          loading={loadingPending}
          onApprove={onApprove}
          onReject={onReject}
          requests={pendingRequests}
        />
      </TabsContent>

      <TabsContent className="space-y-4" value="history">
        <HistoryRequestsContent
          formatUserName={formatUserName}
          loading={loadingAll}
          requests={recentRequests}
        />
      </TabsContent>
    </Tabs>
  );
}

// Component for pending requests content
function PendingRequestsContent({
  loading,
  requests,
  onApprove,
  onReject,
  formatUserName,
}: {
  loading: boolean;
  requests: BaseRequestItem[] | undefined;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  formatUserName: (
    user: { name: string | null; email: string | null } | null,
  ) => string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingIndicator />
      </div>
    );
  }

  if (requests && requests.length > 0) {
    return (
      <div className="space-y-4">
        {requests.map((item) => (
          <PendingRequestCard
            formatUserName={formatUserName}
            item={item}
            key={item.request.id}
            onApprove={() => onApprove(item.request.id)}
            onReject={() => onReject(item.request.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle className="mb-4 h-12 w-12 text-muted-foreground" />
        <CardTitle className="mb-2">No pending requests</CardTitle>
        <CardDescription>
          You don&apos;t have any pending co-sign requests at this time.
        </CardDescription>
      </CardContent>
    </Card>
  );
}

// Component for history requests content
function HistoryRequestsContent({
  loading,
  requests,
  formatUserName,
}: {
  loading: boolean;
  requests: RequestItemWithCosigner[];
  formatUserName: (
    user: { name: string | null; email: string | null } | null,
  ) => string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingIndicator />
      </div>
    );
  }

  if (requests.length > 0) {
    return (
      <div className="space-y-4">
        {requests.map((item) => (
          <HistoryRequestCard
            formatUserName={formatUserName}
            item={item}
            key={item.request.id}
          />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <FileSignature className="mb-4 h-12 w-12 text-muted-foreground" />
        <CardTitle className="mb-2">No request history</CardTitle>
        <CardDescription>
          Completed co-sign requests will appear here.
        </CardDescription>
      </CardContent>
    </Card>
  );
}

// Component for approval dialog
function ApprovalDialog({
  open,
  onOpenChange,
  signature,
  onSignatureChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signature: string | null;
  onSignatureChange: (signature: string | null) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Co-sign Request</DialogTitle>
          <DialogDescription>
            Please provide your digital signature to approve this co-sign
            request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-gray-300 bg-gray-50 p-4">
            <div className="text-center text-gray-500 text-sm">
              Digital signature capture coming soon
            </div>
            <textarea
              className="mt-2 w-full rounded border p-2 text-sm"
              onChange={(e) => onSignatureChange(e.target.value || null)}
              placeholder="For now, type your digital signature here"
              rows={3}
              value={signature || ""}
            />
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!signature || isPending}
              onClick={onConfirm}
            >
              {isPending ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Component for rejection dialog
function RejectionDialog({
  open,
  onOpenChange,
  rejectionReason,
  onReasonChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rejectionReason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Co-sign Request</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this co-sign request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            disabled={isPending}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Enter rejection reason..."
            value={rejectionReason}
          />

          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!rejectionReason.trim() || isPending}
              onClick={onConfirm}
              variant="destructive"
            >
              {isPending ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type BaseRequestItem = {
  request: {
    id: string;
    administrationId: string;
    requesterId: string;
    cosignerId: string;
    householdId: string;
    status: "pending" | "approved" | "rejected" | "expired";
    signature: string | null;
    signedAt: string | null;
    rejectionReason: string | null;
    expiresAt: string;
    createdAt: Date;
    updatedAt: Date;
  };
  medication: {
    id: string;
    genericName: string;
    brandName: string | null;
  };
  animal: {
    id: string;
    name: string;
  };
  requester: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  };
  administration: {
    id: string;
    regimenId: string;
    animalId: string;
    householdId: string;
    caregiverId: string;
    scheduledFor: string | null;
    recordedAt: string;
    status: "ON_TIME" | "LATE" | "VERY_LATE" | "MISSED" | "PRN";
    sourceItemId: string | null;
    site: string | null;
    dose: string | null;
    notes: string | null;
    mediaUrls: string[] | null;
    coSignUserId: string | null;
    coSignedAt: string | null;
    coSignNotes: string | null;
    adverseEvent: boolean;
    adverseEventDescription: string | null;
    idempotencyKey: string;
    createdAt: Date;
    updatedAt: Date;
  };
  regimen: {
    id: string;
    route: string | null;
  };
};

type RequestItemWithCosigner = BaseRequestItem & {
  cosigner: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  } | null;
};

interface RequestCardProps {
  item: BaseRequestItem | RequestItemWithCosigner;
  formatUserName: (
    user: { name: string | null; email: string | null } | null,
  ) => string;
}

interface PendingRequestCardProps extends RequestCardProps {
  onApprove: () => void;
  onReject: () => void;
}

function PendingRequestCard({
  item,
  onApprove,
  onReject,
  formatUserName,
}: PendingRequestCardProps) {
  const isExpired = new Date(item.request.expiresAt) < new Date();

  return (
    <Card className={cn("", isExpired && "border-amber-200 bg-amber-50")}>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant={isExpired ? "warning" : "default"}>
                {isExpired ? "Expired" : "Pending"}
              </Badge>
              {isExpired && (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
            </div>

            <h3 className="mb-1 font-medium text-lg">
              {item.medication.genericName}
              {item.medication.brandName && ` (${item.medication.brandName})`}
            </h3>

            <p className="mb-3 text-muted-foreground text-sm">
              For {item.animal.name} • Requested by{" "}
              {formatUserName(item.requester)}
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Dose:</span>
                <span className="ml-2">
                  {item.administration.dose || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-medium">Route:</span>
                <span className="ml-2 capitalize">
                  {item.regimen.route?.toLowerCase() || "N/A"}
                </span>
              </div>
              <div>
                <span className="font-medium">Requested:</span>
                <span className="ml-2">
                  {formatDistanceToNow(item.request.createdAt, {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div>
                <span className="font-medium">Expires:</span>
                <span
                  className={cn(
                    "ml-2",
                    isExpired && "font-medium text-amber-600",
                  )}
                >
                  {formatDistanceToNow(parseISO(item.request.expiresAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </div>

          <Avatar className="ml-4 h-10 w-10">
            {item.requester.image && <AvatarImage src={item.requester.image} />}
            <AvatarFallback
              className={cn(
                getAvatarColor(formatUserName(item.requester)),
                "font-medium text-white",
              )}
            >
              {formatUserName(item.requester)[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        <Separator className="mb-4" />

        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={isExpired}
            onClick={onReject}
            variant="outline"
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button className="flex-1" disabled={isExpired} onClick={onApprove}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryRequestCard({ item, formatUserName }: RequestCardProps) {
  const statusConfig = {
    approved: {
      icon: CheckCircle,
      color: "success",
      bgColor: "bg-green-50 border-green-200",
    },
    rejected: {
      icon: X,
      color: "destructive",
      bgColor: "bg-red-50 border-red-200",
    },
    expired: {
      icon: AlertTriangle,
      color: "warning",
      bgColor: "bg-amber-50 border-amber-200",
    },
  };

  const config = statusConfig[item.request.status as keyof typeof statusConfig];
  const IconComponent = config?.icon || Clock;

  return (
    <Card className={config?.bgColor}>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Badge
                variant={config?.color as "success" | "destructive" | "warning"}
              >
                <IconComponent className="mr-1 h-3 w-3" />
                {item.request.status.charAt(0).toUpperCase() +
                  item.request.status.slice(1)}
              </Badge>
            </div>

            <h3 className="mb-1 font-medium text-lg">
              {item.medication.genericName}
              {item.medication.brandName && ` (${item.medication.brandName})`}
            </h3>

            <p className="mb-3 text-muted-foreground text-sm">
              For {item.animal.name} • Requested by{" "}
              {formatUserName(item.requester)}
            </p>

            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">Requested:</span>
                <span className="ml-2">
                  {formatDistanceToNow(item.request.createdAt, {
                    addSuffix: true,
                  })}
                </span>
              </div>

              {item.request.status === "approved" && item.request.signedAt && (
                <div>
                  <span className="font-medium">Approved:</span>
                  <span className="ml-2">
                    {formatDistanceToNow(item.request.signedAt, {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              )}

              {item.request.status === "rejected" &&
                item.request.rejectionReason && (
                  <div>
                    <span className="font-medium">Reason:</span>
                    <span className="ml-2">{item.request.rejectionReason}</span>
                  </div>
                )}
            </div>
          </div>

          <Avatar className="ml-4 h-10 w-10">
            {item.requester.image && <AvatarImage src={item.requester.image} />}
            <AvatarFallback
              className={cn(
                getAvatarColor(formatUserName(item.requester)),
                "font-medium text-white",
              )}
            >
              {formatUserName(item.requester)[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {item.request.signature && (
          <>
            <Separator className="mb-4" />
            <div className="space-y-2">
              <p className="font-medium text-sm">Digital Signature:</p>
              <div className="rounded-md border bg-white p-2">
                <Image
                  alt="Digital signature"
                  className="h-auto max-w-full"
                  height={60}
                  src={item.request.signature}
                  style={{ maxHeight: "60px" }}
                  width={200}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
