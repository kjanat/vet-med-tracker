"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { InventoryItem } from "./inventory-card";

const editItemSchema = z.object({
	brandOverride: z.string().optional(),
	lot: z.string().optional(),
	expiresOn: z.string().min(1, "Expiration date is required"),
	storage: z.enum(["ROOM", "FRIDGE", "FREEZER", "CONTROLLED"]),
	unitsRemaining: z.number().int().min(0, "Units must be 0 or more"),
	notes: z.string().optional(),
});

export type EditItemData = z.infer<typeof editItemSchema>;

interface EditItemModalProps {
	item: InventoryItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdate: (id: string, data: EditItemData) => Promise<void>;
	onDelete?: (id: string) => Promise<void>;
}

export function EditItemModal({
	item,
	open,
	onOpenChange,
	onUpdate,
	onDelete,
}: EditItemModalProps) {
	const form = useForm<EditItemData>({
		resolver: zodResolver(editItemSchema),
		defaultValues: {
			brandOverride: "",
			lot: "",
			expiresOn: "",
			storage: "ROOM",
			unitsRemaining: 0,
			notes: "",
		},
	});

	// Reset form when item changes
	if (item) {
		const defaultValues = {
			brandOverride: item.brand || "",
			lot: item.lot || "",
			expiresOn: format(item.expiresOn, "yyyy-MM-dd"),
			storage: item.storage,
			unitsRemaining: item.unitsRemaining,
			notes: item.notes || "",
		};
		form.reset(defaultValues);
	}

	const onSubmit = async (data: EditItemData) => {
		if (!item) return;

		await onUpdate(item.id, {
			...data,
			expiresOn: data.expiresOn,
		});
		onOpenChange(false);
	};

	const handleDelete = async () => {
		if (!item || !onDelete) return;

		if (
			window.confirm(
				`Are you sure you want to delete ${item.name}? This action cannot be undone.`,
			)
		) {
			await onDelete(item.id);
			onOpenChange(false);
		}
	};

	if (!item) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Edit Inventory Item</DialogTitle>
					<DialogDescription>
						Update details for {item.name} {item.strength}
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="brandOverride"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Brand Name (Optional)</FormLabel>
									<FormControl>
										<Input placeholder="Override brand name" {...field} />
									</FormControl>
									<FormDescription>
										Leave blank to use default brand name
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="lot"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Lot Number</FormLabel>
									<FormControl>
										<Input placeholder="ABC123" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="expiresOn"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Expiration Date</FormLabel>
									<FormControl>
										<Input type="date" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="storage"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Storage Location</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="ROOM">Room Temperature</SelectItem>
											<SelectItem value="FRIDGE">Refrigerated</SelectItem>
											<SelectItem value="FREEZER">Freezer</SelectItem>
											<SelectItem value="CONTROLLED">
												Controlled Substance
											</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="unitsRemaining"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Units Remaining</FormLabel>
									<FormControl>
										<Input
											type="number"
											min="0"
											{...field}
											onChange={(e) =>
												field.onChange(parseInt(e.target.value) || 0)
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Notes (Optional)</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Additional notes..."
											className="resize-none"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter className="flex justify-between gap-2 sm:justify-between">
							{onDelete && (
								<Button
									type="button"
									variant="destructive"
									onClick={handleDelete}
								>
									Delete
								</Button>
							)}
							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => onOpenChange(false)}
								>
									Cancel
								</Button>
								<Button type="submit">Update</Button>
							</div>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
