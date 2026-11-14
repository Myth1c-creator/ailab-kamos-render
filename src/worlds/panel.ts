// The AI LAB prompt panel of "Kámoš tomu uvěřil": a graphite card drawn on a canvas (header with the mark, the PROMPT label, the typed text
// in big Instrument Sans, the lime Generovať button), 1100 x 640 px, 1 unit wide in the world. It is shown almost head-on and at >= 75 % of
// the frame's width (the last panel was only a narrow strip). The text is typed by draw(n): n characters, the caret, the button pressed or not.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { INK, INK2, LIME, PAPER, V, canvas, imgTex } from "./common";
import { drawMark } from "./logo";
import { outline, rimTex } from "./kit";

export const PROMPT_TEXT = "Blondýna v obchoďáku mluví do kamery, přirozené světlo, handheld, realistická pleť";
export const PW = 1100, PH = 640;
const FONT = "700 66px 'Instrument Sans'";
const TX = 70, TY0 = 250, PITCH = 78, MAXW = 940;

export function mkPanel(scene: THREE.Scene) {
  const c = canvas(PW, PH);
  const x = c.getContext("2d")!;
  const tex = imgTex(c);
  x.font = FONT;
  // wrap once
  const lines: string[] = [];
  let cur = "";
  for (const w of PROMPT_TEXT.split(" ")) {
    const t = cur ? cur + " " + w : w;
    if (cur && x.measureText(t).width > MAXW) {
      lines.push(cur + " ");
      cur = w;
    } else cur = t;
  }
  lines.push(cur);
  const N = PROMPT_TEXT.length;
  let key = "";
  const caretPx = (n: number): [number, number] => {
    let left = n;
    for (let i = 0; i < lines.length; i++) {
      if (left <= lines[i].length || i === lines.length - 1) {
        x.font = FONT;
        return [TX + x.measureText(lines[i].slice(0, left)).width, TY0 + i * PITCH];
      }
      left -= lines[i].length;
    }
    return [TX, TY0];
  };
  const draw = (n: number, press: number, caret: boolean) => {
    n = Math.max(0, Math.min(N, Math.round(n)));
    const k = `${n}|${press > 0.5 ? 1 : 0}|${caret ? 1 : 0}`;
    if (k === key) return;
    key = k;
    x.clearRect(0, 0, PW, PH);
    x.fillStyle = "#14171C";
    x.beginPath();
    x.roundRect(0, 0, PW, PH, 38);
    x.fill();
    x.strokeStyle = "rgba(198,255,0,0.5)";
    x.lineWidth = 4;
    x.beginPath();
    x.roundRect(2, 2, PW - 4, PH - 4, 36);
    x.stroke();
    drawMark(x, 40, 34, 72);
    x.fillStyle = PAPER;
    x.font = "700 48px 'Instrument Sans'";
    x.textBaseline = "middle";
    x.textAlign = "left";
    x.fillText("AI LAB", 130, 72);
    x.fillStyle = LIME;
    x.beginPath();
    x.roundRect(850, 40, 210, 64, 32);
    x.fill();
    x.fillStyle = INK;
    x.font = "800 34px 'Instrument Sans'";
    x.textAlign = "center";
    x.fillText("VIDEO", 955, 74);
    x.textAlign = "left";
    x.fillStyle = INK2;
    x.font = "500 30px 'Geist Mono'";
    x.fillText("PROMPT", 44, 160);
    x.fillStyle = "#0D1014";
    x.beginPath();
    x.roundRect(36, 190, PW - 72, 282, 24);
    x.fill();
    x.strokeStyle = "rgba(198,255,0,0.35)";
    x.lineWidth = 3;
    x.stroke();
    x.font = FONT;
    x.fillStyle = PAPER;
    let left = n;
    lines.forEach((ln, i) => {
      const s = ln.slice(0, Math.max(0, Math.min(ln.length, left)));
      left -= ln.length;
      if (s) {
        // no readable prompt: blurred grey-white bars, one per word (the lengths follow the hidden text)
        x.save();
        x.filter = "blur(5px)";
        x.fillStyle = "rgba(226,230,234,0.62)";
        let pos = 0;
        for (const w of s.split(/(\s+)/)) {
          const w0 = x.measureText(s.slice(0, pos)).width;
          pos += w.length;
          if (w.trim()) {
            const w1 = x.measureText(s.slice(0, pos)).width;
            x.beginPath();
            x.roundRect(TX + w0, TY0 + i * PITCH - 17, Math.max(12, w1 - w0 - 10), 34, 10);
            x.fill();
          }
        }
        x.restore();
      }
    });
    if (caret) {
      const [cx, cy] = caretPx(n);
      x.fillStyle = LIME;
      x.fillRect(cx + 4, cy - 34, 10, 68);
    }
    // the button
    x.fillStyle = press > 0.5 ? "#FFFFFF" : LIME;
    x.beginPath();
    x.roundRect(36, 508, 430, 98, 49);
    x.fill();
    x.fillStyle = INK;
    x.font = "800 54px 'Instrument Sans'";
    x.textAlign = "center";
    x.fillText("Generovať", 251, 559);
    x.textAlign = "left";
    tex.needsUpdate = true;
  };
  draw(0, 0, true);
  const H = PH / PW;
  const g = new THREE.Group();
  g.name = "board:prompt";
  const d = 0.035;
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.03, H + 0.03, d, 3, 0.012), new THREE.MeshStandardMaterial({ color: "#14171c", metalness: 0.7, roughness: 0.25, emissive: LIME, emissiveIntensity: 0.08 }));
  body.position.z = -d / 2;
  const faceMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1, H), faceMat);
  face.position.z = 0.002;
  const rimMat = new THREE.MeshBasicMaterial({ map: rimTex(), color: LIME, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
  const rim = new THREE.Mesh(new THREE.PlaneGeometry(1.12, H + 0.12), rimMat);
  rim.position.z = -d - 0.01;
  const ol = outline(1, H);
  ol.mesh.position.z = 0.006;
  g.add(body, face, rim, ol.mesh);
  g.visible = false;
  scene.add(g);
  const local = (px: number, py: number, z = 0.01) => V(px / PW - 0.5, (0.5 - py / PH) * H, z);
  return { g, body, faceMat, rim: rimMat, outline: ol.mat, draw, N, H, local, caret: (n: number) => { const [a, b] = caretPx(n); return local(a + 10, b, 0.012); } };
}
