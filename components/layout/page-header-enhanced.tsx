"use client";

import { FileText, Plus, Syringe } from "lucide-react";
import { useSelectedLayoutSegments } from "next/navigation";
import { useAnimalFormDialog } from "@/components/forms/animal-form-dialog";
import { useInventoryFormDialog } from "@/components/forms/inventory-form-dialog";
import { AnimalBreadcrumb } from "@/components/ui/animal-breadcrumb";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumbs } from "./breadcrumbs";

interface PageHeaderProps {
	className?: string;
}

interface PageContext {
	title?: string;
	description?: string;
	actions?: React.ReactNode;
}

export function PageHeaderEnhanced({ className }: PageHeaderProps) {
	const segments = useSelectedLayoutSegments();
	const { openAnimalForm } = useAnimalFormDialog();
	const { openInventoryForm } = useInventoryFormDialog();

	// Filter out route groups
	const filteredSegments = segments.filter(
		(s) => !s.startsWith("(") && !s.endsWith(")"),
	);

	// Page context mappings
	const pageContextMap: Record<string, PageContext | (() => PageContext)> = {
		dashboard: {
			title: "Dashboard",
			description: "Today's medication schedule and overview",
		},
		"dashboard/history": {
			title: "Medication History",
			description: "View past medication administrations",
		},
		"manage/animals": () => ({
			title: "Manage Animals",
			description: "Add and manage your animals",
			actions: (
				<Button onClick={() => openAnimalForm()} size="sm">
					<Plus className="mr-2 h-4 w-4" />
					Add Animal
				</Button>
			),
		}),
		"manage/animals/emergency": {
			title: "Emergency Information",
			description: "Critical care information for this animal",
		},
		"manage/households": {
			title: "Manage Households",
			description: "Manage household members and settings",
		},
		"manage/users": {
			title: "Manage Users",
			description: "Manage user roles and permissions",
		},
		"medications/inventory": () => ({
			title: "Medication Inventory",
			description: "Track your medication stock",
			actions: (
				<Button onClick={() => openInventoryForm()} size="sm">
					<Plus className="mr-2 h-4 w-4" />
					Add Item
				</Button>
			),
		}),
		"medications/regimens": {
			title: "Medication Regimens",
			description: "Manage medication schedules",
			actions: (
				<Button size="sm">
					<Plus className="mr-2 h-4 w-4" />
					New Regimen
				</Button>
			),
		},
		"admin/record": {
			title: "Record Administration",
			description: "Record a medication dose",
			actions: (
				<Button variant="outline" size="sm">
					<Syringe className="mr-2 h-4 w-4" />
					Quick Record
				</Button>
			),
		},
		reports: {
			title: "Reports",
			description:
				"Select an animal to view their medication compliance report",
			actions: (
				<Button variant="outline" size="sm">
					<FileText className="mr-2 h-4 w-4" />
					Export
				</Button>
			),
		},
		insights: {
			title: "Insights",
			description: "Medication compliance and patterns",
		},
		settings: {
			title: "Settings",
			description: "Manage your account and preferences",
		},
		"settings/data-privacy": {
			title: "Data & Privacy",
			description: "Export your data and manage privacy settings",
		},
		"settings/preferences": {
			title: "Preferences",
			description: "Customize your app experience and display settings",
		},
		"settings/notifications": {
			title: "Notifications",
			description: "Configure alerts and notification preferences",
		},
		"settings/data-privacy/audit": {
			title: "Audit Log",
			description: "View system activity and changes",
		},
	};

	// Determine page context based on segments
	const getPageContext = (): PageContext => {
		// Try exact match first
		const fullPath = filteredSegments.join("/");
		const exactMatch = pageContextMap[fullPath];
		if (exactMatch) {
			return typeof exactMatch === "function" ? exactMatch() : exactMatch;
		}

		// Try partial matches
		for (let i = filteredSegments.length - 1; i >= 0; i--) {
			const partialPath = filteredSegments.slice(0, i + 1).join("/");
			const partialMatch = pageContextMap[partialPath];
			if (partialMatch) {
				return typeof partialMatch === "function"
					? partialMatch()
					: partialMatch;
			}
		}

		// Default
		return {};
	};

	const context = getPageContext();
	const showBreadcrumbs =
		filteredSegments.length > 0 &&
		!(filteredSegments.length === 1 && filteredSegments[0] === "dashboard");

	return (
		<header className={`shrink-0 border-b ${className || ""}`}>
			<div className="flex h-16 items-center gap-2 px-4">
				<div className="flex items-center gap-2">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 h-4" />
					<AnimalBreadcrumb />
				</div>
				<div className="ml-auto flex items-center gap-4">
					{context.actions}
					<Logo size="sm" />
				</div>
			</div>

			{(showBreadcrumbs || context.title) && (
				<div className="border-t bg-muted/40 px-4 py-3">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							{showBreadcrumbs && <Breadcrumbs />}
							{context.title && (
								<div className="mt-2">
									<h1 className="font-semibold text-2xl tracking-tight">
										{context.title}
									</h1>
									{context.description && (
										<p className="text-muted-foreground text-sm">
											{context.description}
										</p>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</header>
	);
}
