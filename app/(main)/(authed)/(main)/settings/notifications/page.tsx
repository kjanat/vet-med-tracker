"use client";

import { Suspense } from "react";
import { EscalationPanel } from "@/components/notifications/escalation-panel";
import { PushPanel } from "@/components/notifications/push-panel";

function NotificationsContent() {
	return (
		<div className="space-y-6">
			<PushPanel />
			<EscalationPanel />
		</div>
	);
}

export default function NotificationsPage() {
	return (
		<Suspense
			fallback={<div className="min-h-screen animate-pulse bg-background" />}
		>
			<NotificationsContent />
		</Suspense>
	);
}
