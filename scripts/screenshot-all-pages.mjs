#!/usr/bin/env node

// import { spawn } from "node:child_process";
import fsSync from "node:fs";
import fs from "node:fs/promises";
// import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DEV_SERVER_PORT = 3000;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;
// const WAIT_TIMEOUT = 60000; // 60 seconds max wait for server
const SCREENSHOT_DELAY = 500; // Delay after navigation to ensure page is rendered

// Find project root
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

// Viewport configurations
const VIEWPORTS = {
  mobile: { width: 375, height: 667, deviceScaleFactor: 2 }, // iPhone SE
  tablet: { width: 768, height: 1024, deviceScaleFactor: 2 }, // iPad
  desktop: { width: 1920, height: 1080, deviceScaleFactor: 1 }, // Full HD
};

// Page routes to capture
const PAGES = [
  { name: "home", path: "/" },
  { name: "history", path: "/history" },
  { name: "inventory", path: "/inventory" },
  { name: "insights", path: "/insights" },
  { name: "settings", path: "/settings", special: "tabs" },
  { name: "admin-record", path: "/admin/record" },
  { name: "audit-log", path: "/settings/audit-log" },
  { name: "offline", path: "/offline" },
];

// Settings tabs configuration
const SETTINGS_TABS = [
  { name: "animals", value: "animals", label: "Animals" },
  { name: "regimens", value: "regimens", label: "Regimens" },
  { name: "household", value: "household", label: "Household" },
  { name: "notifications", value: "notifications", label: "Notifications" },
  { name: "data", value: "data", label: "Data & Privacy" },
  { name: "preferences", value: "preferences", label: "Preferences" },
];

// Helper to create safe filenames
const _fileSafe = (s) =>
  s
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

// Check if server is ready
/* async function waitForServer(url, timeout = WAIT_TIMEOUT) {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		try {
			await new Promise((resolve, reject) => {
				http
					.get(url, (res) => {
						if (res.statusCode === 200 || res.statusCode === 404) {
							resolve(true);
						} else {
							reject(new Error(`Status ${res.statusCode}`));
						}
					})
					.on("error", reject);
			});
			return true;
		} catch {
			// Server not ready yet
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}

	throw new Error(`Server failed to start within ${timeout}ms`);
} */

// Start the development server
/* async function startDevServer() {
	console.log("🚀 Starting development server...");

	const devServer = spawn("pnpm", ["dev"], {
		cwd: PROJECT_ROOT,
		stdio: ["ignore", "pipe", "pipe"],
		shell: true,
	});

	// Optional: Log server output for debugging
	devServer.stdout.on("data", (_data) => {
		// console.log(`[dev] ${data.toString().trim()}`);
	});

	let actualPort = DEV_SERVER_PORT;
	devServer.stderr.on("data", (data) => {
		const output = data.toString().trim();
		console.error(`[dev error] ${output}`);

		// Check for port change
		const portMatch = output.match(/using available port (\d+) instead/);
		if (portMatch) {
			actualPort = parseInt(portMatch[1]);
			DEV_SERVER_URL = `http://localhost:${actualPort}`;
		}
	});

	devServer.on("error", (error) => {
		console.error("Failed to start dev server:", error);
		process.exit(1);
	});

	// Give stderr time to catch port change
	await new Promise((resolve) => setTimeout(resolve, 1000));

	await waitForServer(DEV_SERVER_URL);
	console.log(`✅ Development server is ready on port ${actualPort}`);

	return devServer;
}*/

// Create directory structure
async function ensureDirectories() {
  for (const viewport of Object.keys(VIEWPORTS)) {
    await fs.mkdir(path.join(OUT_DIR, viewport), { recursive: true });
  }
}

// Take screenshot with error handling
async function takeScreenshot(page, filepath, fullPage = true) {
  try {
    await page.screenshot({
      path: filepath,
      fullPage,
    });
    console.log(`  📸 Captured: ${path.relative(PROJECT_ROOT, filepath)}`);
  } catch (error) {
    console.error(`  ❌ Failed to capture ${filepath}:`, error.message);
  }
}

