"use client";

import { Home } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import React from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function Breadcrumbs() {
	const segments = useSelectedLayoutSegments();

	// Filter out route groups (segments with parentheses) and build breadcrumb data
	const filteredSegments = segments.filter(
		(segment) => !segment.startsWith("(") && !segment.endsWith(")"),
	);

	// Map segments to readable labels
	const segmentLabels: Record<string, string> = {
		dashboard: "Dashboard",
		history: "History",
		manage: "Manage",
		animals: "Animals",
		households: "Households",
		users: "Users",
		medications: "Medications",
		admin: "Admin",
		record: "Record Dose",
		inventory: "Inventory",
		regimens: "Regimens",
		insights: "Insights",
		reports: "Reports",
		animal: "Animal Report",
		settings: "Settings",
		audit: "Audit Log",
		help: "Help",
		emergency: "Emergency Info",
	};

	// Build breadcrumb items with proper href
	const breadcrumbs = filteredSegments.map((segment, index) => {
		const href = `/${filteredSegments.slice(0, index + 1).join("/")}` as Route;
		const label =
			segmentLabels[segment] ||
			segment.charAt(0).toUpperCase() + segment.slice(1);

		return { href, label, segment };
	});

	// Don't show breadcrumbs if we're on the dashboard root
	if (
		filteredSegments.length === 0 ||
		(filteredSegments.length === 1 && filteredSegments[0] === "dashboard")
	) {
		return null;
	}

	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link href="/dashboard" className="flex items-center">
							<Home className="h-4 w-4" />
							<span className="sr-only">Home</span>
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				{breadcrumbs.map((crumb, index) => (
					<React.Fragment key={crumb.segment}>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							{index === breadcrumbs.length - 1 ? (
								<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
							) : (
								<BreadcrumbLink asChild>
									<Link href={crumb.href}>{crumb.label}</Link>
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
					</React.Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
