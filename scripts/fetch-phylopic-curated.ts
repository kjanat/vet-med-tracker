#!/usr/bin/env bun

/**
 * Curated PhyloPic fetcher: Randomly select 2 silhouettes per animal type
 * Keeps repo size manageable while maintaining scientific accuracy
 */

import { mkdir, readdir } from "node:fs/promises";

const ANIMAL_NODES = {
	dogs: "bfa6b12f-992f-4e01-b34c-585813281842",
	cats: "56b54867-1e98-4ea1-bb5d-c6eadc3d0393",
	rabbits: "41a5492a-c5e7-43ac-8a9d-e82fa9d81691",
	horses: "999b84d9-5fd8-450c-9de6-a8fe85b6248c",
	birds: "8d63e6d4-bfd5-490b-afbe-4ed99c4fbff6",
	goldfish: "a70b88c1-b11b-4f28-bf0b-02efedff5b00",
	mice: "99b5c8a0-c6c5-45a3-9864-6ce41e6783b5",
};

const API_BASE = "https://api.phylopic.org";
const OUTPUT_DIR = `${import.meta.dir}/../public/silhouettes`;
const SILHOUETTES_PER_ANIMAL = 2;

// Types
type PhylopicImage = {
	uuid: string;
	_links: {
		self: { href: string };
		vectorFile?: { href: string };
		contributor?: { title: string };
	};
	_embedded?: {
		specificNode?: { _links: { self: { title: string } } };
		license?: { _links: { self: { title: string; href: string } } };
	};
};

type ApiResponse = {
	_embedded?: { items?: PhylopicImage[] };
	totalPages?: number;
};

async function fetchJSON<T = ApiResponse>(url: string): Promise<T> {
	console.log(`Fetching ${url}`);
	const response = await fetch(url, {
		headers: { Accept: "application/vnd.phylopic.v2+json" },
	});
	if (!response.ok)
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	return await response.json();
}

async function downloadSVG(url: string, filePath: string): Promise<void> {
	console.log(`Downloading SVG: ${url} -> ${filePath}`);
	const response = await fetch(url);
	if (!response.ok)
		throw new Error(`Failed to download SVG: ${response.status}`);
	const svgContent = await response.text();
	await Bun.write(filePath, svgContent);
}

