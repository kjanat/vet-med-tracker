"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getAvatarColor } from "@/lib/avatar-utils";
import { cn } from "@/lib/utils";

interface Animal {
	id: string;
	name: string;
	species: string;
	avatar?: string;
	pendingMeds?: number;
}

interface AnimalAvatarProps {
	animal: Animal;
	size?: "xs" | "sm" | "md" | "lg";
	showBadge?: boolean;
	className?: string;
}

export function AnimalAvatar({
	animal,
	size = "md",
	showBadge = false,
	className,
}: AnimalAvatarProps) {
	const sizeClasses = {
		xs: "h-5 w-5",
		sm: "h-6 w-6",
		md: "h-8 w-8",
		lg: "h-12 w-12",
	};

	const textSizeClasses = {
		xs: "text-[10px]",
		sm: "text-xs",
		md: "text-sm",
		lg: "text-base",
	};

	const avatarColor = getAvatarColor(animal.name);

	return (
		<div className={cn("relative", className)}>
			<Avatar className={cn(sizeClasses[size])}>
				{animal.avatar && <AvatarImage src={animal.avatar} alt={animal.name} />}
				<AvatarFallback
					className={cn(
						avatarColor,
						"font-medium text-white",
						textSizeClasses[size],
					)}
				>
					{animal.name[0]}
					{animal.species[0]}
				</AvatarFallback>
			</Avatar>

			{showBadge && (animal.pendingMeds ?? 0) > 0 && (
				<Badge
					variant="destructive"
					className="-top-1 -right-1 absolute flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
				>
					{animal.pendingMeds ?? 0}
				</Badge>
			)}
		</div>
	);
}
