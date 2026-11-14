// World 3, CTA + logo (film 545-805, 9.081-13.433 s): POŠLI TO KÁMOŠOVI.
//   9.081 (POŠLI) both videos arrive as two tilted 3D cards that go on playing (video 2 left, video 1 right); a 3D paper plane (sharing) flies
//         between them at the camera, with a lime trail; the words are in front of the cards: POŠLI TO (paper) · 9.546 KÁMOŠOVI (lime, >= 2 s)
//         · 10.091 KTERÝ BY · 10.533 TOMU UVĚŘIL; the cards pulse on the beats (9.191, 9.797, 10.403, 11.009), nothing stands > 0.6 s
//   11.615 (beat) the cards burst at the camera, the plane hits the lens, flash 2 f, the AI LAB logo (the extruded mark + the wordmark) slams in
//   12.221 (beat) a sweep over the logo (the last new thing) · from 12.8 the clean end card: slow push, the mark sways
// Every word and the logo are screen-anchored; their sizes (px) are below and in check_text3d.py.
import * as THREE from "three";
import type { World } from "../three/shot3d";
import {
  BG, LIME, PAPER, V, aim, canvas, clamp, env, glowSprite, glowTex, imgTex, inCubic, lerp, outBack, outCubic, place, placeCam, pulse, screenPoint, streak, tw, type Imp,
} from "./common";
import { Bt, S, T, fr } from "./timing";
import { type Key, type Media, type Src } from "./media";
import { D, mkPic, word3 } from "./kit";
import { bokeh, hudGrid, lightShards, rayFan, ringTex } from "./shapes";
import { markMesh } from "./logo";
import { showW } from "./util";

// the CTA words and the logo (frame px at rest; widths <= 620 keep >= 150 px from the edges with the punch and the slam)
export const CTA = {
  posli: { y: 0, w: 620 }, kamosovi: { y: 0, w: 620 }, ktery: { y: 0, w: 520 }, tomu: { y: 0, w: 600 }, top: 1190, gap: 28,
  mark: { y: 760, w: 280 }, word: { y: 990, w: 520 },
};
const BEATS = [15, 16, 17, 18].map((i) => Bt(i) / 60);
const IMPACTS: Imp[] = [{ t: S.posli, power: 1.0 }, { t: S.kamosovi, power: 0.9 }, { t: S.ktery, power: 0.4 }, { t: S.tomu, power: 0.4 }, { t: S.lockup, power: 1.2 }, { t: S.sweep, power: 0.3 }, ...BEATS.map((t) => ({ t, power: 0.3 }))];
export const ctaSamples = (f: number) => {
  const t = fr(f);
  const near = (a: number, r0: number, r1: number) => t >= a - r0 && t < a + r1;
  if (near(S.lockup, 0, 0.3) || near(S.posli, 0.05, 0.25)) return 24;
  if (t < S.calm) return 14;
  return 10;
};

function lineTex(s: string, css: string, color: string, w: number, h: number) {
  const c = canvas(w, h);
  const x = c.getContext("2d")!;
  x.font = css;
  x.fillStyle = color;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(s, w / 2, h / 2 + 2);
  return { tex: imgTex(c), frac: x.measureText(s).width / w };
}

// a paper plane, 1.1 wide (the wing span), nose at +z (towards the camera at rest): two paper wings + a lime keel
function planeMesh() {
  const g = new THREE.Group();
  g.name = "icon:plane";
  const N = [0, 0, 1], L = [-0.55, 0.07, -0.9], R = [0.55, 0.07, -0.9], T = [0, -0.02, -0.8], K = [0, -0.3, -0.7];
  const mkG = (tris: number[][][]) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(tris.flat(2), 3));
    geo.computeVertexNormals();
    return geo;
  };
  const paper = new THREE.MeshStandardMaterial({ color: PAPER, emissive: PAPER, emissiveIntensity: 0.3, roughness: 0.5, flatShading: true, side: THREE.DoubleSide });
  const lime = new THREE.MeshStandardMaterial({ color: LIME, emissive: LIME, emissiveIntensity: 0.7, roughness: 0.4, flatShading: true, side: THREE.DoubleSide });
  g.add(new THREE.Mesh(mkG([[N, L, T], [N, T, R]]), paper), new THREE.Mesh(mkG([[N, K, T]]), lime));
  g.visible = false;
  return g;
}

