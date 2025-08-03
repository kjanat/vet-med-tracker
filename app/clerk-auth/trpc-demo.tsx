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
		<div className="mx-auto mt-8 max-w-md rounded-lg bg-white p-6 shadow-md">
			<h2 className="mb-4 font-bold text-2xl">tRPC + Clerk Demo</h2>

			<div className="space-y-4">
				<div>
					<button
						type="button"
						onClick={callPublicEndpoint}
						className="w-full rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
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
						className="w-full rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-700"
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
