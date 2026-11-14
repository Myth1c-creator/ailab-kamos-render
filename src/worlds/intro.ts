// World 1, the intro (film 0-369, 0.000-6.158 s). Every hard change on the song's beats (timing.ts T), the words on Jana's words:
//   0.000  frame 0 is already flying: video 1 in 2.5D (the face layer cut out in front of the blurred background, parallax), a fast push-in,
//          flash + CA + a burst of lime particles, a scan line; 0.200 KÁMOŠ, 0.717 MYSLEL, 1.175 ŽE JE, 1.384 SKUTEČNÁ (lime)
//   0.100 punch + glitch · 0.707 / 1.317 / 1.917 (beats) hard cuts (the face macro, wide tilted, the face pushing), glitch 3 f
//   2.336  A NENÍ!: the video freezes, flash 2 f + RGB split + shake, the face breaks into lime wireframe + 700 particles and re-forms (24 f)
//   2.824  the frozen video shrinks into a card (the card goes on playing above the panel from 3.131)
//   3.131  (beat) whip into the 3D prompt panel (>= 75 % of the width, head-on), the prompt is typed, the camera follows the caret, cuts on
//          3.737 / 4.343 / 4.949 (the click on Generovať) · 3.462 JEDEN · 3.799 PROMPT
//   5.191  the music dies (tape-stop) · 5.215 UDĚLAL: the card flies out of the panel at the camera, the panel dims · 5.261 blackout: only the
//          lime outline + the blinking cursor · 5.633 VIDEO · until the drop (6.161, world 2)
// Every word is screen-anchored (common.ts place); camera keys are in seconds and checked by assertSorted().
import * as THREE from "three";
import type { World } from "../three/shot3d";
import { BG, LIME, V, aim, bursts, canvas, clamp, env, glowSprite, glowTex, imgTex, inCubic, lerp, outBack, place, placeCam, pulse, streak, type Burst, type Imp } from "./common";
import { S, T } from "./timing";
import { FOCUS, type Key, type Media, type Src } from "./media";
import { lightShards, plateTex } from "./shapes";
import { D, mkPic, word3 } from "./kit";
import { assertSorted, camAt, pxWorld, showW, smooth, stage, type CamKey, type St } from "./util";
import { mkLayer, OV } from "./layers";
import { mkPanel } from "./panel";

const st = (dx: number, dy: number, z: number, roll = 0, ry = 0, rx = 0): St => ({ p: [dx, dy], s: [0, 0], z, roll, ry, rx });
const sf = (n: number) => n / 60; // frames -> seconds (a key time is S.x or S.x + sf(n), never S.x + n)

// the hook's camera (px offset of the face layer, the frame's zoom, roll, yaw, pitch): it never stands (dz / dr drift on every key)
const KH: CamKey[] = assertSorted("hook", [
  { t: 0, st: st(0, -40, 1.6, 0.07, -0.1, 0.05), dz: 1.0, dr: -0.12 }, // frame 0 already flying in, fast push
  { t: S.punch0, st: st(-20, 30, 2.0, -0.04, 0.08, -0.03), dz: 0.8, dr: 0.08 }, // punch on beat 0
  { t: S.cutA, st: st(30, 0, 2.1, 0.06, -0.08, 0.03), dz: 0.5, dr: -0.04 }, // CUT A: the face
  { t: S.cutB, st: st(-50, 90, 1.45, -0.06, 0.12, -0.04), dz: 0.9, dr: 0.06 }, // CUT B: wide, tilted
  { t: S.cutC, st: st(30, 20, 2.0, 0.05, -0.08, 0.03), dz: 0.6, dr: -0.05 }, // CUT C: the face, pushing
  { t: S.neni, st: st(0, -10, 2.2, 0, 0.04, 0), dz: 0.3, dr: 0.03 }, // the freeze: the picture stops, the camera does not
]);
// the prompt panel's camera (the panel is 840 px * zoom wide: offset, zoom, roll, yaw, pitch); it follows the caret
const KP: CamKey[] = assertSorted("panel", [
  { t: S.panel, st: st(0, 10, 1.0, 0.015, -0.07, 0.03), dz: 0.1, dr: -0.02 },
  { t: S.p1, st: st(-20, -25, 1.1, -0.02, 0.06, -0.02), dz: 0.1, dr: 0.02 },
  { t: S.p2, st: st(15, 25, 1.04, 0.02, -0.06, 0.03), dz: 0.12, dr: -0.025 },
  { t: S.p3, st: st(-10, -10, 1.12, -0.015, 0.05, 0), dz: 0.1, dr: 0.02 },
]);

