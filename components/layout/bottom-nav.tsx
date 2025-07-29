"use client";

import { BarChart3, History, Home, Package, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
	{ name: "Home", href: "/", icon: Home },
	{ name: "History", href: "/history", icon: History },
	{ name: "Inventory", href: "/inventory", icon: Package },
	{ name: "Insights", href: "/insights", icon: BarChart3 },
	{ name: "Settings", href: "/settings", icon: Settings },
];

export function BottomNav() {
	const pathname = usePathname();

	return (
		<nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80 shadow-lg pb-safe">
			<div className="flex">
				{navigation.map((item) => {
					const isActive = pathname === item.href;
					return (
						<Link
							key={item.name}
							href={item.href}
							className={cn(
								"flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors min-h-[44px] justify-center",
								isActive
									? "text-primary"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<item.icon className="h-5 w-5" />
							{item.name}
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
