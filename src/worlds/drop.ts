// World 2, THE DROP (film 370-544, 6.161-9.080 s): video 2 slams in and the picture cuts on every half beat / beat between video 2 and video 1
// (nine cuts, timing.ts CUT), every cut with its OWN transition (KIND below: flash slam, whip L, zoom-through, glitch slice, shatter, whip up,
// light leak, lime wipe, RGB smear). Every cut keeps moving (a push on the face, a drift, a roll, a punch on its beat); strobe on the last beats.
//   6.161 (drop) flash 4 f, shake 8 f, CA, a shock ring · A TOHLE (6.161) · TAKY! (6.562, lime)
//   7.119 ŽÁDNÁ · 7.200 the camera icon is struck out · 7.595 KAMERA · 8.164 ŽÁDNÝ · 8.333 the clapperboard is struck out · 8.594 ŠTÁB
// Camera keys are in seconds and checked by assertSorted(); the cuts' times are the song's beats / half beats (CUT).
import * as THREE from "three";
import type { World } from "../three/shot3d";
import { BG, INK, LIME, PAPER, V, aim, bursts, canvas, clamp, env, glowSprite, glowTex, imgTex, inCubic, lerp, outBack, outCubic, place, placeCam, pulse, streak, type Burst, type Imp } from "./common";
import { CUT, S, T } from "./timing";
import { CUTK, FOCUS, type Key, type Media, type Src } from "./media";
import { lightShards, ringTex, shardsOf } from "./shapes";
import { D, word3 } from "./kit";
import { assertSorted, showW, smooth, stage } from "./util";
import { mkLayer, OV, type LayerO } from "./layers";

const sf = (n: number) => n / 60;
const KIND = ["flash", "whipL", "zoom", "glitch", "shatter", "whipUp", "leak", "wipe", "smear"] as const;
export const TR = [4, 6, 8, 5, 14, 6, 12, 9, 8]; // frames of each incoming transition (prep_video.py mirrors this)
const TS = CUT.map((f) => f / 60); // the cuts' times (s)
assertSorted("drop cuts", TS.map((t) => ({ t })));

// each cut's own camera: a frame zoom on the face (push), a drift in px, a roll; every one moves, none stands
const Z0 = [1.6, 2.1, 2.3, 2.0, 2.2, 2.1, 2.3, 2.0, 2.2], DZ = [0.5, 0.9, 1.1, 0.8, 1.0, 0.9, 1.1, 0.8, 1.0];
const X0 = [0, 50, -40, 40, -50, 30, -40, 50, -30], VX = [60, -110, 100, -90, 100, -80, 90, -100, 80];
const Y0 = [20, -40, 30, -30, 40, -20, 30, -40, 20], VY = [-40, 80, -60, 70, -80, 60, -70, 80, -60];
const R0 = [0.02, -0.05, 0.06, -0.04, 0.05, -0.06, 0.04, -0.05, 0.06], VR = [-0.05, 0.14, -0.12, 0.12, -0.14, 0.12, -0.12, 0.14, -0.1];
const cutCam = (i: number, t: number): { z: number; o: LayerO } => {
  const a = Math.max(0, t - TS[i]);
  return { z: Z0[i] + DZ[i] * a + 0.22 * Math.exp(-11 * a), o: { dx: X0[i] + VX[i] * a, dy: Y0[i] + VY[i] * a, roll: R0[i] + VR[i] * a } };
};

const IMPS: Imp[] = [
  { t: S.drop, power: 1.6 }, ...TS.slice(1).map((t, i) => ({ t, power: 0.55 + 0.05 * i })), { t: S.taky, power: 0.9 }, { t: S.zadna, power: 0.5 }, { t: S.xcam, power: 0.5 },
  { t: S.kamera, power: 0.45 }, { t: S.zadny, power: 0.5 }, { t: S.xclap, power: 0.5 }, { t: S.stab, power: 0.5 },
];
export const dropSamples = (f: number) => {
  const near = (a: number, r0: number, r1: number) => f >= a - r0 && f <= a + r1;
  if (CUT.some((c, i) => near(c, 1, TR[i] + 2)) || near(T.taky, 0, 6)) return 24;
  return 14;
};

