#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const [url, outPath, widthRaw = "390", heightRaw = "844"] = process.argv.slice(2);

if (!url || !outPath) {
  console.error("usage: node scripts/cdp-screenshot.mjs <url> <out.png> [width] [height]");
  process.exit(2);
}

const width = Number.parseInt(widthRaw, 10);
const height = Number.parseInt(heightRaw, 10);
const port = 9400 + Math.floor(Math.random() * 400);
const userDataDir = await mkdtemp(path.join(tmpdir(), "kia-stick-chrome-"));
const chrome = spawn(
  "google-chrome",
  [
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "ignore"] }
);
let chromeExited = false;
chrome.on("exit", () => {
  chromeExited = true;
});

async function waitForJson(endpoint) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${endpoint}`);
      if (response.ok) return response.json();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error(`Timed out waiting for Chrome endpoint ${endpoint}`);
}

try {
  await waitForJson("/json/version");
  const targetResponse = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  if (!targetResponse.ok) {
    throw new Error(`Unable to create Chrome target: ${targetResponse.status}`);
  }
  const target = await targetResponse.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const eventResolvers = new Map();
  let nextId = 1;

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
      return;
    }
    if (message.method && eventResolvers.has(message.method)) {
      const resolve = eventResolvers.get(message.method);
      eventResolvers.delete(message.method);
      resolve(message.params);
    }
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  function send(method, params = {}) {
    const id = nextId;
    nextId += 1;
    const promise = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    ws.send(JSON.stringify({ id, method, params }));
    return promise;
  }

  function waitForEvent(method) {
    return new Promise((resolve) => eventResolvers.set(method, resolve));
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });

  const loaded = waitForEvent("Page.loadEventFired");
  await send("Page.navigate", { url });
  await loaded;
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(outPath, Buffer.from(screenshot.data, "base64"));

  const metrics = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      documentClientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyText: document.body.innerText.slice(0, 500)
    })`,
  });

  console.log(JSON.stringify(metrics.result.value, null, 2));
  ws.close();
} finally {
  chrome.kill("SIGTERM");
  if (!chromeExited) {
    await Promise.race([
      new Promise((resolve) => chrome.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  }
  await rm(userDataDir, { recursive: true, force: true });
}
