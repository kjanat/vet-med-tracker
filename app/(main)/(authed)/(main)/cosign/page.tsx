"use client";

import { formatDistanceToNow, parseISO } from "date-fns";
import {
	AlertTriangle,
	CheckCircle,
	Clock,
	FileSignature,
	X,
} from "lucide-react";
import { useState } from "react";
import { SignaturePad } from "@/components/cosign/signature-pad";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/shared/use-toast";
import { getAvatarColor } from "@/lib/utils/avatar-utils";
import { cn } from "@/lib/utils/general";
import { trpc } from "@/server/trpc/client";

export default function CoSignPage() {
	const { selectedHousehold } = useApp();
	const { toast } = useToast();
	const [activeTab, setActiveTab] = useState("pending");
	const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
	const [signature, setSignature] = useState<string | null>(null);
	const [rejectionReason, setRejectionReason] = useState("");
	const [showApprovalDialog, setShowApprovalDialog] = useState(false);
	const [showRejectionDialog, setShowRejectionDialog] = useState(false);

	// Queries
	const {
		data: pendingRequests,
		refetch: refetchPending,
		isLoading: loadingPending,
	} = trpc.cosigner.listPending.useQuery(
		{ householdId: selectedHousehold?.id || "" },
		{ enabled: !!selectedHousehold?.id },
	);

	const {
		data: allRequests,
		refetch: refetchAll,
		isLoading: loadingAll,
	} = trpc.cosigner.listAll.useQuery(
		{ householdId: selectedHousehold?.id || "" },
		{ enabled: !!selectedHousehold?.id },
	);

	// Mutations
	const approveMutation = trpc.cosigner.approve.useMutation({
		onSuccess: () => {
			toast({
				title: "Request approved",
				description: "The co-sign request has been approved successfully.",
			});
			refetchPending();
			refetchAll();
			setShowApprovalDialog(false);
			setSelectedRequest(null);
			setSignature(null);
		},
		onError: (error) => {
			toast({
				title: "Error approving request",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const rejectMutation = trpc.cosigner.reject.useMutation({
		onSuccess: () => {
			toast({
				title: "Request rejected",
				description: "The co-sign request has been rejected.",
			});
			refetchPending();
			refetchAll();
			setShowRejectionDialog(false);
			setSelectedRequest(null);
			setRejectionReason("");
		},
		onError: (error) => {
			toast({
				title: "Error rejecting request",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	// Handlers
	const handleApprove = (requestId: string) => {
		setSelectedRequest(requestId);
		setSignature(null);
		setShowApprovalDialog(true);
	};

	const handleReject = (requestId: string) => {
		setSelectedRequest(requestId);
		setRejectionReason("");
		setShowRejectionDialog(true);
	};

	const handleConfirmApproval = () => {
		if (!selectedRequest || !signature) return;

		approveMutation.mutate({
			householdId: selectedHousehold?.id || "",
			requestId: selectedRequest,
			signature,
		});
	};

	const handleConfirmRejection = () => {
		if (!selectedRequest || !rejectionReason.trim()) return;

		rejectMutation.mutate({
			householdId: selectedHousehold?.id || "",
			requestId: selectedRequest,
			rejectionReason: rejectionReason.trim(),
		});
	};

	const formatUserName = (
		user: { name: string | null; email: string | null } | null,
	) => {
		if (!user) return "Unknown User";
		return user.name || user.email || "Unknown User";
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

			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="pending" className="flex items-center gap-2">
						<Clock className="h-4 w-4" />
						Pending
						{pendingCount > 0 && (
							<Badge variant="default" className="ml-1 h-5 min-w-5 text-xs">
								{pendingCount}
							</Badge>
						)}
					</TabsTrigger>
					<TabsTrigger value="history" className="flex items-center gap-2">
						<FileSignature className="h-4 w-4" />
						History
					</TabsTrigger>
				</TabsList>

				<TabsContent value="pending" className="space-y-4">
					{loadingPending ? (
						<div className="flex items-center justify-center py-8">
							<LoadingIndicator />
						</div>
					) : pendingRequests && pendingRequests.length > 0 ? (
						<div className="space-y-4">
							{pendingRequests.map((item) => (
								<PendingRequestCard
									key={item.request.id}
									item={item}
									onApprove={() => handleApprove(item.request.id)}
									onReject={() => handleReject(item.request.id)}
									formatUserName={formatUserName}
								/>
							))}
						</div>
					) : (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-8 text-center">
								<CheckCircle className="mb-4 h-12 w-12 text-muted-foreground" />
								<CardTitle className="mb-2">No pending requests</CardTitle>
								<CardDescription>
									You don't have any pending co-sign requests at this time.
								</CardDescription>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				<TabsContent value="history" className="space-y-4">
					{loadingAll ? (
						<div className="flex items-center justify-center py-8">
							<LoadingIndicator />
						</div>
					) : recentRequests.length > 0 ? (
						<div className="space-y-4">
							{recentRequests.map((item) => (
								<HistoryRequestCard
									key={item.request.id}
									item={item}
									formatUserName={formatUserName}
								/>
							))}
						</div>
					) : (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-8 text-center">
								<FileSignature className="mb-4 h-12 w-12 text-muted-foreground" />
								<CardTitle className="mb-2">No request history</CardTitle>
								<CardDescription>
									Completed co-sign requests will appear here.
								</CardDescription>
							</CardContent>
						</Card>
					)}
				</TabsContent>
			</Tabs>

			{/* Approval Dialog */}
			<Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Approve Co-sign Request</DialogTitle>
						<DialogDescription>
							Please provide your digital signature to approve this co-sign
							request.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<SignaturePad
							onSignatureChange={setSignature}
							width={400}
							height={150}
						/>

						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => setShowApprovalDialog(false)}
								disabled={approveMutation.isPending}
								className="flex-1"
							>
								Cancel
							</Button>
							<Button
								onClick={handleConfirmApproval}
								disabled={!signature || approveMutation.isPending}
								className="flex-1"
							>
								{approveMutation.isPending ? (
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

			{/* Rejection Dialog */}
			<Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Reject Co-sign Request</DialogTitle>
						<DialogDescription>
							Please provide a reason for rejecting this co-sign request.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<Textarea
							placeholder="Enter rejection reason..."
							value={rejectionReason}
							onChange={(e) => setRejectionReason(e.target.value)}
							disabled={rejectMutation.isPending}
						/>

						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={() => setShowRejectionDialog(false)}
								disabled={rejectMutation.isPending}
								className="flex-1"
							>
								Cancel
							</Button>
							<Button
								variant="destructive"
								onClick={handleConfirmRejection}
								disabled={!rejectionReason.trim() || rejectMutation.isPending}
								className="flex-1"
							>
								{rejectMutation.isPending ? (
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
		</div>
	);
}

interface RequestCardProps {
	item: any; // TODO: Type this properly based on tRPC response
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
								<span className="ml-2">{item.administration.actualDose}</span>
							</div>
							<div>
								<span className="font-medium">Route:</span>
								<span className="ml-2 capitalize">
									{item.regimen.route.toLowerCase()}
								</span>
							</div>
							<div>
								<span className="font-medium">Requested:</span>
								<span className="ml-2">
									{formatDistanceToNow(parseISO(item.request.createdAt), {
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
						variant="outline"
						onClick={onReject}
						disabled={isExpired}
						className="flex-1"
					>
						<X className="mr-2 h-4 w-4" />
						Reject
					</Button>
					<Button onClick={onApprove} disabled={isExpired} className="flex-1">
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
							<Badge variant={config?.color as any}>
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
									{formatDistanceToNow(parseISO(item.request.createdAt), {
										addSuffix: true,
									})}
								</span>
							</div>

							{item.request.status === "approved" && item.request.signedAt && (
								<div>
									<span className="font-medium">Approved:</span>
									<span className="ml-2">
										{formatDistanceToNow(parseISO(item.request.signedAt), {
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
								<img
									src={item.request.signature}
									alt="Digital signature"
									className="h-auto max-w-full"
									style={{ maxHeight: "60px" }}
								/>
							</div>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
