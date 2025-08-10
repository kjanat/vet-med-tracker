module.exports = [
	{
		name: "Initial JS bundle",
		path: ".next/static/chunks/main-*.js",
		limit: "120 KB",
		webpack: false,
	},
	{
		name: "Framework bundle",
		path: ".next/static/chunks/framework-*.js",
		limit: "180 KB",
		webpack: false,
	},
	{
		name: "Main app bundle",
		path: ".next/static/chunks/main-app-*.js",
		limit: "50 KB",
		webpack: false,
	},
	{
		name: "Polyfills",
		path: ".next/static/chunks/polyfills-*.js",
		limit: "110 KB",
		webpack: false,
	},
	{
		name: "Admin record page",
		path: ".next/static/chunks/app/(main)/(authed)/(main)/admin/record/page-*.js",
		limit: "95 KB",
		webpack: false,
	},
	{
		name: "Reports page",
		path: ".next/static/chunks/app/(authed)/(app)/dashboard/reports/page-*.js",
		limit: "85 KB",
		webpack: false,
	},
	{
		name: "Heavy chunks (shared libraries)",
		path: ".next/static/chunks/[0-9]*-*.js",
		limit: "700 KB", // Combined limit for all heavy chunks
		webpack: false,
		ignore: ["**/chunks/app/**"], // Ignore app-specific chunks
	},
	{
		name: "CSS bundle",
		path: ".next/static/css/*.css",
		limit: "30 KB",
		webpack: false,
	},
];
