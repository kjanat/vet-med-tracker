"use client";

import { SignedIn, SignedOut, useClerk, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function TestClerkPage() {
	const { user } = useUser();
	const { openSignIn, signOut } = useClerk();

	return (
		<div className="container max-w-md mx-auto py-8">
			<h1 className="text-2xl font-bold mb-4">Clerk Authentication Test</h1>

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
