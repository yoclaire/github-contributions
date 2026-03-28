import { ContributionData } from "./types.js";
import { formatCount } from "./format.js";
import { buildHeatmapGrid } from "./heatmap.js";

const LEVEL_COLORS = [
  { fill: "#161b22", stroke: ' stroke="#30363d" stroke-width="0.5"' },
  { fill: "#6366f1", stroke: "" },
  { fill: "#6366f1", stroke: "" },
  { fill: "#ec4899", stroke: "" },
  { fill: "#ec4899", stroke: "" },
];
const LEVEL_OPACITY = [1, 0.3, 0.6, 0.8, 1];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function renderSvg(data: ContributionData, today: string): string {
  const grid = buildHeatmapGrid(data.dailyContributions, today);

  const CELL_SIZE = 10;
  const CELL_GAP = 3;
  const CELL_STEP = CELL_SIZE + CELL_GAP;

  const HEATMAP_X = 205;
  const HEATMAP_Y = 56;
  const DAY_LABEL_WIDTH = 25;
  const MONTH_LABEL_HEIGHT = 14;

  const heatmapGridWidth = grid.weekCount * CELL_STEP - CELL_GAP;
  const heatmapGridHeight = 7 * CELL_STEP - CELL_GAP;

  const rightPanelWidth = DAY_LABEL_WIDTH + heatmapGridWidth + 20;
  const svgWidth = HEATMAP_X + rightPanelWidth;
  const svgHeight = HEATMAP_Y + 20 + MONTH_LABEL_HEIGHT + heatmapGridHeight + 40;

  const heatmapRects = grid.cells
    .map((cell) => {
      const x = cell.weekIndex * CELL_STEP;
      const y = cell.dayOfWeek * CELL_STEP;
      const { fill, stroke } = LEVEL_COLORS[cell.level];
      const opacity = cell.level === 0 ? "" : ` opacity="${LEVEL_OPACITY[cell.level]}"`;
      return `<rect x="${x}" y="${y}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="2" fill="${fill}"${stroke}${opacity}/>`;
    })
    .join("\n          ");

  const monthLabelsSvg = grid.monthLabels
    .map((m) => `<text x="${m.weekIndex * CELL_STEP}" y="0" fill="#8b949e" font-family="monospace" font-size="8">${m.label}</text>`)
    .join("\n        ");

  const recentFormatted = formatCount(grid.recentContributions);
  const totalFormatted = formatCount(data.totalContributions);

  // Compute "Active Since" from earliest contribution
  const earliest = data.dailyContributions.find(d => d.count > 0);
  let activeSince = "unknown";
  if (earliest) {
    const d = new Date(earliest.date + "T00:00:00");
    activeSince = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }

  const legendY = heatmapGridHeight + 14;
  const legendX = Math.max(0, (heatmapGridWidth - 120) / 2);

  return `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="${svgWidth}" height="${svgHeight}" rx="8" fill="#161b22" stroke="#30363d" stroke-width="1"/>

  <text x="24" y="28" fill="#c9d1d9" font-family="monospace" font-size="13" font-weight="600">GitHub Contributions</text>

  <line x1="185" y1="42" x2="185" y2="${svgHeight - 18}" stroke="#30363d" stroke-width="0.5" opacity="0.5"/>

  <text x="24" y="56" fill="#8b949e" font-family="monospace" font-size="10">All-Time Contributions</text>
  <text x="24" y="88" fill="url(#grad)" font-family="monospace" font-size="30" font-weight="bold">${totalFormatted}</text>
  <line x1="24" y1="96" x2="160" y2="96" stroke="#30363d" stroke-width="0.5"/>
  <text x="24" y="112" fill="#8b949e" font-family="monospace" font-size="10">Active Since</text>
  <text x="24" y="128" fill="#c9d1d9" font-family="monospace" font-size="12">${activeSince}</text>
  <text x="24" y="148" fill="#8b949e" font-family="monospace" font-size="10">Last Snapshot</text>
  <text x="24" y="164" fill="#c9d1d9" font-family="monospace" font-size="12">${data.lastUpdated}</text>
  <text x="24" y="${svgHeight - 8}" fill="#484f58" font-family="monospace" font-size="8">Preserved contribution history</text>

  <g transform="translate(${HEATMAP_X}, ${HEATMAP_Y})">
    <text x="0" y="-14" fill="#c9d1d9" font-family="monospace" font-size="10">${recentFormatted} contributions in the last year</text>

    <g transform="translate(${DAY_LABEL_WIDTH}, 4)">
      ${monthLabelsSvg}
    </g>

    <text x="0" y="${MONTH_LABEL_HEIGHT + CELL_STEP * 0 + 9}" fill="#8b949e" font-family="monospace" font-size="8">Mon</text>
    <text x="0" y="${MONTH_LABEL_HEIGHT + CELL_STEP * 2 + 9}" fill="#8b949e" font-family="monospace" font-size="8">Wed</text>
    <text x="0" y="${MONTH_LABEL_HEIGHT + CELL_STEP * 4 + 9}" fill="#8b949e" font-family="monospace" font-size="8">Fri</text>

    <g transform="translate(${DAY_LABEL_WIDTH}, ${MONTH_LABEL_HEIGHT})">
      ${heatmapRects}
    </g>

    <g transform="translate(${DAY_LABEL_WIDTH + legendX}, ${MONTH_LABEL_HEIGHT + legendY})">
      <text x="0" y="9" fill="#8b949e" font-family="monospace" font-size="8">Less</text>
      <rect x="26" y="1" width="10" height="10" rx="2" fill="#161b22" stroke="#30363d" stroke-width="0.5"/>
      <rect x="40" y="1" width="10" height="10" rx="2" fill="#6366f1" opacity="0.3"/>
      <rect x="54" y="1" width="10" height="10" rx="2" fill="#6366f1" opacity="0.6"/>
      <rect x="68" y="1" width="10" height="10" rx="2" fill="#ec4899" opacity="0.8"/>
      <rect x="82" y="1" width="10" height="10" rx="2" fill="#ec4899"/>
      <text x="98" y="9" fill="#8b949e" font-family="monospace" font-size="8">More</text>
    </g>
  </g>
</svg>`;
}
