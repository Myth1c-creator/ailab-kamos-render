// The pictures of the film as three.js textures: only VIDEO frame sequences (public/seq, prep_video.py; the sources are the 4K videos of the user):
//   h1   video 1 for the hook, 1080x1920, 30 fps (0-2.34 s of the film; it freezes on its last frame for A NENÍ!)
//   h1b  video 1 going on, 432x768, 30 fps: the card above the prompt panel (from 3.131 s of the film)
//   c0..c8  the nine cuts of the drop (video 2 / video 1 alternating, 1080x1920, 30 fps, every cut with its own speed)
//   k1 k2  the two CTA cards (video 2 / video 1, 432x768, 30 fps)
// One Src per sequence; every surface gets its own cover-fit "view" (a clone sharing the image) cropped around the face: punch-ins
// only ever go to the face. A Src swaps its image per frame (set / play): every view follows.
import * as THREE from "three";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { clamp } from "../three/shot3d";

export type Key = "h1" | "h1b" | "c0" | "c1" | "c2" | "c3" | "c4" | "c5" | "c6" | "c7" | "c8" | "k1" | "k2";
export const CUTK: Key[] = ["c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"];
// which sequences each world needs (Film.tsx loads them per world: the decoded frames are big)
export const CLIPS_OF: Record<1 | 2 | 3, Key[]> = { 1: ["h1", "h1b"], 2: CUTK, 3: ["k1", "k2"] };
export const CLIPS: Key[] = [...CLIPS_OF[1], ...CLIPS_OF[2], ...CLIPS_OF[3]];
export type Media = { font: Font; seq: Partial<Record<Key, HTMLImageElement[]>> };

// where each picture's face is (0..1 from the top left of the WHOLE photo): crops and punch-ins go there
export const FOCUS: Record<Key, [number, number]> = {
  h1: [0.5, 0.3], h1b: [0.5, 0.3], c0: [0.42, 0.22], c1: [0.5, 0.3], c2: [0.42, 0.22], c3: [0.5, 0.3], c4: [0.42, 0.22], c5: [0.5, 0.3], c6: [0.42, 0.22], c7: [0.5, 0.3], c8: [0.42, 0.22],
  k1: [0.45, 0.25], k2: [0.5, 0.3],
};

// cover-fit: the part of a picture of aspect srcA (w/h) that fills a surface of aspect dstA, around focus, zoomed in
export function fitRect(srcA: number, dstA: number, focus: [number, number] = [0.5, 0.5], zoom = 1) {
  let rx = 1, ry = 1;
  if (srcA > dstA) rx = dstA / srcA;
  else ry = srcA / dstA;
  rx /= zoom;
  ry /= zoom;
  // texture v runs bottom-up (flipY): the focus y is measured from the top
  return { rx, ry, ox: clamp(focus[0] - rx / 2, 0, 1 - rx), oy: clamp(1 - focus[1] - ry / 2, 0, 1 - ry) };
}

export class Src {
  base: THREE.Texture;
  views: THREE.Texture[] = [];
  cur = 0;
  aspect: number;
  constructor(public key: Key, public frames: (HTMLImageElement | HTMLCanvasElement)[]) {
    this.base = new THREE.Texture(frames[0]);
    this.base.colorSpace = THREE.SRGBColorSpace;
    this.base.anisotropy = 8;
    this.base.needsUpdate = true;
    const f0 = frames[0];
    this.aspect = f0 instanceof HTMLImageElement ? f0.naturalWidth / f0.naturalHeight : f0.width / f0.height;
  }
  get isClip() {
    return this.frames.length > 1;
  }
  private add(rx: number, ry: number, ox: number, oy: number) {
    const t = this.base.clone();
    t.repeat.set(rx, ry);
    t.offset.set(ox, oy);
    t.needsUpdate = true;
    this.views.push(t);
    return t;
  }
  // the picture cover-fitted to a surface of aspect a (w/h)
  view(a: number, zoom = 1, focus: [number, number] = FOCUS[this.key]) {
    const r = fitRect(this.aspect, a, focus, zoom);
    return this.add(r.rx, r.ry, r.ox, r.oy);
  }
  // a video: show source frame i (every view follows; the GPU uploads the picture once)
  set(i: number) {
    const k = clamp(Math.floor(i), 0, this.frames.length - 1);
    if (k === this.cur) return;
    this.cur = k;
    this.base.image = this.frames[k];
    this.base.needsUpdate = true;
    for (const v of this.views) v.needsUpdate = true;
  }
  // a video used from film time t0 on: a `fps` source at `speed`, held on its last frame
  play(t: number, t0: number, speed = 1, fps = 30) {
    if (this.isClip) this.set(Math.max(0, t - t0) * fps * speed);
  }
}

export function sources(M: Media) {
  const S = {} as Record<Key, Src>;
  for (const k of CLIPS) if (M.seq[k]) S[k] = new Src(k, M.seq[k]!);
  return S;
}
