"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

const navigation = [
	{ name: "Features", href: "#features" },
	{ name: "How It Works", href: "#demo" },
	{ name: "Testimonials", href: "#testimonials" },
	{ name: "Pricing", href: "#pricing" },
];

export function PublicHeader() {
	const [isOpen, setIsOpen] = useState(false);
	const { openSignIn } = useClerk();
	const { user, isLoaded } = useUser();

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto flex h-16 max-w-6xl items-center px-4">
				{/* Logo */}
				<Link href="/" className="flex items-center gap-2">
					<Logo size="sm" />
					<span className="font-semibold text-lg">VetMed Tracker</span>
				</Link>

				{/* Desktop Navigation */}
				<nav className="mx-auto hidden items-center gap-6 md:flex">
					{navigation.map((item) => (
						<Link
							key={item.name}
							href={item.href as Route}
							className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
						>
							{item.name}
						</Link>
					))}
				</nav>

				{/* Desktop CTA */}
				<div className="hidden items-center gap-4 md:flex">
					{isLoaded && !user && (
						<>
							<Button variant="ghost" onClick={() => openSignIn()}>
								Sign In
							</Button>
							<Button onClick={() => openSignIn()}>Get Started</Button>
						</>
					)}
					{isLoaded && user && (
						<Link href="/dashboard">
							<Button>Dashboard</Button>
						</Link>
					)}
				</div>

				{/* Mobile Menu */}
				<Sheet open={isOpen} onOpenChange={setIsOpen}>
					<SheetTrigger asChild className="ml-auto md:hidden">
						<Button variant="ghost" size="icon" aria-label="Open menu">
							<Menu className="h-5 w-5" />
						</Button>
					</SheetTrigger>
					<SheetContent>
						<SheetHeader>
							<SheetTitle>Menu</SheetTitle>
						</SheetHeader>
						<nav className="mt-8 flex flex-col gap-4">
							{navigation.map((item) => (
								<Link
									key={item.name}
									href={item.href as Route}
									onClick={() => setIsOpen(false)}
									className="font-medium text-lg transition-colors hover:text-primary"
								>
									{item.name}
								</Link>
							))}
							<div className="space-y-3 border-t pt-4">
								{isLoaded && !user && (
									<>
										<Button
											variant="outline"
											className="w-full"
											onClick={() => {
												openSignIn();
												setIsOpen(false);
											}}
										>
											Sign In
										</Button>
										<Button
											className="w-full"
											onClick={() => {
												openSignIn();
												setIsOpen(false);
											}}
										>
											Get Started
										</Button>
									</>
								)}
								{isLoaded && user && (
									<Link href="/dashboard" onClick={() => setIsOpen(false)}>
										<Button className="w-full">Dashboard</Button>
									</Link>
								)}
							</div>
						</nav>
					</SheetContent>
				</Sheet>
			</div>
		</header>
	);
}
