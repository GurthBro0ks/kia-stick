#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const rootFlag = argv.indexOf("--root");
  if (rootFlag >= 0 && argv[rootFlag + 1]) return path.resolve(argv[rootFlag + 1]);
  return path.resolve(process.env.KIA_RELEASE_CHECK_ROOT || process.cwd());
}

function readText(root, file) {
  const target = path.join(root, file);
  if (!existsSync(target)) throw new Error(`Missing required release-check file: ${file}`);
  return readFileSync(target, "utf8");
}

function readJson(root, file) {
  return JSON.parse(readText(root, file));
}

function constantValue(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`export\\s+const\\s+${escaped}\\s*=\\s*"([^"]+)"`));
  if (!match) throw new Error(`Missing export const ${name} in lib/version.ts`);
  return match[1];
}

function phaseVersion(phase) {
  return phase.match(/v(\d+\.\d+(?:\.\d+)?)/)?.[1] ?? "";
}

function majorMinor(version) {
  return version.split(".").slice(0, 2).join(".");
}

function formatDiff(label, expected, actual, file) {
  return [
    `- ${label}`,
    `  file: ${file}`,
    `  expected: ${expected}`,
    `  actual:   ${actual}`,
  ].join("\n");
}

function releaseConfig(featureList) {
  return featureList.release_readiness?.version_coherence ?? {};
}

function holdMatches(hold, check, phase) {
  if (!hold || hold.field !== check.field) return false;
  if (!hold.reason || hold.reason.trim().length < 12) return false;
  if (hold.actual && hold.actual !== check.actual) return false;
  if (hold.expected && hold.expected !== check.expected) return false;
  if (hold.applies_to_phase_pattern && !new RegExp(hold.applies_to_phase_pattern).test(phase)) return false;
  return true;
}

function main() {
  const root = parseArgs(process.argv.slice(2));
  const packageJson = readJson(root, "package.json");
  const featureList = readJson(root, "feature_list.json");
  const versionSource = readText(root, "lib/version.ts");
  const readme = readText(root, "README.md");
  const closeout = readText(root, "CLOSEOUT.md");

  const productVersion = constantValue(versionSource, "PRODUCT_VERSION");
  const promptVersion = constantValue(versionSource, "PROMPT_VERSION");
  const phase = featureList.phase;
  const release = releaseConfig(featureList);
  const intentionalHolds = Array.isArray(release.intentional_holds) ? release.intentional_holds : [];
  const problems = [];
  const appliedHolds = [];

  function check(label, expected, actual, file, field) {
    if (actual === expected) return;
    const checkInfo = { field, expected, actual };
    const hold = intentionalHolds.find((candidate) => holdMatches(candidate, checkInfo, phase));
    if (hold) {
      appliedHolds.push({ ...checkInfo, reason: hold.reason });
      return;
    }
    problems.push(formatDiff(label, expected, actual, file));
  }

  check("package.json version must match lib/version.ts PRODUCT_VERSION", productVersion, packageJson.version, "package.json", "package.version");
  check("feature_list release phase must match top-level phase", phase, featureList.release_readiness?.phase, "feature_list.json", "release_readiness.phase");
  check("feature_list package_version must match package.json", packageJson.version, release.package_version, "feature_list.json", "package.version");
  check("feature_list product_version must match lib/version.ts PRODUCT_VERSION", productVersion, release.product_version, "feature_list.json", "productVersion");
  check("feature_list prompt_version must match lib/version.ts PROMPT_VERSION", promptVersion, release.prompt_version, "feature_list.json", "promptVersion");

  const phaseSemver = phaseVersion(phase);
  if (phaseSemver && majorMinor(phaseSemver) !== majorMinor(productVersion)) {
    check(
      "productVersion milestone differs from release phase",
      `${majorMinor(phaseSemver)}.x phase milestone`,
      productVersion,
      "lib/version.ts",
      "productVersion"
    );
  }

  if (majorMinor(phaseSemver) === "0.5" && /\bv0\.4\b/.test(promptVersion)) {
    check("PROMPT_VERSION still contains stale v0.4 wording during v0.5.x phase", "v0.5.x prompt wording", promptVersion, "lib/version.ts", "promptVersion");
  }

  for (const [file, text] of [
    ["README.md", readme],
    ["CLOSEOUT.md", closeout],
  ]) {
    if (!text.includes(phase)) problems.push(formatDiff(`${file} must mention current feature_list phase`, phase, "missing", file));
    if (!text.includes(productVersion)) problems.push(formatDiff(`${file} must mention current product version`, productVersion, "missing", file));
    if (!text.includes(promptVersion)) problems.push(formatDiff(`${file} must mention current prompt version`, promptVersion, "missing", file));
  }

  if (problems.length > 0) {
    console.error("Release readiness check FAIL");
    console.error("");
    console.error(problems.join("\n\n"));
    if (appliedHolds.length > 0) {
      console.error("");
      console.error("Intentional holds applied before failure:");
      for (const hold of appliedHolds) console.error(`- ${hold.field}: ${hold.actual} (${hold.reason})`);
    }
    process.exit(1);
  }

  console.log("Release readiness check PASS");
  console.log(`Phase: ${phase}`);
  console.log(`Package/Product version: ${packageJson.version}`);
  console.log(`Prompt version: ${promptVersion}`);
  if (appliedHolds.length > 0) {
    console.log("Intentional holds:");
    for (const hold of appliedHolds) console.log(`- ${hold.field}: ${hold.actual} (${hold.reason})`);
  } else {
    console.log("Intentional holds: none");
  }
}

try {
  main();
} catch (error) {
  console.error("Release readiness check ERROR");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