// Tab labels used in settings
const SETTINGS_TAB_LABELS = SETTINGS_TABS.map((tab) => tab.label);

// Helper to check if a button has dropdown indicators
async function hasDropdownIndicators(button) {
  return button.evaluate((el) => {
    return (
      el.querySelector(
        'svg[class*="chevron"], svg[class*="arrow"], svg[class*="caret"]',
      ) !== null ||
      el.querySelector('[class*="chevron-down"], [class*="arrow-down"]') !==
        null ||
      el.querySelector('[data-icon*="chevron"], [data-icon*="arrow"]') !== null
    );
  });
}

// Helper to find buttons with specific labels
async function findButtonsWithLabels(page, labels) {
  const buttons = await page.$$("button");
  const matchingButtons = [];

  for (const button of buttons) {
    try {
      const text = await button.evaluate((el) => el.textContent?.trim());
      if (text && labels.includes(text)) {
        matchingButtons.push({ button, text });
      }
    } catch (_e) {
      // Button might be stale, continue
    }
  }

  return matchingButtons;
}

// Find dropdown trigger button
async function findDropdownTrigger(page) {
  const matchingButtons = await findButtonsWithLabels(
    page,
    SETTINGS_TAB_LABELS,
  );

  for (const { button, text } of matchingButtons) {
    try {
      // Verify it has a dropdown icon
      if (await hasDropdownIndicators(button)) {
        console.log(`  ℹ️  Found dropdown button with value: ${text}`);
        return button;
      }
    } catch (_e) {
      // Button might be stale, continue
    }
  }

  return null;
}

// Handle mobile tab selection
async function selectMobileTab(page, tabLabel) {
  try {
    // Wait for any previous animations to complete
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Find the select trigger button
    const selectTrigger = await findDropdownTrigger(page);

    if (!selectTrigger) {
      console.warn(`  ⚠️  Could not find select trigger button`);
      return false;
    }

    // Ensure button is in viewport
    await page.evaluate((el) => {
      el.scrollIntoView({ block: "center", behavior: "instant" });
    }, selectTrigger);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Click to open dropdown
    await selectTrigger.click({ delay: 100 });
    await new Promise((resolve) => setTimeout(resolve, 800)); // Wait for dropdown animation

    // Wait for dropdown content
    try {
      await page.waitForSelector(
        '[data-radix-select-content], [role="listbox"]',
        {
          visible: true,
          timeout: 3000,
        },
      );
    } catch (_e) {
      console.warn(`  ⚠️  Dropdown did not open`);
      return false;
    }

    // Find option elements
    const options = await page.$$('[role="option"], [data-radix-select-item]');

    if (options.length === 0) {
      console.warn(`  ⚠️  No options found in dropdown`);
      return false;
    }

    // Find and click the target option
    for (const option of options) {
      try {
        const text = await option.evaluate((el) => el.textContent?.trim());
        if (text === tabLabel) {
          await option.click({ delay: 50 });
          await new Promise((resolve) => setTimeout(resolve, 800)); // Wait for selection
          console.log(`  ✓ Selected ${tabLabel}`);
          return true;
        }
      } catch (_e) {
        // Option might be stale, continue
      }
    }

    console.warn(`  ⚠️  Could not find option: ${tabLabel}`);
    await page.keyboard.press("Escape");
    return false;
  } catch (error) {
    console.error(`  ⚠️  Error selecting ${tabLabel} on mobile:`, error.message);
    await page.keyboard.press("Escape").catch(() => {});
    return false;
  }
}

