// Every time of the film "Kámoš tomu uvěřil" (script.md v1; sound approved 2026-11-14). The film = the song cut from audio/cut.json
// (99 BPM, beat 0.606 s, DROP 6.161 = "a tohle taky") with Jana's ONE continuous take (audio/vo.wav, never moved; word times
// audio/vo-words.json: the 32 words of the take). Whole frames at 60 fps, TWO kinds of anchors:
//   - big words and labels come with Jana's words (WS(i)),
//   - hard changes (cuts, whips, flashes, punches, shakes) sit on the song's beats Bt(i) or half beats (+-1 f).
// Every camera key is written in SECONDS only (S.x or S.x + n / 60); util.ts assertSorted() throws when the keys are not ordered.
import words from "../../audio/vo-words.json";
import cut from "../../audio/cut.json";

export const FPS = 60;
export const FRAMES = 806; // 13.433 s = the cut's length
export const BPM = cut.bpm;
export const BEAT = cut.beat; // 0.606
export const fr = (f: number) => f / FPS;

type Word = { word: string; start: number; end: number };
const WD = words as Word[];
if (WD.length !== 32) throw new Error("vo-words.json: expected the 32 words of the take");
export const WS = (i: number) => Math.round(WD[i].start * FPS);
export const WE = (i: number) => Math.round(WD[i].end * FPS);
// the beats of cut.json (20) continued with the beat length
export const Bt = (i: number) => Math.round((i < cut.beats.length ? cut.beats[i] : cut.beats[cut.beats.length - 1] + (i - cut.beats.length + 1) * BEAT) * FPS);
export const Hb = (i: number) => Math.round((Bt(i) + Bt(i + 1)) / 2); // the half beat after beat i
export const DROP = Math.round(cut.drop * FPS); // 370
if (Bt(10) !== DROP) throw new Error("beat 10 must be the drop");

// world boundaries (first frame of each): the intro (hook, NENÍ, prompt, blackout) | the drop (video cuts) | the CTA + the logo
export const F = { drop: DROP, cta: WS(25) };

export const T = {
  // ── hook (0-139): video 1 in 2.5D, playing from frame 0 ──
  kamos: WS(0), //    12  0.200 KÁMOŠ
  mysl: WS(2), //     43  0.717 MYSLEL
  zeje: WS(3), //     70  1.175 ŽE JE
  skut: WS(5), //     83  1.384 SKUTEČNÁ (lime)
  punch0: Bt(0), //    6  beat: a punch + glitch (frame 0 is already in full effect)
  cutA: Bt(1), //     42  0.707 beat: hard cut to the face (macro)
  cutB: Bt(2), //     79  beat: cut wide, tilted
  cutC: Bt(3), //    115  beat: cut to the face, pushing
  // ── A NENÍ! (140-173): the video freezes, the face breaks into lime particles and re-forms ──
  neni: WS(7), //    140  2.336 NENÍ (lime): flash 2 f, shake, RGB split
  // ── the prompt (169-369) ──
  shrink: WS(8), //  169  2.824 the frozen video shrinks into a card
  panel: Bt(5), //   188  3.131 beat: whip into the 3D prompt panel (the card plays above it)
  jeden: WS(10), //  208  3.462 JEDEN
  prompt: WS(11), // 228  3.799 PROMPT
  p1: Bt(6), //      224  3.737 beat: camera cut
  p2: Bt(7), //      261  4.343 beat: camera cut
  p3: Bt(8), //      297  4.949 beat: camera cut + the click on the button
  tape: Math.round(5.191 * FPS), // 311 the music dies (tape-stop)
  udelal: WS(16), // 313  5.215 UDĚLAL: the card flies out of the panel, the panel dims
  black: Math.round(5.261 * FPS), //  316 blackout (only the lime cursor + the outline)
  video: WS(17), //  338  5.633 VIDEO
  // ── THE DROP (370 = 6.161): video 2 slams in, cuts on beats and half beats ──
  drop: DROP,
  tohle: WS(19), //  375  6.248 TOHLE (the word "A TOHLE" comes on the drop)
  taky: WS(20), //   394  6.562 TAKY! (lime)
  zadna: WS(21), //  427  7.119 ŽÁDNÁ
  kamera: WS(22), // 456  7.595 KAMERA
  zadny: WS(23), //  490  8.164 ŽÁDNÝ
  stab: WS(24), //   516  8.594 ŠTÁB
  xcam: 432, //          7.200 the camera icon is struck out
  xclap: 500, //         8.333 the clapperboard is struck out
  // ── the CTA (545 = 9.081) ──
  posli: WS(25), //  545  9.081 POŠLI TO
  kamosovi: WS(27), // 573 9.546 KÁMOŠOVI (lime)
  ktery: WS(28), //  605 10.091 KTERÝ BY
  tomu: WS(30), //   632 10.533 TOMU UVĚŘIL
  lockup: Bt(19), // 697 11.615 beat: the cards burst at the camera, the AI LAB logo slams in
  sweep: Bt(20), //  733 12.221 beat: a sweep over the logo
  calm: Bt(21) + 6, // 776 the clean end card
  end: FRAMES,
};
// the nine cuts of the drop (frame of each cut): the drop itself (one whole beat), then a cut on every half beat / beat
export const CUT = [DROP, Bt(11), Hb(11), Bt(12), Hb(12), Bt(13), Hb(13), Bt(14), Hb(14)];
export const S = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, v / FPS])) as Record<keyof typeof T, number>;
