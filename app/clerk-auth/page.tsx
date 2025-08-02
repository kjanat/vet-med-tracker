import {
	SignedIn,
	SignedOut,
	SignInButton,
	SignUpButton,
	UserButton,
} from "@clerk/nextjs";
import TRPCDemo from "./trpc-demo";

export default function ClerkAuthPage() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen py-2">
			<h1 className="text-4xl font-bold mb-8">Clerk Authentication Demo</h1>

			<div className="flex flex-col items-center space-y-4">
				<SignedOut>
					<p className="text-lg mb-4">You are not signed in</p>
					<div className="flex space-x-4">
						<SignInButton mode="modal">
							<button
								type="button"
								className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
							>
								Sign In
							</button>
						</SignInButton>
						<SignUpButton mode="modal">
							<button
								type="button"
								className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
							>
								Sign Up
							</button>
						</SignUpButton>
					</div>
				</SignedOut>

				<SignedIn>
					<p className="text-lg mb-4">Welcome! You are signed in</p>
					<UserButton
						appearance={{
							elements: {
								avatarBox: "w-12 h-12",
							},
						}}
					/>
				</SignedIn>
			</div>

			<TRPCDemo />
		</div>
	);
}
