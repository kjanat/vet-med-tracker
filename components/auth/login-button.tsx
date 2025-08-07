"use client";

import { LogIn } from "lucide-react";
import { useAuth } from "@/components/providers/app-provider-consolidated";
import { Button } from "@/components/ui/button";

interface LoginButtonProps {
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg" | "icon";
	className?: string;
}

export function LoginButton({
	variant = "default",
	size = "default",
	className,
}: LoginButtonProps) {
	const { login, isLoading } = useAuth();

	return (
		<Button
			onClick={login}
			disabled={isLoading}
			variant={variant}
			size={size}
			className={className}
		>
			<LogIn className="mr-2 h-4 w-4" />
			Sign In
		</Button>
	);
}
