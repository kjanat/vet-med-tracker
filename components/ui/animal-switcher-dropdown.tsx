"use client";

import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useApp } from "../providers/app-provider";
import { AnimalAvatar } from "./animal-avatar";

// Pages where animal context is relevant
const ANIMAL_CONTEXT_PATHS = [
	"/",
	"/admin/record",
	"/history",
	"/regimens",
	"/insights",
];

export function AnimalSwitcherDropdown() {
	const { selectedAnimal, setSelectedAnimal, animals } = useApp();
	const pathname = usePathname();

	// Check if we should show the animal switcher
	const shouldShowSwitcher = ANIMAL_CONTEXT_PATHS.some((path) =>
		pathname.startsWith(path),
	);

	// Don't render if not on a relevant page
	if (!shouldShowSwitcher) {
		return null;
	}

	const totalPendingMeds = animals.reduce(
		(sum, animal) => sum + (animal.pendingMeds || 0),
		0,
	);

	const handleAnimalChange = (value: string) => {
		if (value === "all") {
			setSelectedAnimal(null);
		} else {
			const animal = animals.find((a) => a.id === value);
			if (animal) {
				setSelectedAnimal(animal);
			}
		}
	};

	return (
		<div className="w-full max-w-[260px]">
			<Select
				value={selectedAnimal?.id || "all"}
				onValueChange={handleAnimalChange}
			>
				<SelectTrigger className="w-full h-9 px-3">
					<SelectValue>
						{selectedAnimal ? (
							<div className="flex items-center gap-2">
								<AnimalAvatar animal={selectedAnimal} size="xs" />
								<span className="truncate">{selectedAnimal.name}</span>
								{selectedAnimal.pendingMeds > 0 && (
									<Badge
										variant="destructive"
										className="ml-auto h-5 px-1.5 text-xs"
									>
										{selectedAnimal.pendingMeds}
									</Badge>
								)}
							</div>
						) : (
							<div className="flex items-center justify-between w-full">
								<span>All Animals</span>
								{totalPendingMeds > 0 && (
									<Badge variant="secondary" className="h-5 px-1.5 text-xs">
										{totalPendingMeds}
									</Badge>
								)}
							</div>
						)}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">
						<div className="flex items-center justify-between w-full pr-2">
							<span>All Animals</span>
							{totalPendingMeds > 0 && (
								<Badge variant="secondary" className="ml-4 h-5 px-1.5 text-xs">
									{totalPendingMeds}
								</Badge>
							)}
						</div>
					</SelectItem>
					{animals.map((animal) => (
						<SelectItem key={animal.id} value={animal.id}>
							<div className="flex items-center gap-2 w-full pr-2">
								<AnimalAvatar animal={animal} size="xs" />
								<span className="truncate flex-1">{animal.name}</span>
								{animal.pendingMeds > 0 && (
									<Badge
										variant="destructive"
										className="ml-2 h-5 px-1.5 text-xs"
									>
										{animal.pendingMeds}
									</Badge>
								)}
							</div>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