// Random selection function
function getRandomItems<T>(array: T[], count: number): T[] {
	const shuffled = [...array].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

async function fetchAllImagesForNode(nodeId: string): Promise<PhylopicImage[]> {
	const allImages: PhylopicImage[] = [];
	let currentPage = 0;
	const maxPages = 2;

	while (currentPage < maxPages) {
		const imagesUrl = `${API_BASE}/images?build=504&embed_items=true&filter_clade=${nodeId}&page=${currentPage}`;
		const imagesData = await fetchJSON(imagesUrl);
		if (imagesData._embedded?.items) {
			allImages.push(...imagesData._embedded.items);
		}
		const totalPages = imagesData.totalPages || 1;
		currentPage++;
		if (currentPage >= totalPages || currentPage >= maxPages) break;
	}

	return allImages;
}

async function downloadImageWithAttribution(
	image: PhylopicImage,
	animalType: string,
): Promise<boolean> {
	const imageDetailsUrl = `${API_BASE}/images/${image.uuid}?embed_license=true&embed_specificNode=true`;
	const imageDetails: PhylopicImage = await fetchJSON(imageDetailsUrl);
	const license = imageDetails._embedded?.license?._links?.self;
	const licenseInfo = license || { title: "CC0 1.0", href: "" };

	if (!imageDetails._links.vectorFile?.href) {
		return false;
	}

	const svgUrl = imageDetails._links.vectorFile.href.startsWith("http")
		? imageDetails._links.vectorFile.href
		: `${API_BASE}${imageDetails._links.vectorFile.href}`;
	const filename = `${animalType}-${image.uuid}.svg`;
	const filepath = `${OUTPUT_DIR}/${filename}`;

	try {
		await downloadSVG(svgUrl, filepath);
		console.log(
			`✓ Downloaded ${filename} (${licenseInfo.title || "unknown license"})`,
		);

		// Attribution JSON
		const attribution = {
			animal: animalType,
			uuid: image.uuid,
			license: licenseInfo.title || "unknown",
			licenseUrl: licenseInfo.href || "",
			contributor: imageDetails._links.contributor?.title || "unknown",
			specificName:
				imageDetails._embedded?.specificNode?._links?.self?.title || animalType,
		};
		await Bun.write(
			`${OUTPUT_DIR}/${animalType}-${image.uuid}.json`,
			JSON.stringify(attribution, null, 2),
		);
		return true;
	} catch (err) {
		console.error(`Failed to download SVG for ${image.uuid}:`, err);
		return false;
	}
}

async function fetchCuratedImagesForNode(
	nodeId: string,
	animalType: string,
): Promise<void> {
	console.log(
		`\n🎲 Randomly selecting ${SILHOUETTES_PER_ANIMAL} images for ${animalType} (${nodeId})...`,
	);

	const allImages = await fetchAllImagesForNode(nodeId);
	console.log(
		`Found ${allImages.length} total images for ${animalType}, randomly selecting ${SILHOUETTES_PER_ANIMAL}...`,
	);

	const selectedImages = getRandomItems(allImages, SILHOUETTES_PER_ANIMAL);
	console.log(
		`🎯 Selected ${selectedImages.length} random images for ${animalType}`,
	);

	let downloadCount = 0;
	for (const image of selectedImages) {
		const success = await downloadImageWithAttribution(image, animalType);
		if (success) downloadCount++;
	}

	if (downloadCount === 0) {
		console.warn(`⚠️ No commercial SVGs found for ${animalType}`);
	} else {
		console.log(
			`🎉 Successfully downloaded ${downloadCount}/${SILHOUETTES_PER_ANIMAL} silhouettes for ${animalType}`,
		);
	}
}

async function main() {
	console.log(
		`🎲 PhyloPic Curator: Randomly selecting ${SILHOUETTES_PER_ANIMAL} silhouettes per animal type`,
	);
	console.log(
		`📊 Expected total files: ${Object.keys(ANIMAL_NODES).length * SILHOUETTES_PER_ANIMAL * 2} (SVG + JSON pairs)`,
	);

	// Create output directory if not exists
	await mkdir(OUTPUT_DIR, { recursive: true });

	// Attribution index
	const index: {
		totalImages: number;
		animals: Record<string, string[]>;
		curatedAt: string;
		silhouettesPerAnimal: number;
	} = {
		totalImages: 0,
		animals: {},
		curatedAt: new Date().toISOString(),
		silhouettesPerAnimal: SILHOUETTES_PER_ANIMAL,
	};

	for (const [animalType, nodeId] of Object.entries(ANIMAL_NODES)) {
		await fetchCuratedImagesForNode(nodeId, animalType);
		await new Promise((r) => setTimeout(r, 1500)); // polite delay
	}

	// Build index.json
	const files = await readdir(OUTPUT_DIR);
	const svgFiles = files.filter((f: string) => f.endsWith(".svg"));
	index.totalImages = svgFiles.length;

	for (const file of svgFiles) {
		const animalType = file.split("-")[0];
		if (!index.animals[animalType]) index.animals[animalType] = [];
		index.animals[animalType].push(file);
	}

	await Bun.write(`${OUTPUT_DIR}/index.json`, JSON.stringify(index, null, 2));

	console.log("\n🎉 Curation complete! Random selection results:");
	console.log(
		`📁 Total files: ${svgFiles.length * 2 + 1} (${svgFiles.length} SVGs + ${svgFiles.length} JSONs + 1 index)`,
	);
	console.log("🔍 Final index:");
	console.log(JSON.stringify(index, null, 2));
}

main().catch(console.error);
