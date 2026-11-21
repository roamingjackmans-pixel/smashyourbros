// Unlock tasks: finish one and that contestant challenges you. Beat them to add them to your roster.
import { stat, type Profile } from '../game/profile';

export interface Task {
  id: string;
  fighter: string;
  title: string;
  desc: string;
  goal: number;
  progress: (p: Profile) => number;
}

const storyDone = (p: Profile, id: string): number => (p.story.cleared.includes(id) ? 1 : 0);

export const TASKS: Task[] = [
  { id: 't-hoot', fighter: 'hoot', title: 'The Pilot', desc: 'Clear Episode 1 of the story. Free the resident expert from the judges’ desk.', goal: 1, progress: (p) => storyDone(p, 'e1n4') },
  { id: 't-bouldar', fighter: 'bouldar', title: 'Rock Solid Résumé', desc: 'KO 30 bros, any mode. Bouldar respects a bro who puts in the reps.', goal: 30, progress: (p) => stat(p, 'kos') },
  { id: 't-vesper', fighter: 'vesper', title: 'Read Your Bro Like a Book', desc: 'Parry 10 attacks (shield right as the hit lands).', goal: 10, progress: (p) => stat(p, 'parries') },
  { id: 't-chef', fighter: 'chef', title: 'Clean Plate Club', desc: 'Pick up and use 25 items.', goal: 25, progress: (p) => stat(p, 'items') },
  { id: 't-coral', fighter: 'coral', title: 'Ride the Ladder', desc: 'Clear Classic with any fighter.', goal: 1, progress: (p) => (Object.keys(p.classic).length ? 1 : 0) },
  { id: 't-nimbus', fighter: 'nimbus', title: 'Soft Landings', desc: 'Tech 15 times (press shield just before you hit the floor or a wall while tumbling).', goal: 15, progress: (p) => stat(p, 'techs') },
  { id: 't-amp', fighter: 'amp', title: 'Four-Piece Band', desc: 'Win 5 free-for-alls with four fighters.', goal: 5, progress: (p) => stat(p, 'ffaWins') },
  { id: 't-ruby', fighter: 'ruby', title: 'Heavy Hitter', desc: 'Throw out 60 smash attacks.', goal: 60, progress: (p) => stat(p, 'smashes') },
  { id: 't-echo', fighter: 'echo', title: 'Space Bros', desc: 'Clear Episode 4 of the story.', goal: 1, progress: (p) => storyDone(p, 'e4n4') },
  { id: 't-inverta', fighter: 'inverta', title: 'Shake It Up', desc: 'Play 10 matches with modifiers on.', goal: 10, progress: (p) => stat(p, 'modMatches') },
  { id: 't-smudge', fighter: 'smudge', title: 'Masterwork', desc: 'Clear Classic on Intensity 5 or higher.', goal: 1, progress: (p) => (Object.values(p.classic).some((v) => v >= 5) ? 1 : 0) },
  { id: 't-tempo', fighter: 'tempo', title: 'Season Finale', desc: 'Pull the plug on The Big BROadcast. Finish the story.', goal: 1, progress: (p) => storyDone(p, 'e6n2') },
];

export function taskFor(fighter: string): Task | undefined {
  return TASKS.find((t) => t.fighter === fighter);
}

/** tasks that just became complete (adds them to done + challengers) */
export function checkTasks(p: Profile): Task[] {
  const out: Task[] = [];
  for (const t of TASKS) {
    if (p.done.includes(t.id) || p.unlocked.includes(t.fighter)) continue;
    if (t.progress(p) >= t.goal) {
      p.done.push(t.id);
      if (!p.challengers.includes(t.fighter)) p.challengers.push(t.fighter);
      out.push(t);
    }
  }
  return out;
}
