// "Prime-Time Brawl": the story campaign. Six episodes of SMASH YOUR BROS LIVE!, each a run of segments (fights
// with a twist) and short comic scenes. 'you' in a scene is whichever fighter the player brought.
import type { PlayerCfg } from '../sim/types';

export interface Line {
  /** fighter id, 'max', 'cue', 'you', or 'crowd' */
  who: string;
  text: string;
}

export interface Foe {
  fighter: string;
  cpu: number;
  giant?: boolean;
  hpMult?: number;
  stocks?: number;
  /** same team as the players */
  ally?: boolean;
}

export interface StoryNode {
  id: string;
  title: string;
  blurb: string;
  stage: string;
  kind: 'fight' | 'survive' | 'ko' | 'boss';
  foes: Foe[];
  stocks?: number;
  time?: number;
  mods?: string[];
  items?: number;
  /** survive: seconds; ko: how many */
  target?: number;
  before?: Line[];
  after?: Line[];
}

export interface Episode {
  id: string;
  n: number;
  title: string;
  tagline: string;
  nodes: StoryNode[];
}

const grunt = (cpu = 3): Foe => ({ fighter: 'stagehand', cpu });

export const EPISODES: Episode[] = [
  {
    id: 'e1',
    n: 1,
    title: 'The Pilot',
    tagline: 'Gooood evening, galaxy!',
    nodes: [
      {
        id: 'e1n1',
        title: 'Warm-Up Round',
        blurb: 'KO 6 Stagehand Bots. They’re union, so be gentle. (Don’t be gentle.)',
        stage: 'studio',
        kind: 'ko',
        target: 6,
        foes: [grunt(2), grunt(2)],
        before: [
          { who: 'max', text: 'GOOOOD EVENING, GALAXY! I’m your host, Max Ratings, and THIS… is… SMASH YOUR BROS LIVE!' },
          { who: 'cue', text: '(holds up a sign that says APPLAUSE, then one that says LOUDER, then one that says PLEASE)' },
          { who: 'you', text: 'Where am I? Last thing I remember I was hugging my bro goodnight and then a big light went WOOSH.' },
          { who: 'max', text: 'You’ve been selected, champ! Nine billion viewers! One rule: smash your bros. Let’s warm up those biceps on my lovely crew!' },
        ],
        after: [
          { who: 'cue', text: 'Psst. Contestant. They’re not just crew. They’re my coworkers. I mean — great job! APPLAUSE!' },
        ],
      },
      {
        id: 'e1n2',
        title: 'Bro Meets Bro',
        blurb: 'Your first rival. Shake hands. Then don’t.',
        stage: 'studio',
        kind: 'fight',
        stocks: 2,
        foes: [{ fighter: 'granny', cpu: 4 }],
        before: [
          { who: 'granny', text: 'Ooh, look at you. Strong jaw, warm heart. Come here, sweetie bro, Granny’s got a hug for you.' },
          { who: 'you', text: 'Aw, really?' },
          { who: 'granny', text: 'It’s a piledriver, dear.' },
        ],
        after: [
          { who: 'granny', text: 'Good form, sweetie. You fight like someone who calls their bro every Sunday.' },
          { who: 'max', text: 'Look at that BROMANCE! Ratings are up four hundred percent! I feel… stronger. Weird. Anyway! Lightning round!' },
        ],
      },
      {
        id: 'e1n3',
        title: 'Lightning Round',
        blurb: 'Survive 40 seconds of Stagehand Bots. The clock is very dramatic.',
        stage: 'studio',
        kind: 'survive',
        target: 40,
        foes: [grunt(3), grunt(3), grunt(2)],
        items: 2,
      },
      {
        id: 'e1n4',
        title: 'The Judges’ Desk',
        blurb: 'The show’s “resident expert” is chained to the judges’ desk. Beat him to free him.',
        stage: 'studio',
        kind: 'fight',
        stocks: 2,
        foes: [{ fighter: 'hoot', cpu: 5 }],
        before: [
          { who: 'hoot', text: 'Ah, a new contestant. I’m obligated to destroy you. Contract clause nine. Please don’t take it personally — you have lovely posture.' },
          { who: 'you', text: 'Why are you chained to the desk?' },
          { who: 'hoot', text: 'Contract clause ten. Whooo reads these things? Let’s get this over with, bro.' },
        ],
        after: [
          { who: 'hoot', text: 'The chains are off! You freed me! I mean — I lost. But emotionally I won. You, my bro, are statistically excellent.' },
          { who: 'hoot', text: 'A word of warning: every time two bros fight on this show, the big camera glows. I don’t like that camera.' },
          { who: 'max', text: 'And THAT’S our pilot! Next week: we film ON LOCATION! Stay tuned, galaxy!' },
        ],
      },
    ],
  },
  {
    id: 'e2',
    n: 2,
    title: 'Rooftop Rumble',
    tagline: 'On location in Volume City.',
    nodes: [
      {
        id: 'e2n1',
        title: 'Tag-Team Tuesday',
        blurb: 'A 2-on-2. Your partner is Zippy, who has already told you you’re their best friend.',
        stage: 'rooftops',
        kind: 'fight',
        stocks: 2,
        foes: [{ fighter: 'zippy', cpu: 5, ally: true }, { fighter: 'clank', cpu: 5 }, { fighter: 'kit', cpu: 5 }],
        before: [
          { who: 'zippy', text: 'HI! I’m Zippy! We’re partners! I ran here at three hundred kilometres an hour to tell you you look great! You look GREAT!' },
          { who: 'clank', text: 'Hark! Fair challengers! Lance and I shall duel thee most honourably. Then hug thee. Then duel thee again.' },
          { who: 'kit', text: 'Co-pilot! I’m gonna beat you so hard. With love. With so much love.' },
        ],
        after: [{ who: 'zippy', text: 'We WON! High five! Again! Again! Okay one more! I love this! I love YOU!' }],
      },
      {
        id: 'e2n2',
        title: 'Four-Bro Free-For-All',
        blurb: 'Everybody against everybody. Classic.',
        stage: 'rooftops',
        kind: 'fight',
        stocks: 2,
        items: 2,
        foes: [{ fighter: 'clank', cpu: 5 }, { fighter: 'zippy', cpu: 5 }, { fighter: 'kit', cpu: 5 }],
      },
      {
        id: 'e2n3',
        title: 'Sponsor’s Challenge',
        blurb: 'Today’s sponsor is Mega Protein. Today’s opponent ate a lot of it.',
        stage: 'rooftops',
        kind: 'fight',
        stocks: 1,
        foes: [{ fighter: 'bouldar', cpu: 5, giant: true, hpMult: 1.5 }],
        before: [
          { who: 'bouldar', text: 'Bouldar drank… sponsor drink. Bouldar now… very big. Bouldar sorry in advance, small pebble friend.' },
        ],
        after: [{ who: 'bouldar', text: 'You strong. Bouldar give you fist bump. (The building shakes.) Bouldar think you very pebble.' }],
      },
      {
        id: 'e2n4',
        title: 'Shadow on the Rooftops',
        blurb: 'Someone has been sabotaging the camera crew. She’s fast and she does not want to talk about her feelings.',
        stage: 'rooftops',
        kind: 'fight',
        stocks: 2,
        foes: [{ fighter: 'vesper', cpu: 5 }],
        before: [
          { who: 'vesper', text: 'Don’t look at me. I’m not here. I definitely did not write you a poem.' },
          { who: 'you', text: 'You wrote me a poem?' },
          { who: 'vesper', text: '…It rhymes "bro" with "bro." Fight me.' },
        ],
        after: [
          { who: 'vesper', text: 'Fine. You win. Here’s the truth: I’ve been cutting the camera cables. That camera… it drinks something. Every time we hug, it glows.' },
          { who: 'max', text: 'HA-HA! Whatever is she talking about! Commercial break!' },
        ],
      },
    ],
  },
  {
    id: 'e3',
    n: 3,
    title: 'Sea-son of Love',
    tagline: 'The romance episode. On a boat.',
    nodes: [
      {
        id: 'e3n1',
        title: 'Couples Round',
        blurb: 'Team up with Granny against the ship’s cook and the tide-witch. It’s very romantic. It’s a wrestling match.',
        stage: 'galleon',
        kind: 'fight',
        stocks: 2,
        foes: [{ fighter: 'granny', cpu: 5, ally: true }, { fighter: 'chef', cpu: 5 }, { fighter: 'coral', cpu: 5 }],
        before: [
          { who: 'max', text: 'Welcome to the ROMANCE episode! Bros, look deep into each other’s eyes… now PUNCH.' },
          { who: 'chef', text: 'Magnifique! The sea air, the sunset, the beautiful bros! I have prepared a five-course KO.' },
          { who: 'coral', text: 'Dude-bro. The tides told me you’d come. The tides are also kind of into you. Just saying.' },
        ],
      },
      {
        id: 'e3n2',
        title: 'Cannonball Storm',
        blurb: 'Survive 45 seconds while the "special effects team" drops meteors on the deck.',
        stage: 'galleon',
        kind: 'survive',
        target: 45,
        mods: ['meteors'],
        foes: [grunt(4), grunt(3)],
      },
      {
        id: 'e3n3',
        title: 'Wipeout',
        blurb: 'Coral challenges you to a one-on-one. She promises to go easy. She is lying.',
        stage: 'galleon',
        kind: 'fight',
        stocks: 2,
        foes: [{ fighter: 'coral', cpu: 5 }],
        after: [{ who: 'coral', text: 'Gnarly wipeout, bro. But for real — the tide’s been pulling toward that big camera all week. Bad vibes.' }],
      },
      {
        id: 'e3n4',
        title: 'Kitchen Nightmare',
        blurb: 'Chef Flambé refuses to let you leave hungry.',
        stage: 'galleon',
        kind: 'fight',
        stocks: 2,
        items: 2,
        foes: [{ fighter: 'chef', cpu: 6 }],
        after: [
          { who: 'chef', text: 'You cleaned your plate! I am weeping! It is the onions! It is also you! Come, we cook for everyone!' },
          { who: 'cue', text: '(quietly holds up a sign that says HELP, then quickly flips it to say APPLAUSE)' },
        ],
      },
    ],
  },
  {
    id: 'e4',
    n: 4,
    title: 'Space Bros',
    tagline: 'Filmed in orbit. Somehow.',
    nodes: [
      {
        id: 'e4n1',
        title: 'Zero-G Rumble',
        blurb: 'Low gravity free-for-all. Float like a bro, sting like a bro.',
        stage: 'orbit',
        kind: 'fight',
        stocks: 2,
        mods: ['lowgrav'],
        foes: [{ fighter: 'nimbus', cpu: 5 }, { fighter: 'kit', cpu: 5 }, { fighter: 'amp', cpu: 5 }],
        before: [
          { who: 'nimbus', text: 'Don’t look at me, I’m misting up. Everyone’s so nice in space. You’re all so cumulonimbus.' },
          { who: 'amp', text: 'One, two, three, four — I LOVE YOU BRO — okay let’s fight!' },
        ],
      },
      {
        id: 'e4n2',
        title: 'Message From Tomorrow',
        blurb: 'A courier from the future needs to talk to you. By fighting you. It makes sense in the future.',
        stage: 'orbit',
        kind: 'fight',
        stocks: 2,
        foes: [{ fighter: 'echo', cpu: 6 }],
        before: [
          { who: 'echo', text: 'I’ve lived this moment forty times. You’re cute every time. Okay, spoilers: the finale goes badly unless we team up.' },
          { who: 'you', text: 'Then why are we fighting?' },
          { who: 'echo', text: 'Because the camera has to see it. Trust me. I’m from Thursday.' },
        ],
      },
      {
        id: 'e4n3',
        title: 'Upside-Down Circus',
        blurb: 'Inverta’s act. Gravity is optional and so is the camera staying the right way up.',
        stage: 'orbit',
        kind: 'fight',
        stocks: 2,
        mods: ['topsy'],
        foes: [{ fighter: 'inverta', cpu: 6 }],
        before: [{ who: 'inverta', text: 'Is it hot in here or did I flip the gravity on your heart, bro? (It’s me. I did that.)' }],
      },
      {
        id: 'e4n4',
        title: 'Station Lockdown',
        blurb: 'KO 12 Stagehand Bots before they lock you in the airlock.',
        stage: 'orbit',
        kind: 'ko',
        target: 12,
        foes: [grunt(4), grunt(4), grunt(3)],
        after: [
          { who: 'echo', text: 'You did it. In timeline thirty-one you didn’t, and Max ate everyone’s friendships. Like a buffet. So. Good job.' },
          { who: 'max', text: 'Next week: the episode where NOTHING unexpected happens! Totally scripted! Stay tuned!' },
        ],
      },
    ],
  },
  {
    id: 'e5',
    n: 5,
    title: 'Off-Script',
    tagline: 'The episode where it all goes wrong (right).',
    nodes: [
      {
        id: 'e5n1',
        title: 'Graffiti Gauntlet',
        blurb: 'Smudge paints the rooftops. Standing in their paint slows you down. Standing in your bro’s heart speeds you up.',
        stage: 'rooftops',
        kind: 'fight',
        stocks: 2,
        foes: [{ fighter: 'smudge', cpu: 7 }],
        before: [{ who: 'smudge', text: 'Hold still, bro. No— the other side. Your good side. They’re all your good side.' }],
      },
      {
        id: 'e5n2',
        title: 'Drop the Beat',
        blurb: 'Tempo’s set. Watch for the beat — and dodge it.',
        stage: 'studio',
        kind: 'fight',
        stocks: 2,
        foes: [{ fighter: 'tempo', cpu: 7 }],
        before: [{ who: 'tempo', text: 'Is this a bop or is it just you, bro? BPM: Bros Per Minute. I’m at a hundred and twenty.' }],
      },
      {
        id: 'e5n3',
        title: 'Three-on-One',
        blurb: 'Max sends three of your friends at once. “For the ratings.”',
        stage: 'studio',
        kind: 'fight',
        stocks: 2,
        foes: [{ fighter: 'kit', cpu: 6 }, { fighter: 'clank', cpu: 6 }, { fighter: 'zippy', cpu: 6 }],
        before: [
          { who: 'kit', text: 'Co-pilot, I don’t wanna do this.' },
          { who: 'max', text: 'Do it or you’re all ELIMINATED! Which means… nothing bad! Ha! Go!' },
        ],
      },
      {
        id: 'e5n4',
        title: 'Cue’s Big Moment',
        blurb: 'Cue finally speaks up. Security does not like it. Three giant Stagehand Bots.',
        stage: 'studio',
        kind: 'fight',
        stocks: 1,
        foes: [
          { fighter: 'stagehand', cpu: 6, giant: true, hpMult: 1.3 },
          { fighter: 'stagehand', cpu: 6, giant: true, hpMult: 1.3 },
        ],
        before: [
          { who: 'cue', text: 'I CAN’T HOLD THESE SIGNS ANY MORE. The big camera — The Big BROadcast — it eats bro-energy. Every hug, every high five.' },
          { who: 'cue', text: 'It turns your friendships into ratings, and the ratings make Max stronger. He’s never had a bro. He wants ALL of them.' },
          { who: 'you', text: 'So every time we fight each other, we feed him.' },
          { who: 'cue', text: 'Yes. Also I would like a bro. Not now. Later. Security’s here. Bye!' },
        ],
        after: [
          { who: 'hoot', text: 'Then we stop fighting each other. We fight together. Live. In front of everyone.' },
          { who: 'vesper', text: 'I’ll cut the feed. You go on stage. …I wrote you another poem. It’s about teamwork.' },
        ],
      },
    ],
  },
  {
    id: 'e6',
    n: 6,
    title: 'Season Finale: The Big BROadcast',
    tagline: 'Pull the plug.',
    nodes: [
      {
        id: 'e6n1',
        title: 'Max Ratings, Live',
        blurb: 'The host himself. Armoured, smug, and very well lit.',
        stage: 'studio',
        kind: 'fight',
        stocks: 2,
        foes: [{ fighter: 'max', cpu: 7, hpMult: 1, stocks: 3 }],
        before: [
          { who: 'max', text: 'You’re going OFF-SCRIPT? On MY show? Do you know what you’re throwing away? Fame! Fortune! A complimentary tote bag!' },
          { who: 'you', text: 'You know what, Max? You can’t buy a bro.' },
          { who: 'max', text: 'Watch me. CAMERA! ROLL!' },
        ],
      },
      {
        id: 'e6n2',
        title: 'The Big BROadcast',
        blurb: 'The giant camera wakes up. Hit the lens. Bring everyone you love.',
        stage: 'studio',
        kind: 'boss',
        stocks: 3,
        foes: [{ fighter: 'max', cpu: 1 }, grunt(4), grunt(4)],
        before: [
          { who: 'max', text: 'Fine. FINE. If I can’t have your friendship, I’ll take the WHOLE GALAXY’S. Big BROadcast… go live!' },
          { who: 'crowd', text: '(nine billion viewers gasp in unison)' },
        ],
        after: [
          { who: 'cue', text: 'The feed’s down! The bro-energy’s going home! Every world, every bro, all at once!' },
          { who: 'max', text: '…I just wanted someone to say “good show, bro.”' },
          { who: 'you', text: 'Good show, bro.' },
          { who: 'max', text: '(his screen shows a single pixel tear) …Season two?' },
          { who: 'cue', text: '(holds up a sign that says THE END, then one that says SEASON TWO?, then one that says BRO)' },
        ],
      },
    ],
  },
];