const IMPS: Imp[] = [
  { t: -0.03, power: 1.2 }, { t: S.punch0, power: 0.7 }, { t: S.kamos, power: 0.4 }, { t: S.cutA, power: 0.8 }, { t: S.mysl, power: 0.35 }, { t: S.zeje, power: 0.3 },
  { t: S.skut, power: 0.45 }, { t: S.cutB, power: 0.8 }, { t: S.cutC, power: 0.8 }, { t: S.neni, power: 1.3 }, { t: S.shrink, power: 0.5 }, { t: S.panel, power: 1.0 },
  { t: S.p1, power: 0.6 }, { t: S.jeden, power: 0.4 }, { t: S.prompt, power: 0.3 }, { t: S.p2, power: 0.6 }, { t: S.p3, power: 0.7 }, { t: S.udelal, power: 0.9 }, { t: S.video, power: 0.4 },
];
export const introSamples = (f: number) => {
  const near = (a: number, r0: number, r1: number) => f >= a - r0 && f <= a + r1;
  if (f < 8 || [T.punch0, T.cutA, T.cutB, T.cutC, T.panel, T.p1, T.p2, T.p3].some((a) => near(a, 1, 5)) || near(T.neni, 0, 26) || near(T.shrink, 0, 22) || near(T.udelal, 0, 24)) return 24;
  return 12;
};

// the oval that lets the face layer through (white inside, black outside; the face layer's alphaMap)
function maskTex() {
  const c = canvas(256, 256);
  const x = c.getContext("2d")!;
  x.fillStyle = "#000";
  x.fillRect(0, 0, 256, 256);
  const g = x.createRadialGradient(128, 128, 20, 128, 128, 128);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.6, "#fff");
  g.addColorStop(1, "#000");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  const t = imgTex(c, false);
  t.center.set(0.5, 0.5);
  return t;
}

// the layout of the words (px, centre x 540): widths at rest <= 620 so that a 5 % punch + the slam peak keep >= 150 px from the edges
export const WIN = { W: 620, gap: 30 };