export function buildCta(M: Media, SR: Record<Key, Src>): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  const camera = new THREE.PerspectiveCamera(36, 1080 / 1920, 0.05, 80);
  const base = new THREE.PerspectiveCamera(36, 1080 / 1920, 0.05, 80);
  scene.add(new THREE.HemisphereLight("#e8eef4", "#060708", 0.65));
  const key = new THREE.DirectionalLight("#fff4ea", 1.15);
  key.position.set(-3, 4, 6);
  const rimL = new THREE.DirectionalLight("#e2ffa0", 0.9);
  rimL.position.set(4, -1, 2);
  scene.add(key, rimL);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex("rgba(198,255,0,0.16)", "rgba(198,255,0,0.05)", "rgba(198,255,0,0)"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(halo);
  const BK = bokeh(56, [3.6, 6.2, 2.2], V(0, 0, -4), V(0.35, 0.9, 0), 0.34, "ct", 0.45);
  BK.mat.opacity = 0.38;
  scene.add(BK.points);
  const grid = hudGrid(240);
  scene.add(grid.mesh);

  // ── the two cards (they go on playing) ──
  const cA = mkPic(scene, SR.k1, 9 / 16, { depth: 0.04, corners: true });
  const cB = mkPic(scene, SR.k2, 9 / 16, { depth: 0.04, corners: true });
  // ── the paper plane and its trail ──
  const plane = planeMesh();
  scene.add(plane);
  const trail = Array.from({ length: 9 }, () => {
    const s = glowSprite(glowTex("rgba(255,255,255,0.9)", "rgba(198,255,0,0.5)", "rgba(198,255,0,0)"));
    s.visible = false;
    scene.add(s);
    return s;
  });
  // the plane's path (frame px): a lazy S between the cards, growing at the camera
  const planeAt = (t: number) => {
    const u = clamp((t - S.posli) / (S.lockup - S.posli));
    const x = 540 + 210 * Math.sin(u * 7.2) * (1 - 0.25 * u), y = 640 - 110 * Math.sin(u * 4.6 + 0.8) + 40 * u;
    return { x, y, w: lerp(110, 400, u * u) + 700 * inCubic(clamp((u - 0.9) / 0.1)), u, bank: Math.cos(u * 7.2) };
  };

  // ── the logo: the extruded mark and the AI LAB wordmark (Instrument Sans, the app's logotype) ──
  const mark = markMesh(0.24);
  const markG = new THREE.Group();
  markG.add(mark.mesh);
  markG.name = "logo:mark";
  scene.add(markG);
  const wm = lineTex("AI LAB", "700 150px 'Instrument Sans'", PAPER, 768, 200);
  const wordMat = new THREE.MeshStandardMaterial({ map: wm.tex, transparent: true, emissive: "#ffffff", emissiveMap: wm.tex, emissiveIntensity: 0.9, roughness: 0.4, alphaTest: 0.3 });
  const word = new THREE.Mesh(new THREE.PlaneGeometry(1, 200 / 768), wordMat);
  word.name = "logo:wordmark";
  scene.add(word);
  const logoRays = rayFan(16, 6, 0.6, "#efffcf", "lg");
  scene.add(logoRays.group);
  const logoRing = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  scene.add(logoRing);
  const hitRing = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  scene.add(hitRing);
  const sweep = streak(1, 0.3);
  scene.add(sweep.mesh);
  const LS = lightShards(50, "lb");
  scene.add(LS.group);

  // ── the CTA type ──
  const lime = (s: string) => word3(M, scene, s, LIME, "#4f6600", 0.85, 0.35);
  const wP = word3(M, scene, "POŠLI TO"), wK = lime("KÁMOŠOVI"), wT = word3(M, scene, "KTERÝ BY"), wU = word3(M, scene, "TOMU UVĚŘIL");
  const ws = [wP, wK, wT, wU], wpx = [CTA.posli.w, CTA.kamosovi.w, CTA.ktery.w, CTA.tomu.w];
  let yy = CTA.top;
  const Y = ws.map((w, i) => {
    const h = (w.h * wpx[i]) / w.w;
    const c = yy + h / 2;
    yy += h + CTA.gap;
    return c;
  });

  const update = (t: number) => {
    const sway = Math.sin(t * 0.7);
    aim(base, V(0, 0, 6), V(0, 0, 0), 36, 0.012 * sway);
    placeCam(camera, V(0.06 * sway, 0.04 * Math.sin(t * 0.9), 6), V(0, 0, 0), 36, 0.012 * sway, t, IMPACTS, t > S.calm ? 0.004 : 0.008);
    place(grid.mesh, base, 540, 960, grid.W, 1, D + 4, [0, 0, -0.05 + 0.04 * Math.sin(t * 0.4)]);
    grid.set(1, -230 * (t - S.posli), 200 * (t - S.posli), "graphite", 1.4);
    const Z = 1 + 0.015 * Math.max(0, t - S.posli); // the slow push of the whole CTA
    const at = (x: number, y: number, w: number): [number, number, number] => [540 + (x - 540) * Z, 960 + (y - 960) * Z, w * Z];
    const beatK = BEATS.reduce((m, b) => Math.max(m, 0.05 * pulse(t, b, 9) * (t >= b ? 1 : 0)), 0);
    const burst = clamp((t - S.lockup) / 0.3);

    // ── the cards: they arrive on POŠLI, sway, pulse on the beats, burst at the camera on the lockup ──
    SR.k1.play(t, S.posli, 1, 30);
    SR.k2.play(t, S.posli, 1, 30);
    const cardsOn = t >= S.posli && t < S.lockup + 0.32;
    for (const [c, side, x0, y0] of [[cA, -1, 300, 590], [cB, 1, 780, 640]] as [typeof cA, number, number, number][]) {
      c.g.visible = cardsOn;
      if (!cardsOn) continue;
      const a = t - S.posli;
      const pop = lerp(1.6, 1, outBack(clamp(a / (9 / 60)), 1.2));
      const [x, y, w] = at(x0 + 14 * Math.sin(t * 1.3 + side) + side * 520 * burst * burst, y0 + 16 * Math.sin(t * 1.7 + side * 2) + 50 * Math.sin(t * 0.9 + side), 400 * pop * (1 + beatK) * (1 + 2.6 * outCubic(burst)));
      place(c.g, base, x, y, w, 1, D - 0.2 - 0.9 * burst, [0.05 * Math.sin(t * 1.1) + 0.5 * burst * side, -side * (0.3 + 0.06 * Math.sin(t * 1.3)) + 1.3 * burst * side, side * (0.07 + 0.03 * Math.sin(t * 1.9)) + 0.5 * burst * side]);
    }
    // ── the paper plane ──
    {
      const on = t >= S.posli && t < S.lockup + 0.05;
      plane.visible = on;
      trail.forEach((s, k) => {
        s.visible = on && k > 0 && t - 0.022 * k >= S.posli;
        if (!s.visible) return;
        const p = planeAt(t - 0.022 * k);
        const [x, y, w] = at(p.x, p.y + 20 * k * 0.2, 60 * (1 - k / 11) * (0.4 + p.u * 1.2));
        s.position.copy(screenPoint(base, x, y, D + 0.1));
        s.quaternion.copy(base.quaternion);
        s.scale.setScalar(w * 0.0021);
        (s.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k / 10);
      });
      if (on) {
        const p = planeAt(t), q = planeAt(t + 0.03);
        const [x, y, w] = at(p.x, p.y, p.w);
        const head = Math.atan2(q.y - p.y, q.x - p.x);
        place(plane, base, x, y, w, 1.1, D - 0.5, [0.55, 0.55 * p.bank, -0.5 * Math.cos(head) * 0.6 + 0.25 * Math.sin(t * 3)]);
      }
    }

    // ── the logo (11.615): the mark from 160 %, the wordmark slides in ──
    {
      const a = t - S.lockup;
      markG.visible = word.visible = logoRays.group.visible = a >= 0;
      const pop = lerp(1.6, 1, outBack(clamp(a / (7 / 60)), 1.4));
      const [x, y, w] = at(540, CTA.mark.y, CTA.mark.w * pop * (1 + 0.02 * Math.sin(t * 2.1)));
      place(markG, base, x, y, w, 2, D, [0.1 * Math.sin(t * 1.3), 0.25 * Math.sin(t * 0.9) + 0.6 * (1 - outCubic(clamp(a / 0.3))), 0]);
      mark.face.emissiveIntensity = 0.75 + 1.4 * pulse(t, S.lockup, 5);
      const inn = outCubic(clamp(a / (6 / 60)));
      const slam = lerp(1.3, 1, outBack(clamp(a / (8 / 60)), 1.3));
      const [wx, wy, ww] = at(540, lerp(CTA.word.y + 160, CTA.word.y, inn), CTA.word.w * slam);
      place(word, base, wx, wy, ww / wm.frac, 1, D, [0.08 * Math.sin(t * 1.3), 0.12 * Math.sin(t * 0.9), 0]);
      wordMat.opacity = inn;
      wordMat.emissiveIntensity = 0.9 + 0.8 * pulse(t, S.lockup, 6);
      logoRays.group.position.copy(screenPoint(base, ...(at(540, CTA.mark.y, 0).slice(0, 2) as [number, number]), D + 1.2));
      logoRays.group.quaternion.copy(base.quaternion);
      logoRays.group.rotateZ(0.25 * a);
      logoRays.mats.forEach((m, i) => (m.opacity = (0.05 + 0.3 * Math.exp(-a * 4)) * (0.7 + 0.3 * Math.sin(i + t))));
      logoRing.visible = a >= 0 && a < 0.4;
      if (logoRing.visible) {
        const [lx, ly] = at(540, CTA.mark.y + 110, 0);
        place(logoRing, base, lx, ly, 300 + 1700 * outCubic(a / 0.4), 1, D + 0.2);
        (logoRing.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - a / 0.4);
      }
    }
    // ── the CTA words: in front of the cards, gone at the lockup ──
    {
      const tEnd = S.lockup - 0.02;
      showW(wP, base, t, S.posli, tEnd, ...(at(540, Y[0], 0).slice(0, 2) as [number, number]), CTA.posli.w * Z, { from: 1.08, punch: [BEATS[0]], seed: 0.4, d: D - 1.2 });
      showW(wK, base, t, S.kamosovi, tEnd, ...(at(540, Y[1], 0).slice(0, 2) as [number, number]), CTA.kamosovi.w * Z, { from: 1.08, punch: [BEATS[1], BEATS[2]], seed: 1.3, d: D - 1.2 });
      showW(wT, base, t, S.ktery, tEnd, ...(at(540, Y[2], 0).slice(0, 2) as [number, number]), CTA.ktery.w * Z, { from: 1.08, punch: [BEATS[2]], seed: 2.0, d: D - 1.2 });
      showW(wU, base, t, S.tomu, tEnd, ...(at(540, Y[3], 0).slice(0, 2) as [number, number]), CTA.tomu.w * Z, { from: 1.08, punch: [BEATS[3]], seed: 0.8, d: D - 1.2 });
    }
    // the plane hits the lens: a ring, the sweep over the logo
    {
      const r = t - S.lockup;
      hitRing.visible = r >= 0 && r < 0.45;
      if (hitRing.visible) {
        place(hitRing, base, 540, 900, 300 + 2400 * outCubic(r / 0.45), 1, D + 0.3);
        (hitRing.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - r / 0.45);
      }
      const a = t - S.sweep;
      sweep.mesh.visible = a >= 0 && a < 0.3;
      if (sweep.mesh.visible) {
        const u = a / 0.3;
        const [x, y] = at(lerp(180, 900, u), CTA.mark.y + 120, 0);
        place(sweep.mesh, base, x, y, 760, 1, D - 0.4, [0, 0, 0.5]);
        sweep.mat.opacity = 0.8 * Math.sin(u * Math.PI);
      }
      LS.update(t, t >= S.lockup ? S.lockup : S.kamosovi, screenPoint(base, 540, t >= S.lockup ? CTA.mark.y : 1000, D - 0.3), 1.2, 0.6);
    }
    place(halo, base, 540, 760, 1700, 1, D + 3);
    (halo.material as THREE.MeshBasicMaterial).opacity = 0.8 + 0.4 * pulse(t, S.kamosovi, 3) * (t >= S.kamosovi ? 1 : 0) + 0.1 * Math.sin(t * 2.2);
    BK.update(t);

    const fl = (t0: number, a: number, b: number) => (t >= t0 && t < t0 + 1 / 60 ? a : t >= t0 + 1 / 60 && t < t0 + 2 / 60 ? b : 0);
    return {
      focus: D,
      ap: 6,
      flash: Math.max(fl(S.posli, 0.5, 0.25), fl(S.lockup, 0.95, 0.5), fl(S.kamosovi, 0.4, 0.15), env(t, IMPACTS, 30) * 0.05),
      ca: 0.3 + env(t, IMPACTS, 14) * 1.1 + (t >= S.posli && t < S.posli + 3 / 60 ? 3 : 0) + (t >= S.kamosovi && t < S.kamosovi + 2 / 60 ? 2.4 : 0) + (t >= S.lockup && t < S.lockup + 3 / 60 ? 2.8 : 0),
      glitch: 0,
      vig: 0.1 * tw(t, S.calm, S.end),
    };
  };
  return { scene, camera, update };
}
void T;