export function allNodes(): StoryNode[] {
  return EPISODES.flatMap((e) => e.nodes);
}

export function nodeById(id: string): StoryNode | undefined {
  return allNodes().find((n) => n.id === id);
}

/** the next node to play (first not cleared) */
export function nextNode(cleared: string[]): StoryNode | undefined {
  return allNodes().find((n) => !cleared.includes(n.id));
}

export function unlockedNode(cleared: string[], id: string): boolean {
  const all = allNodes();
  const i = all.findIndex((n) => n.id === id);
  return i <= 0 || cleared.includes(all[i - 1].id) || cleared.includes(id);
}

/** enemies for a node as player configs, scaled for the number of humans */
export function foeConfigs(n: StoryNode, humans: number): PlayerCfg[] {
  const scale = 1 + (humans - 1) * 0.35;
  return n.foes.map((f) => ({
    fighter: f.fighter,
    color: 0,
    team: f.ally ? 0 : 1,
    cpu: f.cpu,
    name: f.fighter,
    tapJump: false,
    giant: f.giant,
    hpMult: (f.hpMult ?? 1) * (f.ally ? 1 : scale),
    kbTakenMult: f.ally ? 1 : 1 / Math.sqrt(scale),
    grunt: f.fighter === 'stagehand' && n.kind !== 'fight' ? true : undefined,
    boss: n.kind === 'boss' && f.fighter === 'max' ? 'broadcast' : undefined,
    stocks: f.stocks,
    armor: f.fighter === 'max' ? 5 : undefined,
  }));
}
