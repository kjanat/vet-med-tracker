import type React from "react";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";

export default function PublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen flex flex-col">
			<PublicHeader />
			<main className="flex-1">{children}</main>
			<PublicFooter />
		</div>
	);
}
