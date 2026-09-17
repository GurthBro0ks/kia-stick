export type Appearance = "light" | "dark" | "system";
export const APPEARANCE_KEY = "kia-appearance";

export function normalizeAppearance(value: unknown): Appearance {
  return value === "light" || value === "dark" ? value : "system";
}

export function readAppearance(): Appearance {
  try {
    return normalizeAppearance(window.sessionStorage.getItem(APPEARANCE_KEY));
  } catch {
    return "system";
  }
}

export function applyAppearance(value: Appearance) {
  document.documentElement.dataset.theme = value;
  try {
    window.sessionStorage.setItem(APPEARANCE_KEY, value);
  } catch {
    // The current page still works when browser storage is unavailable.
  }
}

// Run before the body paints on every route, including a direct /version load.
// Only a validated appearance enum is read; no user/account data is stored.
export const APPEARANCE_INIT_SCRIPT = `try{var a=sessionStorage.getItem("kia-appearance");document.documentElement.dataset.theme=a==="light"||a==="dark"?a:"system"}catch{document.documentElement.dataset.theme="system"}`;
