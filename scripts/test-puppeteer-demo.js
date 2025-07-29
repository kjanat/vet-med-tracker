#!/usr/bin/env node

import puppeteer from "puppeteer";

// var screenshotsDir = "screenshots"

(async () => {
	// Launch the browser and open a new blank page
	const browser = await puppeteer.launch({
		headless: true,
		// slowMo: 50
	});
	const page = await browser.newPage();

	// Navigate the page to a URL
	await page.goto("https://developer.chrome.com/", {
		waitUntil: "networkidle2",
	});

	await page.screenshot({
		path: "screenshots/deveper.chrome.com.png",
	});

	await page.pdf({
		path: "screenshots/deveper.chrome.com.pdf",
	});

	// Set screen size
	await page.setViewport({ width: 1920, height: 1080 });

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

	await browser.close();
})();
