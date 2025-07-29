"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useApp } from "../providers/app-provider";
import { AnimalAvatar } from "./animal-avatar";

export function AnimalSwitcher() {
	const { selectedAnimal, setSelectedAnimal, animals } = useApp();

	return (
		<div className="flex gap-2 overflow-x-auto pb-2">
			<button
				type="button"
				onClick={() => setSelectedAnimal(null)}
				className={cn(
					"flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
					!selectedAnimal
						? "bg-primary text-primary-foreground"
						: "bg-background hover:bg-accent",
				)}
			>
				All Animals
				<Badge variant="secondary" className="ml-1">
					{animals.reduce((sum, animal) => sum + animal.pendingMeds, 0)}
				</Badge>
			</button>

			{animals.map((animal) => (
				<button
					type="button"
					key={animal.id}
					onClick={() => setSelectedAnimal(animal)}
					className={cn(
						"flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
						selectedAnimal?.id === animal.id
							? "bg-primary text-primary-foreground"
							: "bg-background hover:bg-accent",
					)}
				>
					<AnimalAvatar animal={animal} size="sm" />
					{animal.name}
					{animal.pendingMeds > 0 && (
						<Badge variant="destructive" className="ml-1">
							{animal.pendingMeds}
						</Badge>
					)}
				</button>
			))}
		</div>
	);
}