// Handle desktop/tablet tab selection
async function selectDesktopTab(page, tabLabel) {
  try {
    // Wait for tabs to be visible
    await page.waitForSelector('button[role="tab"]', {
      visible: true,
      timeout: 5000,
    });

    // Find all tab buttons
    const tabButtons = await page.$$('button[role="tab"]');

    for (const button of tabButtons) {
      const text = await button.evaluate((el) => el.textContent?.trim());
      if (text === tabLabel) {
        // Check if button is visible and in viewport
        const isVisible = await button.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0"
          );
        });

        if (!isVisible) {
          console.log(`  ℹ️  Tab ${tabLabel} not visible, scrolling into view`);
          await button.evaluate((el) =>
            el.scrollIntoView({ block: "center", behavior: "smooth" }),
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Click the tab
        await button.click();
        await new Promise((resolve) => setTimeout(resolve, 300)); // Wait for tab content to load
        return true;
      }
    }

    console.warn(`  ⚠️  Could not find tab: ${tabLabel}`);
    return false;
  } catch (error) {
    console.error(`  ⚠️  Error clicking tab ${tabLabel}:`, error.message);
    return false;
  }
}

// Detect navigation method (tabs or dropdown)
async function detectNavigationMethod(page, viewportName) {
  // Check for tabs first (more specific)
  const tabButtons = await page.$$('button[role="tab"]');
  if (tabButtons.length > 0) {
    // Verify at least one tab is visible
    for (const tab of tabButtons) {
      const isVisible = await tab
        .evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0"
          );
        })
        .catch(() => false);

      if (isVisible) {
        console.log(
          `  ℹ️  Using tab navigation (found ${tabButtons.length} tabs)`,
        );
        return "tabs";
      }
    }
  }

  // Check for dropdown using shared helper
  const matchingButtons = await findButtonsWithLabels(
    page,
    SETTINGS_TAB_LABELS,
  );

  for (const { button, text } of matchingButtons) {
    try {
      // This looks like our settings dropdown
      const parent = await button.evaluate((el) => el.parentElement?.tagName);
      if (parent !== "LI" && parent !== "NAV") {
        // Not a nav item
        console.log(
          `  ℹ️  Using dropdown navigation (found select with value: ${text})`,
        );
        return "dropdown";
      }
    } catch (_e) {
      // Continue checking
    }
  }

  // Default based on viewport
  const defaultMethod = viewportName === "mobile" ? "dropdown" : "tabs";
  console.warn(
    `  ⚠️  Could not determine navigation method for ${viewportName}`,
  );
  console.log(`  ℹ️  Defaulting to ${defaultMethod} based on viewport`);
  return defaultMethod;
}

// Capture settings page with all tabs
async function captureSettingsTabs(page, viewportName, OUT_DIR) {
  // Determine navigation method
  const navigationMethod = await detectNavigationMethod(page, viewportName);

  // Now capture all tabs using the determined method
  for (const tab of SETTINGS_TABS) {
    if (navigationMethod === "dropdown") {
      await selectMobileTab(page, tab.label);
    } else if (navigationMethod === "tabs") {
      await selectDesktopTab(page, tab.label);
    }

    // Always wait and take screenshot, even if selection failed
    await new Promise((resolve) => setTimeout(resolve, SCREENSHOT_DELAY));

    const filename = `settings-${tab.name}.png`;
    await takeScreenshot(page, path.join(OUT_DIR, viewportName, filename));
  }
}

