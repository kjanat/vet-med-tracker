#!/usr/bin/env node

import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findProjectRoot(startDir = __dirname) {
	let dir = startDir;
	for (;;) {
		if (fsSync.existsSync(path.join(dir, "package.json"))) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) return startDir;
		dir = parent;
	}
}

const PROJECT_ROOT = findProjectRoot();
const OUT_DIR = path.join(PROJECT_ROOT, "screenshots");
await fs.mkdir(OUT_DIR, { recursive: true });

const URL = "https://developer.chrome.com/";
const base = "developer.chrome.com";

(async () => {
	// Launch the browser and open a new blank page
	const browser = await puppeteer.launch({ headless: true /*, slowMo: 50 */ });

	try {
		const page = await browser.newPage();
		await page.setViewport({ width: 1920, height: 1080 });

		// Navigate the page to a URL
		await page.goto(URL, { waitUntil: "networkidle2" });

		await page.screenshot({ path: path.join(OUT_DIR, `${base}.png`) });
		await page.emulateMediaType("screen"); // new
		// await page.screenshot({ path: "screenshots/deveper.chrome.com.png" });

		await page.pdf({ path: path.join(OUT_DIR, `${base}.pdf`) });
		// await page.pdf({ path: "screenshots/deveper.chrome.com.pdf" });

		// Type into search box
		await page.type(".devsite-search-field", "automate beyond recorder");

		// Wait and click on first result
		const searchResultSelector = ".devsite-result-item-link";
		await page.waitForSelector(searchResultSelector);
		await page.click(searchResultSelector);

		// Locate the full title with a unique string
		const textSelector = await page.waitForSelector(
			"text/Customize and automate",
		);
		const fullTitle = await textSelector?.evaluate((el) => el.textContent);

		// Print the full title
		console.log('The title of this blog post is "%s".', fullTitle);
	} finally {
		await browser.close();
	}
})();
