"use client";

import { SignedIn, SignedOut, useClerk, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function TestClerkPage() {
	const { user } = useUser();
	const { openSignIn, signOut } = useClerk();

	return (
		<div className="container mx-auto max-w-md py-8">
			<h1 className="mb-4 font-bold text-2xl">Clerk Authentication Test</h1>

			<SignedOut>
				<div className="space-y-4">
					<p>You are not signed in.</p>
					<Button onClick={() => openSignIn()}>Sign In with Clerk</Button>
				</div>
			</SignedOut>

			<SignedIn>
				<div className="space-y-4">
					<p>
						Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
					</p>
					<p>User ID: {user?.id}</p>
					<Button onClick={() => signOut()}>Sign Out</Button>
				</div>
			</SignedIn>
		</div>
	);
}
