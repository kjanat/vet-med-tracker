/*
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});



export default defineConfig([
	{
		extends: compat.extends("next/core-web-vitals", "next/typescript"),
	},
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "warn",
			"react/no-unescaped-entities": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
		},
	},
]);

---

*/

import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const compat = new FlatCompat({
	// import.meta.dirname is available after Node.js v20.11.0
	baseDirectory: import.meta.dirname,
	recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
	...compat.config({
		extends: [
			"eslint:recommended",
			"next",
			"next/core-web-vitals",
			"next/typescript",
		],
		rules: {
			"@typescript-eslint/no-explicit-any": "warn",
			"react/no-unescaped-entities": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
		},
	}),
];

export default eslintConfig;
