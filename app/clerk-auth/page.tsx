import {
	SignedIn,
	SignedOut,
	SignInButton,
	SignUpButton,
	UserButton,
} from "@clerk/nextjs";

export default function ClerkAuthPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center py-2">
			<h1 className="mb-8 font-bold text-4xl">Clerk Authentication Demo</h1>

			<div className="flex flex-col items-center space-y-4">
				<SignedOut>
					<p className="mb-4 text-lg">You are not signed in</p>
					<div className="flex space-x-4">
						<SignInButton mode="modal">
							<button
								type="button"
								className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
							>
								Sign In
							</button>
						</SignInButton>
						<SignUpButton mode="modal">
							<button
								type="button"
								className="rounded bg-green-500 px-4 py-2 font-bold text-white hover:bg-green-700"
							>
								Sign Up
							</button>
						</SignUpButton>
					</div>
				</SignedOut>

				<SignedIn>
					<p className="mb-4 text-lg">Welcome! You are signed in</p>
					<UserButton
						appearance={{
							elements: {
								avatarBox: "w-12 h-12",
							},
						}}
					/>
				</SignedIn>
			</div>
		</div>
	);
}
