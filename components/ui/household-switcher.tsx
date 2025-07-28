"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useApp } from "../providers/app-provider";
import { cn } from "@/lib/utils";
import { getAvatarColor } from "@/lib/avatar-utils";

export function HouseholdSwitcher() {
	const [open, setOpen] = useState(false);
	const { selectedHousehold, setSelectedHousehold, households } = useApp();

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-[200px] justify-between bg-transparent"
				>
					<div className="flex items-center gap-2">
						<Avatar className="h-6 w-6">
							{selectedHousehold.avatar && (
								<AvatarImage src={selectedHousehold.avatar} />
							)}
							<AvatarFallback
								className={cn(
									getAvatarColor(selectedHousehold.name),
									"text-white font-medium text-xs",
								)}
							>
								{selectedHousehold.name[0]}
							</AvatarFallback>
						</Avatar>
						{selectedHousehold.name}
					</div>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0">
				<Command>
					<CommandInput placeholder="Search households..." />
					<CommandList>
						<CommandEmpty>No household found.</CommandEmpty>
						<CommandGroup>
							{households.map((household) => (
								<CommandItem
									key={household.id}
									value={household.name}
									onSelect={() => {
										setSelectedHousehold(household);
										setOpen(false);
									}}
								>
									<div className="flex items-center gap-2">
										<Avatar className="h-6 w-6">
											{household.avatar && (
												<AvatarImage src={household.avatar} />
											)}
											<AvatarFallback
												className={cn(
													getAvatarColor(household.name),
													"text-white font-medium text-xs",
												)}
											>
												{household.name[0]}
											</AvatarFallback>
										</Avatar>
										{household.name}
									</div>
									<Check
										className={cn(
											"ml-auto h-4 w-4",
											selectedHousehold.id === household.id
												? "opacity-100"
												: "opacity-0",
										)}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
