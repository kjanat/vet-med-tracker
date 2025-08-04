"use client";

import { BarChart3, History, Home, Package, Settings } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
	{ name: "Home", href: "/" as Route, icon: Home },
	{ name: "History", href: "/dashboard/history" as Route, icon: History },
	{ name: "Inventory", href: "/medications/inventory" as Route, icon: Package },
	{ name: "Insights", href: "/insights" as Route, icon: BarChart3 },
	{ name: "Settings", href: "/settings" as Route, icon: Settings },
];

export function LeftRail() {
	const pathname = usePathname();

	return (
		<div className="w-64 border-r bg-muted/10">
			<div className="p-6">
				<h1 className="font-bold text-xl">VetMed Tracker</h1>
			</div>

			<nav className="px-3">
				{navigation.map((item) => {
					const isActive = pathname === item.href;
					return (
						<Link
							key={item.name}
							href={item.href}
							className={cn(
								"flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors",
								isActive
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
							)}
						>
							<item.icon className="h-4 w-4" />
							{item.name}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
