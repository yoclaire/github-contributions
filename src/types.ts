export interface DailyContribution {
  date: string;
  count: number;
}

export interface ContributionData {
  lastUpdated: string;
  totalContributions: number;
  dailyContributions: DailyContribution[];
}

export interface HeatmapCell {
  date: string;
  dayOfWeek: number; // 0=Mon, 6=Sun
  weekIndex: number;
  count: number;
  level: number; // 0-4
}

export interface HeatmapGrid {
  cells: HeatmapCell[];
  weekCount: number;
  monthLabels: { label: string; weekIndex: number }[];
  recentContributions: number;
}
