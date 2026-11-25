export type TabId =
  | 'warframes'
  | 'primary'
  | 'secondary'
  | 'melee'
  | 'companions'
  | 'archwing'
  | 'necramechs'
  | 'other';

export type ItemKind = 'frame' | 'companion' | 'archwing' | 'necramech' | 'weapon' | 'kdrive';

export interface RawItem {
  uniqueName: string;
  name: string;
  category: string;
  type: string;
  masterable: boolean;
  masteryReq?: number;
  imageName?: string;
}

export interface Item extends RawItem {
  masteryReq: number;
  tab: TabId;
  kind: ItemKind;
  /** Maximum mastery points this item can award. */
  points: number;
  maxRank: number;
  /** Rank at which the base mastery award is earned (30 for most items). */
  masteryRank: number;
  /** Affinity required for rank N is affinityBase × N². */
  affinityBase: number;
  xpPerRank: number;
  maxXp: number;
  /** XP required to earn every available mastery point. */
  maxXpForPoints: number;
  isRank40: boolean;
  imageUrl: string | null;
}

export interface ManualExtras {
  junctions: number;
  intrinsics: number;
  starChartPoints: number;
}

export interface MissionProgress {
  tag: string;
  completes: number;
}

export type Overrides = Record<string, boolean>;

export type ProfileSource = 'fetch' | 'paste' | 'demo';

export interface StoredProfile {
  version: 1;
  fetchedAt: number;
  source: ProfileSource;
  displayName: string;
  accountId?: string;
  playerLevel: number;
  xp: Record<string, number>;
  missions: MissionProgress[];
  intrinsicRanks: number;
}

export interface ParsedProfile {
  displayName: string;
  accountId?: string;
  playerLevel: number;
  xp: Record<string, number>;
  missions: MissionProgress[];
  intrinsicRanks: number;
  xpInfoPath: string;
  entryCount: number;
}

export interface ItemState {
  item: Item;
  xp: number;
  rank: number;
  points: number;
  mastered: boolean;
  remainingXp: number;
  override?: boolean;
}

export interface MasteryStats {
  itemPoints: number;
  manualPoints: number;
  missionPoints: number;
  intrinsicPoints: number;
  totalPoints: number;
  rank: number;
  nextRank: number;
  currentThreshold: number;
  nextThreshold: number;
  pointsToNext: number;
  progress: number;
  masteredCount: number;
  totalItems: number;
  completion: number;
  totalPossibleItemPoints: number;
  nodePoints: number;
  junctionPoints: number;
  starChartPoints: number;
  completedMissions: number;
  totalMissionNodes: number;
  completedJunctions: number;
  totalJunctions: number;
  possibleMissionPoints: number;
}

export interface ShareSnapshot {
  version: 1;
  displayName: string;
  playerLevel: number;
  xp: Record<string, number>;
  missions: MissionProgress[];
  intrinsicRanks: number;
  extras: ManualExtras;
  overrides: Overrides;
  createdAt: number;
}
