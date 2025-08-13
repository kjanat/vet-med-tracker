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
    if (parent === dir) return startDir; // fallback if no package.json is found
    dir = parent;
  }
}

const PROJECT_ROOT = findProjectRoot();
const OUT_DIR = path.join(PROJECT_ROOT, "screenshots");
const URL_TO_OPEN = "https://developer.chrome.com/";
const SEARCH_QUERY = "automate beyond recorder";

const fileSafe = (s) =>
  s
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

async function ensureOutDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

async function captureLandingArtifacts(page, url) {
  const base = fileSafe(new URL(url).hostname);
  await page.screenshot({
    path: path.join(OUT_DIR, `${base}.png`),
    fullPage: true,
  });
  await page.emulateMediaType("screen");
  await page.pdf({
    path: path.join(OUT_DIR, `${base}.pdf`),
    printBackground: true,
    format: "A4",
    margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
  });
}

async function typeAndTriggerSearch(page, query) {
  // Try the obvious search box
  const candidates = [
    ".devsite-search-field",
    'input[role="searchbox"]',
    'input[type="search"]',
    'form[role="search"] input',
  ];
  let used = null;
  for (const sel of candidates) {
    try {
      await page.waitForSelector(sel, { visible: true, timeout: 5000 });
      used = sel;
      break;
    } catch {}
  }
  if (!used) throw new Error("Search input not found on page");

  await page.click(used, { clickCount: 3 });
  await page.type(used, query);

  // Some UIs show an overlay (no navigation), others navigate to /search?q=
  // Kick Enter and wait for whichever happens first.
  const winner = await Promise.race([
    page
      .waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 })
      .then(() => "nav"),
    page
      .waitForFunction(
        // Stupid-simple “overlay present” heuristic: many anchors + body height grows
        () =>
          document.querySelectorAll("a[href]").length > 50 ||
          document.body.clientHeight > 2000,
        { timeout: 8000 },
      )
      .then(() => "overlay")
      .catch(() => "none"),
  ]);

  if (winner === "none") {
    // Force a results page as a fallback
    const searchUrl = new URL("/search", URL_TO_OPEN);
    searchUrl.searchParams.set("q", query);
    await page.goto(String(searchUrl), { waitUntil: "networkidle2" });
  } else if (winner === "nav") {
    // we’re already on results
  } else {
    // overlay case: just proceed; DOM updated in-place
  }
}

async function pickBestResultHref(page, query) {
  // Try some known selectors first
  const preferredSelectors = [
    "a.devsite-result-item-link",
    "a.search__result-link",
    'a[href*="/docs/"]',
    'a[href*="developer.chrome.com"]',
  ];
  for (const sel of preferredSelectors) {
    const href = await page
      .$$eval(sel, (els) => {
        const a = els.find(
          (el) =>
            el instanceof HTMLAnchorElement &&
            el.href &&
            !el.href.startsWith("javascript:"),
        );
        return a ? a.href : null;
      })
      .catch(() => null);
    if (href) return href;
  }

  // Generic scoring fallback over all anchors
  const href = await page
    .$$eval(
      "a[href]",
      (as, q) => {
        q = q.toLowerCase();
        const words = q.split(/\s+/).filter(Boolean);

        // Helper functions to reduce complexity
        const isValidUrl = (href) => {
          if (!href) return false;
          return !href.startsWith("javascript:") && !href.startsWith("#");
        };

        const calculateWordScore = (words, text, href) => {
          let score = 0;
          for (const w of words) {
            if (text.includes(w)) score += 2;
            if (href.includes(w)) score += 1;
          }
          return score;
        };

        const applyUrlBonuses = (href) => {
          let bonus = 0;
          if (href.includes("developer.chrome.com")) bonus += 3;
          if (/\/docs\//.test(href)) bonus += 2;
          if (/(privacy|terms|github|twitter|facebook)/.test(href)) bonus -= 5;
          return bonus;
        };

        const scoreOf = (a) => {
          const href = (a.href || "").toLowerCase();
          const text = (a.textContent || "").toLowerCase();

          if (!isValidUrl(href)) return -1;

          const wordScore = calculateWordScore(words, text, href);
          const urlBonus = applyUrlBonuses(href);

          return wordScore + urlBonus;
        };

        const scored = as
          .map((a) => ({ a, s: scoreOf(a) }))
          .filter((x) => x.s > 0);
        scored.sort((x, y) => y.s - x.s);
        return scored[0]?.a?.href || null;
      },
      query,
    )
    .catch(() => null);

  if (!href) throw new Error("No plausible search result link found");
  return href;
}

(async () => {
  let browser;
  try {
    await ensureOutDir();

    browser = await puppeteer.launch({
      headless: true, // set to false to watch it do its thing
      defaultViewport: { width: 1920, height: 1080 },
      // args: ['--no-sandbox', '--disable-setuid-sandbox'], // CI/docker
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(20_000);
    page.setDefaultNavigationTimeout(30_000);

    // A friendly UA reduces anti-bot weirdness
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    await page.goto(URL_TO_OPEN, { waitUntil: "networkidle2" });
    await captureLandingArtifacts(page, URL_TO_OPEN);

    await typeAndTriggerSearch(page, SEARCH_QUERY);

    const bestHref = await pickBestResultHref(page, SEARCH_QUERY);

    // Navigate to the chosen result (don’t rely on clicking; go straight)
    await page.goto(bestHref, { waitUntil: "networkidle2" });

    const title = await page.title();
    console.log(`Landed on: ${title}`);
    console.log(`Result URL: ${bestHref}`);

    // Assert the page mentions something relevant (soft assertion)
    await page
      .waitForFunction(
        (q) => document.body?.innerText.toLowerCase().includes(q.toLowerCase()),
        { timeout: 8000 },
        "customize and automate",
      )
      .catch(() => {
        /* wording changes aren’t fatal */
      });

    const articleSlug = fileSafe(title || "article");
    await page.screenshot({
      path: path.join(OUT_DIR, `${articleSlug}.png`),
      fullPage: true,
    });
  } catch (err) {
    console.error("❌ Script crashed:", err?.message || err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
