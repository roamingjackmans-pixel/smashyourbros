// Achievements (D24): lifetime goals with progress bars, checked after every match and on sign-in. Separate from
// the twelve unlock tasks (data/tasks.ts), which free new contestants; the achievements screen shows both.
import { stat, type Profile } from '../game/profile';
import { EPISODES } from './story';
import { TASKS } from './tasks';
import { STAGES } from '../sim/data';

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  desc: string;
  goal: number;
  progress: (p: Profile) => number;
}

const s = (k: string) => (p: Profile): number => stat(p, k);
const storyNodes = (): string[] => EPISODES.flatMap((e) => e.nodes.map((n) => n.id));
export const MODES_ALL = ['stock', 'time', 'stamina', 'coin', 'koth'];

export const ACHIEVEMENTS: Achievement[] = [
  // playing
  { id: 'first-match', icon: '🎬', name: 'The Bro-mance Begins', desc: 'Play your first match. The cameras love you already.', goal: 1, progress: s('matches') },
  { id: 'matches-25', icon: '📺', name: 'Regular on the Show', desc: 'Play 25 matches.', goal: 25, progress: s('matches') },
  { id: 'matches-100', icon: '🎟️', name: 'Season Ticket Holder', desc: 'Play 100 matches.', goal: 100, progress: s('matches') },
  { id: 'time-1h', icon: '⏱️', name: 'Quality Bro Time', desc: 'Spend an hour in matches.', goal: 3600, progress: s('time') },
  { id: 'time-10h', icon: '🛋️', name: 'Basically Roommates', desc: 'Spend ten hours in matches.', goal: 36000, progress: s('time') },
  // winning
  { id: 'first-win', icon: '🏅', name: 'First Dub, Bro', desc: 'Win a match. Hug your opponent. Mandatory.', goal: 1, progress: s('wins') },
  { id: 'wins-25', icon: '🥇', name: 'Self-Certified Winner', desc: 'Win 25 matches.', goal: 25, progress: s('wins') },
  { id: 'wins-100', icon: '👑', name: 'Champion of the Bro-niverse', desc: 'Win 100 matches.', goal: 100, progress: s('wins') },
  { id: 'flawless', icon: '💇', name: 'Didn’t Even Mess Up My Hair', desc: 'Win a stock match without losing a single stock.', goal: 1, progress: s('flawless') },
  { id: 'ffa-win', icon: '🎉', name: 'Four-Bro Pile-Up', desc: 'Win a free-for-all with four fighters.', goal: 1, progress: s('ffaWins') },
  { id: 'team-wins', icon: '🤝', name: 'Tag-Team Besties', desc: 'Win 10 team matches with your bestie.', goal: 10, progress: s('teamWins') },
  // KOs and damage
  { id: 'ko-1', icon: '🚀', name: 'Sorry, Bro!', desc: 'Get your first KO. Send them into orbit, with love.', goal: 1, progress: s('kos') },
  { id: 'ko-100', icon: '✈️', name: 'Frequent Flyer Program', desc: 'KO 100 bros.', goal: 100, progress: s('kos') },
  { id: 'ko-500', icon: '🛰️', name: 'Air Traffic Controller', desc: 'KO 500 bros.', goal: 500, progress: s('kos') },
  { id: 'kos-5-match', icon: '🎳', name: 'Party Crasher', desc: 'Get 5 KOs in one match.', goal: 5, progress: s('bestKOs') },
  { id: 'dmg-1k', icon: '💥', name: 'Love Taps', desc: 'Deal 1,000% damage in total.', goal: 1000, progress: s('damage') },
  { id: 'dmg-10k', icon: '💢', name: 'Tough Love', desc: 'Deal 10,000% damage in total.', goal: 10000, progress: s('damage') },
  { id: 'dmg-50k', icon: '❤️‍🔥', name: 'Aggressively Supportive', desc: 'Deal 50,000% damage in total.', goal: 50000, progress: s('damage') },
  { id: 'hits-1k', icon: '🙌', name: 'High-Five Machine', desc: 'Land 1,000 hits.', goal: 1000, progress: s('hits') },
  { id: 'big-match', icon: '📈', name: 'Main Event', desc: 'Deal 300% damage in one match.', goal: 300, progress: s('bestDamage') },
  // technique
  { id: 'combo-5', icon: '🍟', name: 'Five-Piece Combo Meal', desc: 'Land a 5-hit combo.', goal: 5, progress: s('bestCombo') },
  { id: 'combo-10', icon: '🎶', name: 'Ten Hits of Pure Affection', desc: 'Land a 10-hit combo. They’ll write songs about it.', goal: 10, progress: s('bestCombo') },
  { id: 'combos-50', icon: '🧑‍🍳', name: 'Combo Connoisseur', desc: 'Land 50 combos of 3 hits or more.', goal: 50, progress: s('combos3') },
  { id: 'parry-25', icon: '📖', name: 'Read You Like the Group Chat', desc: 'Parry 25 attacks.', goal: 25, progress: s('parries') },
  { id: 'tech-50', icon: '🤸', name: 'Stuck the Landing', desc: 'Tech 50 times.', goal: 50, progress: s('techs') },
  { id: 'smash-200', icon: '🔨', name: 'Smash Your Bros (Literally)', desc: 'Throw out 200 smash attacks.', goal: 200, progress: s('smashes') },
  { id: 'meteor-10', icon: '☄️', name: 'Spike-ology', desc: 'Land 10 meteor smashes.', goal: 10, progress: s('meteors') },
  { id: 'ult-10', icon: '🌟', name: 'Main Character Energy', desc: 'Land 10 ultimates.', goal: 10, progress: s('ults') },
  { id: 'items-100', icon: '🍕', name: 'Snack Attack', desc: 'Pick up and use 100 items.', goal: 100, progress: s('items') },
  { id: 'taunt-50', icon: '📣', name: 'Hype Man', desc: 'Taunt 50 times. Your bros need to hear it.', goal: 50, progress: s('taunts') },
  { id: 'sd-1', icon: '🗺️', name: 'Took the Scenic Route', desc: 'Self-destruct. It happens to the best of us.', goal: 1, progress: s('sds') },
  { id: 'falls-100', icon: '🪂', name: 'Professional Faller', desc: 'Get KO’d 100 times. Every fall is a lesson, bro.', goal: 100, progress: s('falls') },
  // variety
  { id: 'roster-8', icon: '🃏', name: 'Bro Collector', desc: 'Play as 8 different fighters.', goal: 8, progress: (p) => Object.keys(p.used).length },
  { id: 'roster-16', icon: '🫂', name: 'Every Bro Is My Bro', desc: 'Play as all 16 fighters.', goal: 16, progress: (p) => Object.keys(p.used).length },
  { id: 'modes', icon: '🎲', name: 'Variety Show', desc: 'Play every mode: Stock, Time, Stamina, Coin Battle and King of the Hill.', goal: MODES_ALL.length, progress: (p) => MODES_ALL.filter((m) => stat(p, `mode_${m}`) > 0).length },
  { id: 'stages', icon: '🗺', name: 'Studio Tour', desc: 'Fight on every stage.', goal: STAGES.length, progress: (p) => STAGES.filter((g) => stat(p, `stage_${g.id}`) > 0).length },
  { id: 'mods-25', icon: '🌀', name: 'Chaos Coordinator', desc: 'Play 25 matches with modifiers on.', goal: 25, progress: s('modMatches') },
  // story, classic, roster
  { id: 'story-1', icon: '📡', name: 'Tuned In', desc: 'Clear Episode 1 of Prime-Time Brawl.', goal: 1, progress: (p) => (EPISODES[0].nodes.every((n) => p.story.cleared.includes(n.id)) ? 1 : 0) },
  { id: 'story-all', icon: '🎞️', name: 'Series Finale', desc: 'Clear every segment of the story.', goal: storyNodes().length, progress: (p) => storyNodes().filter((n) => p.story.cleared.includes(n)).length },
  { id: 'classic-1', icon: '🪜', name: 'Climbed the Ladder', desc: 'Clear Classic with any fighter.', goal: 1, progress: (p) => (Object.keys(p.classic).length ? 1 : 0) },
  { id: 'classic-5', icon: '🏆', name: 'Ladder League', desc: 'Clear Classic with 5 different fighters.', goal: 5, progress: (p) => Object.keys(p.classic).length },
  { id: 'classic-9', icon: '🔥', name: 'Intensity: Maximum Bro', desc: 'Clear Classic on Intensity 9.', goal: 1, progress: (p) => (Object.values(p.classic).some((v) => v >= 9) ? 1 : 0) },
  { id: 'challenger', icon: '🆕', name: 'Welcome to the Squad', desc: 'Beat a new contestant and add them to your roster.', goal: 1, progress: (p) => Math.max(0, p.unlocked.length - 4) },
  { id: 'full-cast', icon: '🎭', name: 'Full Cast', desc: 'Unlock all 16 contestants.', goal: 16, progress: (p) => p.unlocked.length },
  { id: 'tasks', icon: '✅', name: 'Task Master', desc: 'Finish all twelve unlock tasks.', goal: TASKS.length, progress: (p) => TASKS.filter((t) => p.done.includes(t.id) || p.unlocked.includes(t.fighter)).length },
  // online
  { id: 'online-1', icon: '🌐', name: 'Long-Distance Bro-lationship', desc: 'Play an online match.', goal: 1, progress: s('m_online') },
  { id: 'online-wins-10', icon: '📶', name: 'Wi-Fi Warrior', desc: 'Win 10 online matches.', goal: 10, progress: s('w_online') },
];

/** achievements that just became complete (stamps them in the profile) */
export function checkAchievements(p: Profile, now = Date.now()): Achievement[] {
  const out: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (p.ach[a.id]) continue;
    if (a.progress(p) >= a.goal) {
      p.ach[a.id] = Math.floor(now / 1000);
      out.push(a);
    }
  }
  return out;
}

export function achievementCount(p: Profile): number {
  return ACHIEVEMENTS.filter((a) => p.ach[a.id]).length;
}
