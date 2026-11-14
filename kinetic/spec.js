// spec.js: AI LAB "Kámoš tomu uvěřil" as a kinetic film, native 9:16, 60 fps, 99 BPM, 806 frames (13.433 s).
// The picture is one 3D film (src/Film.tsx: the intro 0-369 = video 1 in 2.5D, A NENÍ!, the card, the prompt panel, the tape-stop and the
// blackout; the drop 370-544 = video 2 / video 1 in nine cuts; the CTA 545-805 = two playing cards, the paper plane, POŠLI TO KÁMOŠOVI, the logo;
// rendered as public/hook/hook_###.jpg by the workflow's "hook" job) played full frame by Seq3D; every big word is inside the 3D. On top: the
// one-word captions in a white box (ad-captions: ../capwords.json in beats at 99 BPM; only where no big word is on screen). The engine adds
// bloom and grain (post.py, BLOOM_LOCAL=1). Cuts mirror src/worlds/timing.ts and mix.py; the mix itself is kinetic/audio/master.wav (mix.py),
// the cues here only feed info.json and the checks.
import { Seq3D } from './blocks.js';

const FPS = 60, FRAMES = 806, BPM = 99;
const capWords = await fetch('../capwords.json').then(r => r.json());
// the hard changes (timing.ts T, frames): the hook's cuts, A NENI!, the card, the panel whip and its cuts, the drop, the nine cuts (every beat /
// half beat), the CTA, the logo, the sweep
const cuts = [42, 79, 115, 140, 169, 188, 224, 261, 297, 313, 370, 406, 424, 442, 461, 479, 497, 515, 533, 545, 573, 697, 733].map(f => f / FPS);

export default {
  title: 'AI LAB – Kámoš tomu uvěřil',
  bpm: BPM, beats: FRAMES * BPM / 3600, fps: FPS,
  palette: { bg: '#0B0D10', paper: '#ECEEF0', accent: '#C6FF00', hot: '#FF2A2A', ink: '#0B0D10' },
  hud: false,
  cues: [],
  scenes: [
    [Seq3D, 0, FRAMES * BPM / 3600, { seq: '../public/hook/hook_', n: FRAMES, cuts }],
  ],
  captions: [],
  // one word at a time in a white box: [[word, beat0, beat1]] (ad-captions, ../capwords.json)
  capWords,
};
