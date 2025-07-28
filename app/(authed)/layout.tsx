import type React from "react";
export default function AuthedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}
