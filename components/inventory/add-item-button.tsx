"use client";

import { Plus } from "lucide-react";
import { useInventoryForm } from "@/components/providers/inventory-form-provider";
import { Button } from "@/components/ui/button";

interface AddItemButtonProps {
	className?: string;
	size?: "sm" | "default" | "lg";
	variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
}

export function AddItemButton({
	className,
	size,
	variant,
}: AddItemButtonProps) {
	const { openForm } = useInventoryForm();

	return (
		<Button
			className={`gap-2 ${className || ""}`}
			size={size}
			variant={variant}
			onClick={openForm}
		>
			<Plus className="h-4 w-4" />
			Add Item
		</Button>
	);
}
