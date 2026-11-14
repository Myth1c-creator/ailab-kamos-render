// The film's whole picture (806 frames, 60 fps): three three.js worlds rendered by AccumShot (sub-frame motion blur, DOF, grade; the
// accumulator clears to black), one after another (src/worlds/timing.ts F):
//   the intro 0-369 (video 1 in 2.5D, A NENÍ!, the card, the prompt panel, the tape-stop, the blackout)
//   the drop 370-544 (video 2 / video 1 in nine cuts with nine transitions)
//   the CTA 545-805 (two playing cards, the paper plane, POŠLI TO KÁMOŠOVI, the logo)
// Fonts (the 3D typeface and the web fonts the canvas textures draw with) and the video frames of the world being drawn are loaded before
// the world mounts: a delayRender inside the r3f tree would leak.
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { AccumShot, type Grade } from "./three/shot3d";
import { F } from "./worlds/timing";
import { CLIPS_OF, sources, type Key, type Media } from "./worlds/media";
import { buildIntro, introSamples } from "./worlds/intro";
import { buildDrop, dropSamples } from "./worlds/drop";
import { buildCta, ctaSamples } from "./worlds/cta";

const FONTS: [string, string, FontFaceDescriptors][] = [
  ["Instrument Sans", "fonts/InstrumentSans.ttf", { weight: "400 700", stretch: "75% 100%" }],
  ["Geist Mono", "fonts/geist-mono-latin-wght-normal.woff2", { weight: "100 900" }],
  ["Geist Mono", "fonts/geist-mono-latin-ext-wght-normal.woff2", { weight: "100 900" }],
  ["Unbounded", "fonts/Unbounded-wght.ttf", { weight: "200 900" }],
];
const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((ok, bad) => {
    const i = new Image();
    i.onload = () => i.decode().then(() => ok(i), () => ok(i));
    i.onerror = () => bad(new Error("image " + src));
    i.src = staticFile(src);
  });
// fonts once; the frame sequences per world (the decoded frames are big: a render job only holds the world it is drawing)
let fontCache: Media["font"] | null = null;
const seqCache: Partial<Record<Key, HTMLImageElement[]>> = {};
const loading: Partial<Record<1 | 2 | 3, Promise<Media>>> = {};
const loadAssets = (w: 1 | 2 | 3) =>
  (loading[w] ??= Promise.all(FONTS.map(([fam, file, d]) => new FontFace(fam, `url(${staticFile(file)})`, d).load().then((l) => document.fonts.add(l)))).then(async () => {
    // canvas text only uses a web font that is already decoded at the size/weight it asks for
    await Promise.all(["700 150px 'Instrument Sans'", "700 66px 'Instrument Sans'", "800 54px 'Instrument Sans'", "500 30px 'Geist Mono'", "800 200px Unbounded"].map((f) => document.fonts.load(f, "AÁČŠĚŘÍÉŮŽŇÚ?.:0123456789")));
    fontCache ??= new FontLoader().parse(await fetch(staticFile("fonts/unbounded_800_clean.typeface.json")).then((r) => r.json()));
    const counts = (await fetch(staticFile("seq/seq.json")).then((r) => r.json())) as Record<string, number>;
    for (const k of CLIPS_OF[w]) seqCache[k] ??= await Promise.all(Array.from({ length: counts[k] }, (_, i) => loadImg(`seq/${k}_${String(i).padStart(3, "0")}.jpg`)));
    return { font: fontCache, seq: seqCache } as Media;
  }));
const useAssets = (w: 1 | 2 | 3) => {
  const [first] = useState(() => delayRender("assets-first"));
  const done = useRef(false);
  const [a, setA] = useState<{ w: number; m: Media } | null>(null);
  useEffect(() => {
    const h = delayRender(`assets-${w}`);
    loadAssets(w).then((m) => {
      setA({ w, m });
      continueRender(h);
      if (!done.current) {
        done.current = true;
        continueRender(first);
      }
    });
  }, [w, first]);
  return a && a.w === w ? a.m : null;
};

// dark, contrasty, neutral: the photos keep their own colours; the flash is added after sRGB (never a pink wash)
const GRADE: Grade = { tint: [1, 1, 1], amount: 0, contrast: 1.08, vignette: 0.32, flashColor: [0.95, 0.97, 0.9] };

export const Film3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const w = frame < F.drop ? 1 : frame < F.cta ? 2 : 3;
  const A = useAssets(w);
  if (!A) return <AbsoluteFill style={{ background: "#0B0D10" }} />;
  return (
    <AbsoluteFill style={{ background: "#0B0D10" }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, outputColorSpace: THREE.SRGBColorSpace }}>
        {w === 1 ? <AccumShot key="w1" frame={frame} build={() => buildIntro(A, sources(A))} samples={introSamples} grade={GRADE} /> : null}
        {w === 2 ? <AccumShot key="w2" frame={frame} build={() => buildDrop(A, sources(A))} samples={dropSamples} grade={GRADE} /> : null}
        {w === 3 ? <AccumShot key="w3" frame={frame} build={() => buildCta(A, sources(A))} samples={ctaSamples} grade={GRADE} /> : null}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
