import type { BreakdownRow } from './mastery';

export interface SourceColor {
  /** Readable text colour on both themes. */
  text: string;
  /** Solid fill for bars and dots. */
  bar: string;
  /** Solid tinted surface and border for chips and tiles. */
  soft: string;
}

const vivid = (name: string, text: string, bar: string): SourceColor => ({
  text,
  bar,
  soft: `bg-${name}/15 border-${name}/50`,
});

export const SOURCE_COLORS: Record<BreakdownRow['id'], SourceColor> = {
  warframes: vivid('violet-500', 'text-violet-700 dark:text-violet-300', 'bg-violet-500'),
  primary: vivid('orange-500', 'text-orange-700 dark:text-orange-300', 'bg-orange-500'),
  secondary: vivid('sky-500', 'text-sky-700 dark:text-sky-300', 'bg-sky-500'),
  melee: vivid('rose-500', 'text-rose-700 dark:text-rose-300', 'bg-rose-500'),
  companions: vivid('emerald-500', 'text-emerald-700 dark:text-emerald-300', 'bg-emerald-500'),
  archwing: vivid('teal-500', 'text-teal-700 dark:text-teal-300', 'bg-teal-500'),
  necramechs: vivid('amber-500', 'text-amber-700 dark:text-amber-300', 'bg-amber-500'),
  other: vivid('fuchsia-500', 'text-fuchsia-700 dark:text-fuchsia-300', 'bg-fuchsia-500'),
  nodes: vivid('indigo-500', 'text-indigo-700 dark:text-indigo-300', 'bg-indigo-500'),
  junctions: vivid('lime-500', 'text-lime-700 dark:text-lime-300', 'bg-lime-500'),
  intrinsics: vivid('cyan-500', 'text-cyan-700 dark:text-cyan-300', 'bg-cyan-500'),
  starchart: vivid('yellow-400', 'text-yellow-800 dark:text-yellow-300', 'bg-yellow-400'),
};
