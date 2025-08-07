"use client";

import { Plus } from "lucide-react";
import { useInventoryFormDialog } from "@/components/forms/inventory-form-dialog";
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
	const { openInventoryForm } = useInventoryFormDialog();

	return (
		<Button
			className={`gap-2 ${className || ""}`}
			size={size}
			variant={variant}
			onClick={openInventoryForm}
		>
			<Plus className="h-4 w-4" />
			Add Item
		</Button>
	);
}
