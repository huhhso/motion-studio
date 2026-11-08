#!/usr/bin/env node
// Render a video HTML file to MP4 (or a few stills) with Playwright + ffmpeg.
//
//   node render.mjs videos/hello.html            -> out/hello.mp4
//   node render.mjs hello                        -> same, name lookup in videos/
//   node render.mjs hello --stills 3             -> out/stills/hello-1.png ... -3.png
//   node render.mjs hello --fps 60               -> override the default 30 fps
//
// A video sets window.DURATION (seconds), window.SIZE ([w, h]) and
// window.render(t), which must draw the exact frame for time t.

import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// ---- args -----------------------------------------------------------------
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const stills = opt("stills", null);
const fps = Number(opt("fps", 30));
const input = args[0];

if (!input) {
  console.error("Usage: node render.mjs <video.html | name> [--stills N] [--fps 30]");
  process.exit(1);
}

let file = input;
if (!existsSync(file)) file = path.join("videos", input.endsWith(".html") ? input : `${input}.html`);
if (!existsSync(file)) {
  console.error(`Video not found: ${input}`);
  process.exit(1);
}
file = path.resolve(file);
const name = path.basename(file, ".html");
const outDir = path.resolve("out");

// ---- Playwright (local install if present, else the global one) ------------
async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const globalRoot = execSync("npm root -g").toString().trim();
    return createRequire(path.join(globalRoot, "noop.js"))("playwright");
  }
}
const { chromium } = await loadPlaywright();

// ---- open the video ----------------------------------------------------------
const browser = await chromium.launch();
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(pathToFileURL(file).href, { waitUntil: "load" });

  // Load every @font-face up front (fonts otherwise load lazily, on first use),
  // so frame 0 already uses the right fonts. Stop if a font file is missing.
  const badFonts = await page.evaluate(async () => {
    const faces = [...document.fonts];
    await Promise.allSettled(faces.map((f) => f.load()));
    await document.fonts.ready;
    return faces.filter((f) => f.status !== "loaded").map((f) => `${f.family} ${f.weight} ${f.style}`);
  });
  if (badFonts.length) throw new Error(`Font(s) failed to load:\n  ${badFonts.join("\n  ")}`);

  const meta = await page.evaluate(() => ({
    duration: window.DURATION,
    size: window.SIZE,
    hasRender: typeof window.render === "function",
  }));
  if (errors.length) throw new Error(`Page error:\n  ${errors.join("\n  ")}`);
  if (!(meta.duration > 0)) throw new Error("window.DURATION must be a positive number of seconds.");
  if (!Array.isArray(meta.size) || meta.size.length !== 2) throw new Error("window.SIZE must be [width, height].");
  if (!meta.hasRender) throw new Error("window.render(t) is missing.");

  const [width, height] = meta.size.map(Math.round);
  if (width % 2 || height % 2) throw new Error("window.SIZE must be even numbers (H.264 requirement).");
  await page.setViewportSize({ width, height });

  // Draw frame t, then wait for the browser to paint it.
  const drawFrame = async (t) => {
    await page.evaluate(async (t) => {
      await window.render(t);
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, t);
    if (errors.length) throw new Error(`Error while rendering t=${t}:\n  ${errors.join("\n  ")}`);
  };

  // Determinism guard: CSS animations/transitions would make output depend on wall-clock time.
  await drawFrame(0);
  const running = await page.evaluate(() => document.getAnimations().length);
  if (running) {
    console.warn(`Warning: ${running} CSS animation(s)/transition(s) found. Drive all motion from render(t) instead.`);
  }

  const totalFrames = Math.round(meta.duration * fps);
  const timeOf = (i) => i / fps;

  // ---- stills mode -------------------------------------------------------------
  if (stills !== null) {
    const n = Math.max(1, parseInt(stills, 10) || 3);
    const dir = path.join(outDir, "stills");
    mkdirSync(dir, { recursive: true });
    for (let k = 0; k < n; k++) {
      // Evenly spaced from the first frame to the last.
      const i = n === 1 ? Math.floor(totalFrames / 2) : Math.round(((totalFrames - 1) * k) / (n - 1));
      const t = timeOf(i);
      await drawFrame(t);
      const p = path.join(dir, `${name}-${k + 1}.png`);
      writeFileSync(p, await page.screenshot({ type: "png" }));
      console.log(`still ${k + 1}/${n}  t=${t.toFixed(2)}s  -> ${path.relative(process.cwd(), p)}`);
    }
    process.exitCode = 0;
  } else {
    // ---- video mode: pipe PNG frames straight into ffmpeg ------------------------
    mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `${name}.mp4`);
    const ff = spawn("ffmpeg", [
      "-y", "-loglevel", "error",
      "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
      "-c:v", "libx264", "-preset", "slow", "-crf", "18",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      outFile,
    ], { stdio: ["pipe", "inherit", "inherit"] });
    const ffDone = new Promise((res, rej) =>
      ff.on("close", (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited with code ${code}`)))),
    );

    const started = Date.now();
    for (let i = 0; i < totalFrames; i++) {
      await drawFrame(timeOf(i));
      const png = await page.screenshot({ type: "png" });
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
      if (i % fps === 0 || i === totalFrames - 1) {
        process.stdout.write(`\rframe ${i + 1}/${totalFrames}`);
      }
    }
    ff.stdin.end();
    await ffDone;
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`\n${width}x${height} @ ${fps}fps, ${meta.duration}s -> ${path.relative(process.cwd(), outFile)} (${secs}s)`);
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
