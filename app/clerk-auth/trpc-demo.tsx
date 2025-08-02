"use client";

import { useState } from "react";

export default function TRPCDemo() {
	const [publicResult, setPublicResult] = useState<string>("");
	const [secretResult, setSecretResult] = useState<string>("");
	const [error, setError] = useState<string>("");

	const callPublicEndpoint = async () => {
		try {
			const response = await fetch("/api/clerk-trpc/hello");
			const data = await response.json();
			setPublicResult(data.result?.greeting || "No result");
			setError("");
		} catch (err) {
			setError(`Error calling public endpoint: ${err}`);
			setPublicResult("");
		}
	};

	const callProtectedEndpoint = async () => {
		try {
			const response = await fetch("/api/clerk-trpc/secret");
			const data = await response.json();
			setSecretResult(data.result?.secret || "No result");
			setError("");
		} catch (err) {
			setError(`Error calling protected endpoint: ${err}`);
			setSecretResult("");
		}
	};

	return (
		<div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
			<h2 className="text-2xl font-bold mb-4">tRPC + Clerk Demo</h2>

			<div className="space-y-4">
				<div>
					<button
						type="button"
						onClick={callPublicEndpoint}
						className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
					>
						Call Public Endpoint
					</button>
					{publicResult && (
						<p className="mt-2 text-green-600">Public: {publicResult}</p>
					)}
				</div>

				<div>
					<button
						type="button"
						onClick={callProtectedEndpoint}
						className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-full"
					>
						Call Protected Endpoint
					</button>
					{secretResult && (
						<p className="mt-2 text-green-600">Secret: {secretResult}</p>
					)}
				</div>

				{error && <p className="mt-2 text-red-600">Error: {error}</p>}
			</div>
		</div>
	);
}