// the camera icon and the clapperboard (paper line icons, 256 px) and the lime X that strikes them out
function iconTex(kind: "cam" | "clap") {
  const c = canvas(256, 256);
  const x = c.getContext("2d")!;
  x.strokeStyle = PAPER;
  x.fillStyle = PAPER;
  x.lineWidth = 12;
  x.lineJoin = "round";
  x.lineCap = "round";
  if (kind === "cam") {
    x.beginPath();
    x.roundRect(30, 84, 196, 126, 24);
    x.stroke();
    x.beginPath();
    x.arc(128, 148, 36, 0, 7);
    x.stroke();
    x.beginPath();
    x.roundRect(92, 56, 72, 28, 8);
    x.stroke();
    x.beginPath();
    x.arc(196, 112, 8, 0, 7);
    x.fill();
  } else {
    x.beginPath();
    x.roundRect(34, 110, 188, 112, 10);
    x.stroke();
    x.beginPath();
    x.moveTo(34, 110);
    x.lineTo(50, 52);
    x.lineTo(222, 82);
    x.lineTo(222, 110);
    x.stroke();
    for (const k of [0, 1, 2, 3]) {
      x.beginPath();
      x.moveTo(62 + k * 42, 110);
      x.lineTo(84 + k * 42, 62);
      x.stroke();
    }
  }
  return imgTex(c);
}
function xTex() {
  const c = canvas(256, 256);
  const x = c.getContext("2d")!;
  x.shadowColor = LIME;
  x.shadowBlur = 20;
  x.strokeStyle = LIME;
  x.lineWidth = 24;
  x.lineCap = "round";
  x.beginPath();
  x.moveTo(40, 40);
  x.lineTo(216, 216);
  x.moveTo(216, 40);
  x.lineTo(40, 216);
  x.stroke();
  return imgTex(c);
}
const mk = (geo: THREE.BufferGeometry, mat: THREE.Material) => new THREE.Mesh(geo, mat);

