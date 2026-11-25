import nodeData from '@/data/node-mastery.json';
import type { MissionProgress } from './types';

interface NodeRecord {
  name: string;
  type: number;
  faction: number;
  lvl: number[];
  xp?: number;
}

const junctionNames = [
  'EarthToVenusJunction',
  'VenusToMercuryJunction',
  'EarthToMarsJunction',
  'MarsToPhobosJunction',
  'MarsToCeresJunction',
  'CeresToJupiterJunction',
  'JupiterToEuropaJunction',
  'JupiterToSaturnJunction',
  'SaturnToUranusJunction',
  'UranusToNeptuneJunction',
  'NeptuneToPlutoJunction',
  'PlutoToErisJunction',
  'ErisToSednaJunction',
] as const;

const nodesByTag = new Map<string, NodeRecord>();
for (const planet of Object.values(nodeData)) {
  for (const [tag, node] of Object.entries(planet)) {
    if (typeof node === 'object' && node !== null) {
      nodesByTag.set(tag, node as NodeRecord);
    }
  }
}

export const TOTAL_JUNCTION_POINTS = junctionNames.length * 1_000;
export const TOTAL_MISSION_POINTS = [...nodesByTag.values()].reduce(
  (total, node) => total + (node.xp ?? 0),
  0,
);
export const TRACKED_MISSION_NODES = [...nodesByTag.values()].filter(
  (node) => Number.isFinite(node.xp),
).length;

export interface MissionBreakdown {
  missionPoints: number;
  completedMissions: number;
  totalMissionNodes: number;
  completedJunctions: number;
  totalJunctions: number;
  possibleMissionPoints: number;
  unknownCompletedTags: string[];
  hasProfileData: boolean;
}

function isJunction(tag: string): boolean {
  return junctionNames.includes(tag as (typeof junctionNames)[number]);
}

export function calculateMissionBreakdown(
  missions: MissionProgress[] | undefined,
): MissionBreakdown {
  const progressByTag = new Map<string, MissionProgress>();
  for (const mission of missions ?? []) {
    const previous = progressByTag.get(mission.tag);
    if (!previous || mission.completes > previous.completes) {
      progressByTag.set(mission.tag, mission);
    }
  }
  const progress = [...progressByTag.values()];
  const completed = progress.filter((mission) => mission.completes > 0);
  const completedJunctions = completed.filter((mission) => isJunction(mission.tag)).length;
  const completedNodes = completed.filter((mission) => !isJunction(mission.tag));
  const unknownCompletedTags = completedNodes
    .filter((mission) => !Number.isFinite(nodesByTag.get(mission.tag)?.xp))
    .map((mission) => mission.tag);

  const missionPoints = completed.reduce((total, mission) => {
    if (isJunction(mission.tag)) return total + 1_000;
    return total + (nodesByTag.get(mission.tag)?.xp ?? 0);
  }, 0);

  return {
    missionPoints,
    completedMissions: completedNodes.filter((mission) =>
      Number.isFinite(nodesByTag.get(mission.tag)?.xp),
    ).length,
    totalMissionNodes: TRACKED_MISSION_NODES,
    completedJunctions,
    totalJunctions: junctionNames.length,
    possibleMissionPoints: TOTAL_MISSION_POINTS + TOTAL_JUNCTION_POINTS,
    unknownCompletedTags,
    hasProfileData: progress.length > 0,
  };
}

export function intrinsicPointsFromRanks(ranks: number): number {
  return Math.max(0, Math.floor(ranks)) * 1_500;
}

export function intrinsicRanksFromSkills(skills: Record<string, unknown> | undefined): number {
  if (!skills) return 0;
  return Object.entries(skills).reduce((total, [key, value]) => {
    if (!key.startsWith('LPS_') || typeof value !== 'number' || !Number.isFinite(value)) {
      return total;
    }
    return total + Math.max(0, Math.floor(value));
  }, 0);
}
