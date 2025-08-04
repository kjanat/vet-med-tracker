import { memo } from "react";
import { AnimalBreadcrumb } from "@/components/ui/animal-breadcrumb";
import { Logo } from "@/components/ui/logo";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps {
	className?: string;
}

export const PageHeader = memo(function PageHeader({
	className,
}: PageHeaderProps) {
	return (
		<header
			className={`flex h-16 shrink-0 items-center gap-2 border-b px-4 ${className || ""}`}
		>
			<div className="flex items-center gap-2">
				<SidebarTrigger className="-ml-1" />
				<Separator orientation="vertical" className="mr-2 h-4" />
				<AnimalBreadcrumb />
			</div>
			<div className="ml-auto">
				<Logo size="sm" />
			</div>
		</header>
	);
});