// Capture inventory modal with tabs
async function captureInventoryModal(page, viewportName, OUT_DIR) {
  try {
    // Wait a bit for page to be fully loaded
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Find Add Item button with better error handling
    const buttons = await page.$$("button");
    let addButton = null;

    for (const button of buttons) {
      try {
        const text = await button.evaluate((el) => el.textContent?.trim());
        if (
          text &&
          (text.includes("Add Item") ||
            text.includes("Add") ||
            text.includes("+"))
        ) {
          // Check if button is visible and clickable
          const isClickable = await button.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              style.opacity !== "0" &&
              !el.disabled
            );
          });

          if (isClickable) {
            addButton = button;
            break;
          }
        }
      } catch (_err) {
        // Button might have been removed from DOM, continue
      }
    }

    if (!addButton) {
      console.warn("  ⚠️  Add Item button not found or not clickable");
      return;
    }

    // Scroll button into view and click
    await addButton.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await new Promise((resolve) => setTimeout(resolve, 300));

    await addButton.click();

    // Wait for dialog with longer timeout
    await page.waitForSelector('[role="dialog"]', {
      visible: true,
      timeout: 10000,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for modal animation

    // Capture Scan tab (default)
    await takeScreenshot(
      page,
      path.join(OUT_DIR, viewportName, "inventory-add-scan.png"),
    );

    // Click Manual tab - check if we have tabs or a dropdown
    const modalHasTabs = await page
      .$('[role="dialog"] button[role="tab"]')
      .then((el) => el !== null);

    if (modalHasTabs) {
      await selectDesktopTab(page, "Manual");
    } else {
      // Modal might use dropdown on smaller screens
      await selectMobileTab(page, "Manual");
    }

    await new Promise((resolve) => setTimeout(resolve, SCREENSHOT_DELAY));

    // Capture Manual tab
    await takeScreenshot(
      page,
      path.join(OUT_DIR, viewportName, "inventory-add-manual.png"),
    );

    // Close modal
    await page.keyboard.press("Escape");
    await new Promise((resolve) => setTimeout(resolve, SCREENSHOT_DELAY));
  } catch (error) {
    console.error("  ⚠️  Could not capture inventory modal:", error.message);
  }
}

// Capture all pages for a specific viewport
async function captureViewport(browser, viewportName, viewport) {
  console.log(`\n📱 Capturing ${viewportName} screenshots...`);

  const page = await browser.newPage();
  await page.setViewport(viewport);

  // Set a realistic user agent
  await page.setUserAgent(
    viewportName === "mobile"
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );

  try {
    // Capture regular pages
    for (const pageConfig of PAGES) {
      console.log(`\n  📄 ${pageConfig.name}`);

      // Navigate to page
      try {
        await page.goto(`${DEV_SERVER_URL}${pageConfig.path}`, {
          waitUntil: ["networkidle2", "domcontentloaded"],
          timeout: 30000,
        });

        // Additional wait for React to render
        await page
          .waitForFunction(() => document.readyState === "complete", {
            timeout: 5000,
          })
          .catch(() => {});
      } catch (error) {
        console.error(
          `  ❌ Failed to navigate to ${pageConfig.path}:`,
          error.message,
        );
        continue;
      }

      // Wait for page to stabilize
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Handle special pages
      if (pageConfig.special === "tabs") {
        await captureSettingsTabs(page, viewportName, OUT_DIR);
      } else if (pageConfig.name === "inventory") {
        // Capture main inventory page
        await takeScreenshot(
          page,
          path.join(OUT_DIR, viewportName, "inventory.png"),
        );
        // Capture modal tabs
        await captureInventoryModal(page, viewportName, OUT_DIR);
      } else {
        // Regular page
        const filename = `${pageConfig.name}.png`;
        await takeScreenshot(page, path.join(OUT_DIR, viewportName, filename));
      }
    }
  } catch (error) {
    console.error(`Error capturing ${viewportName} screenshots:`, error);
  } finally {
    await page.close();
  }
}

// Main execution
async function main() {
  /* let devServer = null; */
  let browser = null;

  try {
    // Ensure output directories exist
    await ensureDirectories();

    // Start dev server
    /* devServer = await startDevServer(); */

    // Launch browser
    console.log("\n🌐 Launching browser...");
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // Capture screenshots for each viewport
    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      await captureViewport(browser, viewportName, viewport);
    }

    console.log("\n✅ All screenshots captured successfully!");
    console.log(
      `📁 Screenshots saved to: ${path.relative(PROJECT_ROOT, OUT_DIR)}`,
    );
  } catch (error) {
    console.error("\n❌ Script failed:", error.message);
    process.exitCode = 1;
  } finally {
    // Cleanup
    if (browser) {
      await browser.close();
    }

    /* if (devServer) {
            console.log("\n🛑 Stopping development server...");
            devServer.kill("SIGTERM");
            // Give it time to shut down gracefully
            await new Promise((resolve) => setTimeout(resolve, 2000));
            if (!devServer.killed) {
                devServer.kill("SIGKILL");
            }
        } */
  }
}

// Run the script
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