export function buildIntro(M: Media, SR: Record<Key, Src>): World {
  const { scene, camera, base, grid, BK, lights } = stage(new THREE.Color(BG));
  const [FX, FY] = FOCUS.h1;
  // ── the hook: the background layer (blurred by the DOF, moves less) and the face layer (an oval cut-out, moves more) ──
  const mask = maskTex();
  const bg = mkLayer(scene, SR.h1, 0, D + 0.6); // ONE flat full-frame layer (no cut-out face, no parallax): only the camera moves
  const face = mkLayer(scene, SR.h1, 1, D + 0.6, mask);
  const shr = mkLayer(scene, SR.h1, 2, D + 0.3); // the frozen frame shrinking into the card
  const scan = streak(1100, 120);
  scene.add(scan.mesh);
  // the breakup: a lime wireframe over the face + particles that scatter and come home
  const wire = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 16, 22), new THREE.MeshBasicMaterial({ color: LIME, wireframe: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  wire.visible = false;
  scene.add(wire);
  const w0 = (wire.geometry.getAttribute("position") as THREE.BufferAttribute).array.slice() as Float32Array;
  const NP = 700;
  const pg = new THREE.BufferGeometry();
  const ppos = new Float32Array(NP * 3);
  pg.setAttribute("position", new THREE.BufferAttribute(ppos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: LIME, size: 0.034, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  pts.frustumCulled = false;
  pts.visible = false;
  scene.add(pts);
  const hp = Array.from({ length: NP }, (_, i) => {
    const r = Math.sqrt((i * 0.6180339) % 1), a = i * 2.39996;
    return [r * Math.cos(a), r * Math.sin(a), Math.sin(i * 12.9898) * 0.5 + 0.5, Math.sin(i * 78.233) * 0.5 + 0.5];
  });
  const LS = lightShards(60, "in", 1);
  scene.add(LS.group);
  // ── the card (video 1 going on) and the prompt panel ──
  const card = mkPic(scene, SR.h1b, 9 / 16, { depth: 0.04, corners: true });
  const panel = mkPanel(scene);
  const cursor = glowSprite(glowTex("rgba(255,255,255,0.95)", "rgba(198,255,0,0.6)", "rgba(198,255,0,0)"));
  cursor.scale.setScalar(0.1);
  panel.g.add(cursor);
  // ── words ──
  const lime = (s: string) => word3(M, scene, s, LIME, "#4f6600", 0.85, 0.35);
  const wK = word3(M, scene, "KÁMOŠ"), wM = word3(M, scene, "MYSLEL"), wZ = word3(M, scene, "ŽE JE"), wS = lime("SKUTEČNÁ");
  const wN = lime("A NENÍ!");
  const wJ = word3(M, scene, "JEDEN"), wP = lime("PROMPT"), wU = word3(M, scene, "UDĚLAL"), wV = lime("VIDEO");
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: plateTex(), transparent: true, opacity: 0, depthWrite: false }));
  plate.renderOrder = 5;
  scene.add(plate);
  const BL: Burst[] = [{ t: 0.02, at: V(0, 0, 1.4), power: 2.0, lime: 0.7, up: 1 }, { t: S.cutA, at: V(0, 0, 1.4), power: 1.4, lime: 0.7 }, { t: S.neni, at: V(0, 0.2, 1.4), power: 2.0, lime: 0.9 },
    { t: S.panel, at: V(0, 0, 1.4), power: 1.4, lime: 0.8 }, { t: S.udelal, at: V(0, 0.3, 1.4), power: 1.6, lime: 0.8 }];
  const BU = bursts(BL, 80, 0.022, "ib");
  scene.add(BU.points);
  // the stacked lines of a block of words: the y of each centre from the top of the stack, and the block's centre
  const stack = (ws: { w: number; h: number }[], wpx: number[], top: number, gap = WIN.gap) => {
    let y = top;
    const cs = ws.map((w, i) => {
      const hp_ = (w.h * wpx[i]) / w.w;
      const c = y + hp_ / 2;
      y += hp_ + gap;
      return c;
    });
    return { cs, mid: (top + y - gap) / 2, span: y - gap - top };
  };
  const W = WIN.W;
  const H4 = stack([wK, wM, wZ, wS], [W, W, W, W], 1100);
  const HN = stack([wN], [W], 1200);
  const HJ = stack([wJ, wP], [W, W], 1340), HU = stack([wU, wV], [W, W], 1340);
  const bumpD = 24; // frames of the breakup
  const bump = (t: number) => (t >= S.neni && t < S.neni + sf(bumpD) ? Math.sin((Math.PI * (t - S.neni)) / sf(bumpD)) : 0);
  const CARD = { x: 540, y: 400, w: 330 };

  const update = (t: number) => {
    const f60 = t * 60;
    const dk = t >= S.black ? 1 : 0; // the blackout
    const hookOn = t < S.shrink, shrinkOn = t >= S.shrink && t < S.panel, cardOn = t >= S.panel && t < S.udelal + 0.36, panelOn = t >= S.panel - sf(6);
    const roll0 = 0.012 * Math.sin(t * 1.1);
    aim(base, V(0, 0, 6), V(0, 0, 0), 36, roll0);
    placeCam(camera, V(0.05 * Math.sin(t * 0.9), 0.04 * Math.sin(t * 0.7), 6), V(0, 0, 0), 36, roll0, t, IMPS, dk ? 0.004 : 0.008);
    lights(dk ? 0.3 : 1);
    (scene.background as THREE.Color).set(dk ? "#000000" : BG);
    grid.mesh.visible = !dk;
    place(grid.mesh, base, 540, 960, grid.W, 1, D + 3, [0, 0, 0]);
    grid.set(t, 90, -150, "graphite", 1.3);
    BK.update(t);
    BK.mat.opacity = 0.45;
    BK.points.visible = !dk;
    BU.update(t);
    const bp = bump(t);
    // the video: plays from frame 0 at 30 fps, freezes at 2.336 (A NENÍ!), is shown by the layers, then by the card (h1b)
    SR.h1.play(Math.min(t, S.neni), 0, 1, 30);
    SR.h1b.play(t, S.panel, 1, 30);

    // ── the hook ──
    const cs = camAt(t, KH);
    const rx_ = 250 * cs.z, ry_ = 340 * cs.z;
    mask.repeat.set(Math.max(0.2, (0.5 * 1080 * OV) / rx_), Math.max(0.2, (0.5 * 1920 * OV) / ry_));
    const swim = 14 * Math.sin(t * 2.3);
    if (hookOn) {
      bg.set(base, Math.max(OV, cs.z), FX, FY, { dx: cs.p[0], dy: cs.p[1], roll: cs.roll, ry: cs.ry, rx: cs.rx, bright: 1 - 0.75 * bp + (bp > 0 ? 0.35 * Math.sin(f60 * 9) : 0) });
      face.hide();
    } else {
      bg.hide();
      face.hide();
    }
    // the shrink into the card (2.824-3.131): the frozen frame flies up to the card's place and turns
    if (shrinkOn) {
      const e = smooth(clamp((t - S.shrink) / (S.panel - S.shrink)));
      const k = CARD.w / (1080 * OV);
      shr.set(base, lerp(Math.max(OV, cs.z), OV, e), FX, FY, { dx: lerp(cs.p[0], CARD.x - 540, e), dy: lerp(cs.p[1], CARD.y - 960, e), sc: lerp(1, k, e), roll: lerp(cs.roll, 0.06, e), ry: lerp(cs.ry, -0.25, e) });
    } else shr.hide();
    scan.mesh.visible = hookOn && t > 0.1 && t < 0.85;
    if (scan.mesh.visible) {
      const u = (t - 0.1) / 0.75;
      place(scan.mesh, base, 540, lerp(520, 1400, u), 1200, 1, D - 0.5, [0, 0, -0.05]);
      scan.mat.opacity = 0.9 * Math.sin(Math.PI * u);
    }
    {
      // the breakup (2.336, 24 f): wireframe + particles around the face, then they come home
      const cx = 540 + cs.p[0], cy = 960 + cs.p[1] + swim, rxc = Math.min(rx_, 520), ryc = Math.min(ry_, 760);
      wire.visible = hookOn && bp > 0.02;
      pts.visible = wire.visible;
      if (wire.visible) {
        place(wire, base, cx, cy, 2 * rxc, 1, D - 0.5, [0, 0, cs.roll]);
        wire.scale.y *= ryc / rxc;
        (wire.material as THREE.MeshBasicMaterial).opacity = Math.min(1, bp * 1.4);
        const pa = wire.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < pa.count; i++) {
          const k = Math.sin(i * 12.9898 + f60 * 3.1);
          pa.setXYZ(i, w0[i * 3] * (1 + 0.5 * bp * k), w0[i * 3 + 1] * (1 + 0.4 * bp * k), bp * 0.6 * Math.sin(i * 7.7 + f60));
        }
        pa.needsUpdate = true;
        const P = pxWorld(base, D - 0.7), q = V();
        hp.forEach((h, i) => {
          const s = bp * (1.2 + 2.8 * h[2]);
          P(cx + h[0] * rxc * (1 + s) + (h[3] - 0.5) * 260 * bp, cy + h[1] * ryc * (1 + s * 0.8) + (h[2] - 0.5) * 300 * bp, q);
          ppos[i * 3] = q.x;
          ppos[i * 3 + 1] = q.y;
          ppos[i * 3 + 2] = q.z + bp * h[3] * 0.8;
        });
        pg.attributes.position.needsUpdate = true;
        (pts.material as THREE.PointsMaterial).opacity = Math.min(1, bp * 1.6);
      }
    }
    // the words of the hook (stacked low, in front of everything), then A NENÍ!
    const hEnd = S.neni - sf(2);
    showW(wK, base, t, S.kamos, hEnd, 540, H4.cs[0], W, { from: 1.08, punch: [S.cutA], seed: 0.4, d: D - 1.2 });
    showW(wM, base, t, S.mysl, hEnd, 540, H4.cs[1], W, { from: 1.08, punch: [S.cutA], seed: 1.1, d: D - 1.2 });
    showW(wZ, base, t, S.zeje, hEnd, 540, H4.cs[2], W, { from: 1.08, punch: [S.cutB], seed: 2.3, d: D - 1.2 });
    showW(wS, base, t, S.skut, hEnd, 540, H4.cs[3], W, { from: 1.08, punch: [S.cutB, S.cutC], seed: 0.7, d: D - 1.2 });
    showW(wN, base, t, S.neni, S.shrink + sf(6), 540, HN.cs[0], W, { from: 1.08, punch: [S.shrink], seed: 1.9, d: D - 1.2 });
    showW(wJ, base, t, S.jeden, S.udelal, 540, HJ.cs[0], W, { from: 1.08, punch: [S.p2], seed: 0.5, d: D - 1.2 });
    showW(wP, base, t, S.prompt, S.udelal, 540, HJ.cs[1], W, { from: 1.08, punch: [S.p3], seed: 2.2, d: D - 1.2 });
    showW(wU, base, t, S.udelal, S.drop, 540, HU.cs[0], W, { from: 1.08, punch: [S.video], seed: 0.9, d: D - 1.2 });
    showW(wV, base, t, S.video, S.drop, 540, HU.cs[1], W, { from: 1.08, punch: [S.video], seed: 1.6, d: D - 1.2 });
    {
      const blk = t < hEnd ? ([H4, S.kamos] as const) : t < S.panel ? ([HN, S.neni] as const) : t < S.udelal ? ([HJ, S.jeden] as const) : ([HU, S.udelal] as const);
      plate.visible = t >= S.kamos && t < S.drop;
      place(plate, base, 540, blk[0].mid, 1500, 1, D - 0.8);
      plate.scale.y = plate.scale.x * ((blk[0].span + 160) / 1500);
      (plate.material as THREE.MeshBasicMaterial).opacity = 0.7 * clamp((t - blk[1]) / 0.1) * (1 - 0.4 * dk);
    }

    // ── the card: above the panel, plays video 1; at UDĚLAL it flies out at the camera ──
    card.g.visible = cardOn;
    if (cardOn) {
      const a = t - S.panel, u = clamp((t - S.udelal) / 0.36);
      const pop = lerp(1.25, 1, outBack(clamp(a / sf(8)), 1.3));
      const fl = inCubic(u);
      place(card.g, base, CARD.x + 240 * fl, CARD.y - 700 * fl * fl + 12 * Math.sin(t * 2.4), CARD.w * pop + 1500 * fl, 1, D - 0.3, [0.05 * Math.sin(t * 1.7) + 0.6 * fl, 0.1 * Math.sin(t * 1.3) - 0.25 * (1 - fl) + 1.1 * fl, 0.06 + 0.04 * Math.sin(t * 1.9) + 0.9 * fl]);
    }

    // ── the prompt panel ──
    panel.g.visible = panelOn;
    if (panelOn) {
      const whipU = clamp((t - (S.panel - sf(6))) / sf(6));
      const k = camAt(t, KP);
      const typed = clamp((t - (S.panel + 0.1)) / (S.p3 - 0.06 - (S.panel + 0.1)));
      const n = panel.N * (typed * 0.85 + 0.15 * smooth(typed));
      const pressed = t >= S.p3 && t < S.udelal ? 1 : 0;
      panel.draw(n, pressed, Math.floor(t * 3.3) % 2 === 0 || t < S.p3);
      const enter = 1500 * (1 - smooth(whipU));
      const dim = clamp((t - S.udelal) / sf(3));
      // the camera follows the caret along the text
      const cp = panel.caret(n);
      place(panel.g, base, 540 + enter + k.p[0] - cp.x * 60, 1000 + k.p[1], 840 * k.z, 1, D, [k.rx + 0.015 * Math.sin(t * 1.3), k.ry + 0.03 * Math.sin(t * 1.7), k.roll]);
      panel.faceMat.color.setScalar(1 - dim);
      panel.rim.opacity = 0.25 + 0.3 * pulse(t, S.p1, 8) + 0.3 * pulse(t, S.p2, 8) + 0.5 * dim;
      panel.outline.opacity = 0.25 * (1 - dim) + 0.95 * dk * (0.7 + 0.3 * Math.sin(f60 * 0.4));
      cursor.position.copy(cp);
      cursor.scale.setScalar(dk ? 0.12 + 0.05 * Math.sin(f60 * 0.5) : 0.07 + 0.015 * Math.sin(t * 40));
      (cursor.material as THREE.MeshBasicMaterial).opacity = dk ? (Math.floor(t * 2.6) % 2 === 0 ? 1 : 0.35) : 1;
    }
    LS.update(t, t < S.panel ? S.neni : S.panel, V(0, 0.2, 1.3), 2.4, 0.6);

    // ── the grade ──
    const fl = f60 < 3 ? [0.2, 0.1, 0.04][Math.floor(f60)] : 0;
    const one = (t0: number, a: number, b = 0) => (t >= t0 && t < t0 + sf(1) ? a : t >= t0 + sf(1) && t < t0 + sf(2) ? b : 0);
    const gl = (t0: number, n = 3) => (t >= t0 && t < t0 + sf(n) ? 1 : 0);
    const glitch = Math.max(gl(S.punch0, 2), gl(S.cutA), gl(S.cutB), gl(S.cutC), gl(S.neni, 5), gl(S.panel, 3), gl(S.p1, 2), gl(S.p2, 2));
    return {
      focus: t < S.shrink ? D + 0.6 : D,
      ap: t < S.shrink ? 38 : 12,
      flash: Math.max(fl, one(S.punch0, 0.15), one(S.cutA, 0.3), one(S.cutB, 0.3), one(S.cutC, 0.3), one(S.neni, 0.9, 0.5), one(S.panel, 0.35), one(S.udelal, 0.4, 0.15), env(t, IMPS, 30) * 0.05) * (1 - dk),
      ca: 0.3 + env(t, IMPS, 14) * 1.3 + (f60 < 3 ? 3 : 0) + glitch * 2.8 + bp * 4 + (t >= S.neni && t < S.neni + sf(4) ? 4 : 0),
      glitch: glitch * 0.9,
      vig: 0.1 * dk,
    };
  };
  return { scene, camera, update };
}
