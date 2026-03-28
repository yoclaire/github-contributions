import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { ContributionData } from "./types.js";
import { renderSvg } from "./render.js";

const DATA_FILE = join(process.cwd(), "data", "contributions.json");
const OUTPUT_FILE = join(process.cwd(), "contributions.svg");

const raw = readFileSync(DATA_FILE, "utf-8");
const data: ContributionData = JSON.parse(raw);

const today = new Date().toISOString().slice(0, 10);
const svg = renderSvg(data, today);

writeFileSync(OUTPUT_FILE, svg, "utf-8");
console.log(`Generated contributions.svg (${data.totalContributions} total contributions)`);