export function buildDrop(M: Media, SR: Record<Key, Src>): World {
  const { scene, camera, base, grid, BK, lights } = stage(new THREE.Color(BG));
  const L = CUTK.map((k, i) => mkLayer(scene, SR[k], i, D + 0.9, undefined, false));
  // ── transition pieces: shards of cut 4 (index 3), the light leak, the lime wipe bar, the shock rings ──
  const shMat = new THREE.MeshBasicMaterial({ map: L[3].mat.map, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const shG = new THREE.Group();
  shG.visible = false;
  scene.add(shG);
  const sh = shardsOf(1, 16 / 9, 6, 10, "ph").map((s, i) => {
    const m = mk(s.geo, shMat);
    m.renderOrder = 60;
    shG.add(m);
    const k = Math.sin(i * 12.9898) * 0.5 + 0.5, k2 = Math.sin(i * 78.233) * 0.5 + 0.5;
    return { m, c: s.c, v: V(s.c.x * (2 + 3 * k), s.c.y * (2 + 3 * k) + 0.5 * k2, 0.8 + 2.4 * k2), spin: V(k * 10 - 5, k2 * 10 - 5, k * 8 - 4) };
  });
  const leak = glowSprite(glowTex("rgba(255,244,214,1)", "rgba(255,170,70,0.75)", "rgba(255,110,30,0)"));
  leak.renderOrder = 70;
  leak.visible = false;
  scene.add(leak);
  const bar = mk(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: LIME, transparent: true, depthWrite: false }));
  bar.renderOrder = 71;
  bar.visible = false;
  scene.add(bar);
  const barS = streak(1, 1, "#ffffff");
  barS.mesh.renderOrder = 72;
  scene.add(barS.mesh);
  const ring = mk(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  ring.renderOrder = 73;
  scene.add(ring);
  const LS = lightShards(70, "dr", 1);
  scene.add(LS.group);
  const BL: Burst[] = [{ t: S.drop, at: V(0, 0, 1.4), power: 2.4, lime: 0.6, up: 1.2 }, ...TS.slice(1).map((t) => ({ t, at: V(0, 0, 1.4), power: 0.9, lime: 0.6 })), { t: S.taky, at: V(0, -0.2, 1.4), power: 1.6, lime: 0.7 }];
  const BU = bursts(BL, 60, 0.022, "db");
  scene.add(BU.points);
  // ── words and icons ──
  const lime = (s: string) => word3(M, scene, s, LIME, "#4f6600", 0.85, 0.35);
  const wA = word3(M, scene, "A TOHLE"), wT = lime("TAKY!");
  const wZ1 = word3(M, scene, "ŽÁDNÁ"), wK = lime("KAMERA"), wZ2 = word3(M, scene, "ŽÁDNÝ"), wS = lime("ŠTÁB");
  const icon = (kind: "cam" | "clap") => {
    const g = new THREE.Group();
    const i = mk(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: iconTex(kind), transparent: true, depthWrite: false }));
    const xx = mk(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: xTex(), transparent: true, depthWrite: false }));
    xx.position.z = 0.01;
    g.add(i, xx);
    g.visible = false;
    g.name = `label:icon-${kind}`;
    scene.add(g);
    return { g, x: xx };
  };
  const icCam = icon("cam"), icClap = icon("clap");
  const W = 620;
  const hpx = (w: { w: number; h: number }) => (w.h * W) / w.w;
  const topA = 1190, yA = topA + hpx(wA) / 2, yT = topA + hpx(wA) + 30 + hpx(wT) / 2; // A TOHLE / TAKY!
  const yZ1 = 1250 + hpx(wZ1) / 2, yK = 1250 + hpx(wZ1) + 30 + hpx(wK) / 2; // ŽÁDNÁ / KAMERA (the icon above)
  const yZ2 = 1250 + hpx(wZ2) / 2, yS = 1250 + hpx(wZ2) + 30 + hpx(wS) / 2;
  const IC = { y: 1040, w: 200 };
  const tEnd = TS[TS.length - 1] + 12 / 60 + 0.02; // the world's end: 9.081

  const update = (t: number) => {
    const f60 = t * 60;
    const roll0 = 0.012 * Math.sin(t * 1.1);
    aim(base, V(0, 0, 6), V(0, 0, 0), 36, roll0);
    placeCam(camera, V(0.05 * Math.sin(t * 0.9), 0.04 * Math.sin(t * 0.7), 6), V(0, 0, 0), 36, roll0, t, IMPS, 0.008);
    lights(1);
    grid.mesh.visible = false;
    BK.points.visible = false;
    BU.update(t);
    leak.visible = false;
    bar.visible = false;
    barS.mesh.visible = false;
    shG.visible = false;
    let ca = 0, glitch = 0, flashT = 0;

    // ── the nine cuts ──
    L.forEach((ly, i) => {
      const end = i === 3 ? TS[4] + 0.4 : i < 8 ? TS[i + 1] + sf(TR[i + 1]) : 99; // cut 4 lives on as shards until 0.4 s after the shatter
      if (t < TS[i] || t >= end) return ly.hide();
      SR[CUTK[i]].play(t, TS[i], 1, 30);
      const { z, o } = cutCam(i, t);
      const oo: LayerO = { ...o, bright: 1, alpha: 1 };
      // incoming
      if (t < TS[i] + sf(TR[i])) {
        const u = clamp((t - TS[i]) / sf(TR[i])), e = smooth(u);
        switch (KIND[i]) {
          case "flash": oo.sc = lerp(1.35, 1, outCubic(clamp(u * 1.5))); oo.bright = 1 + 1.6 * (1 - u); break;
          case "whipL": oo.dx! += 1150 * (1 - e); oo.roll! += 0.1 * (1 - e); break;
          case "zoom": oo.sc = lerp(0.5, 1, outCubic(u)); oo.alpha = clamp(u * 2.5); oo.ord = (i - 1) * 2 - 1; oo.dd = 0.0; break;
          case "glitch": oo.dx! += (Math.floor(f60) % 2 ? 1 : -1) * 70 * (1 - u); oo.bright = 1 + 0.5 * Math.sin(f60 * 7) * (1 - u); break;
          case "whipUp": oo.dy! += 2000 * (1 - e); oo.roll! -= 0.06 * (1 - e); break;
          case "leak": oo.alpha = smooth((u - 0.3) / 0.4); oo.bright = 1 + 0.9 * Math.sin(Math.PI * u); break;
          case "wipe": oo.wipe = 1 - outCubic(u); break;
          case "smear": oo.dx! += 130 * (1 - e); oo.alpha = clamp(u * 1.5); break;
          default: break;
        }
      }
      // outgoing (the next cut's transition)
      if (i < 8 && t >= TS[i + 1]) {
        const u = clamp((t - TS[i + 1]) / sf(TR[i + 1])), e = smooth(u);
        switch (KIND[i + 1]) {
          case "whipL": oo.dx! -= 1150 * e; oo.roll! -= 0.08 * e; break;
          case "zoom": oo.sc = lerp(1, 3.4, inCubic(u)); oo.alpha = 1 - clamp((u - 0.35) * 1.6); oo.ord = i * 2 + 5; break;
          case "whipUp": oo.dy! -= 2000 * e; break;
          case "leak": oo.bright = 1 + 0.9 * Math.sin(Math.PI * u); break;
          case "smear": oo.dx! -= 130 * e; oo.alpha = 1 - 0.7 * u; break;
          default: break;
        }
      }
      ly.set(base, Math.max(OV, z), FOCUS[CUTK[i]][0], FOCUS[CUTK[i]][1], oo);
      // cut 4 shatters under the next one: the plane gives way to the shards
      if (i === 3 && t >= TS[4]) {
        const a = t - TS[4];
        ly.mesh.visible = a < 0.0001;
        shG.visible = a < 0.4 && a >= 0;
        shG.position.copy(ly.mesh.position);
        shG.quaternion.copy(ly.mesh.quaternion);
        shG.scale.copy(ly.mesh.scale);
        shMat.opacity = Math.max(0, 1 - a / 0.4);
        const k = 1 - Math.exp(-5 * a);
        for (const s of sh) {
          s.m.position.set(s.c.x + s.v.x * k, s.c.y + s.v.y * k - 0.6 * a * a, s.v.z * k);
          s.m.rotation.set(s.spin.x * a, s.spin.y * a, s.spin.z * a);
        }
      }
    });
    // transition extras: the light leak (7th cut), the lime bar (8th), the grade values
    TS.forEach((t0, i) => {
      if (i === 0) return;
      const u = (t - t0) / sf(TR[i]);
      if (u < 0 || u >= 1) return;
      if (KIND[i] === "leak") {
        leak.visible = true;
        place(leak, base, lerp(1100, 700, u), lerp(120, 500, u), 3400 * (0.4 + 0.9 * outCubic(u)), 1, D - 0.5);
        (leak.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * u);
        flashT = Math.max(flashT, 0.7 * Math.sin(Math.PI * u));
      }
      if (KIND[i] === "wipe") {
        const wx = -135 + (1 - outCubic(u)) * 1350;
        bar.visible = barS.mesh.visible = true;
        place(bar, base, wx, 960, 150, 1, D - 0.6);
        bar.scale.y = bar.scale.x * (2600 / 150);
        place(barS.mesh, base, wx, 960, 520, 1, D - 0.6, [0, 0, Math.PI / 2]);
        barS.mat.opacity = 0.9;
      }
      if (KIND[i] === "smear") ca = Math.max(ca, 10 * Math.sin(Math.PI * u));
      if (KIND[i] === "glitch") glitch = 1;
    });
    // ── the words, in front of everything ──
    showW(wA, base, t, S.drop, S.zadna - 0.02, 540, yA, W, { from: 1.08, punch: [TS[1], TS[2], TS[3]], seed: 0.6, d: D - 1.2 });
    showW(wT, base, t, S.taky, S.zadna - 0.02, 540, yT, W, { from: 1.08, punch: [TS[3], TS[4]], seed: 1.4, d: D - 1.2 });
    showW(wZ1, base, t, S.zadna, S.zadny - 0.02, 540, yZ1, W, { from: 1.08, punch: [TS[5], S.kamera], seed: 2.1, d: D - 1.2 });
    showW(wK, base, t, S.kamera, S.zadny - 0.02, 540, yK, W, { from: 1.08, punch: [TS[5], TS[6]], seed: 0.3, d: D - 1.2 });
    showW(wZ2, base, t, S.zadny, tEnd, 540, yZ2, W, { from: 1.08, punch: [TS[7], S.stab], seed: 1.0, d: D - 1.2 });
    showW(wS, base, t, S.stab, tEnd, 540, yS, W, { from: 1.08, punch: [TS[8]], seed: 1.7, d: D - 1.2 });
    // the icons (appear with the first word of their line) and their lime X (slams after)
    for (const [ic, t0, t1, tx] of [[icCam, S.zadna, S.zadny - 0.02, S.xcam], [icClap, S.zadny, tEnd, S.xclap]] as [typeof icCam, number, number, number][]) {
      ic.g.visible = t >= t0 && t < t1;
      if (!ic.g.visible) continue;
      place(ic.g, base, 540, IC.y, IC.w * lerp(1.5, 1, outBack(clamp((t - t0) / sf(7)), 1.3)), 1, D - 1.0, [0.1 * Math.sin(t * 1.3), 0.15 * Math.sin(t * 1.1), 0]);
      const xu = clamp((t - tx) / sf(6));
      ic.x.visible = xu > 0;
      ic.x.scale.setScalar(lerp(1.6, 1, outBack(xu, 1.4)));
    }
    // the shock rings: the drop, TAKY!
    const rr = [S.drop, S.taky].map((h) => t - h).find((d) => d >= 0 && d < 0.45);
    ring.visible = rr !== undefined;
    if (rr !== undefined) {
      place(ring, base, 540, 960, 300 + 2800 * outCubic(rr / 0.45), 1, D - 0.3);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - rr / 0.45);
    }
    LS.update(t, S.drop, V(0, 0, 1.2), 2.4, 0.8);

    // ── the grade ──
    const one = (t0: number, a: number, b = 0) => (t >= t0 && t < t0 + sf(1) ? a : t >= t0 + sf(1) && t < t0 + sf(2) ? b : 0);
    const dropFl = t >= S.drop && t < S.drop + sf(4) ? [1.0, 0.75, 0.45, 0.2][Math.floor((t - S.drop) * 60)] : 0;
    const beatFl = TS.slice(1).reduce((m, t0) => Math.max(m, one(t0, 0.3)), 0);
    const strobe = t >= TS[6] && Math.floor(f60) % 5 === 0 ? 0.14 : 0;
    const beatCa = TS.slice(1).reduce((m, t0) => (t >= t0 && t < t0 + sf(3) ? 2.5 : m), 0);
    void INK;
    void pulse;
    return {
      focus: D,
      ap: 0,
      flash: Math.max(dropFl, beatFl, strobe, flashT, one(S.taky, 0.45, 0.2), env(t, IMPS, 30) * 0.05),
      ca: 0.3 + env(t, IMPS, 14) * 1.3 + (t >= S.drop && t < S.drop + sf(3) ? 3.2 : 0) + beatCa + ca,
      glitch,
      vig: 0,
    };
  };
  return { scene, camera, update };
}
