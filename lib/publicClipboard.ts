export type PublicClipboardEnvironment = {
  modernWriteText?: (text: string) => Promise<void>;
  legacyCopy: (text: string) => boolean;
};

function legacyCopyPublicExportText(text: string): boolean {
  const activeElement = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("aria-hidden", "true");
  textarea.setAttribute("readonly", "");
  textarea.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
    activeElement?.focus();
  }
}

function browserClipboardEnvironment(): PublicClipboardEnvironment {
  const modernWriteText = typeof navigator !== "undefined" && navigator.clipboard?.writeText
    ? navigator.clipboard.writeText.bind(navigator.clipboard)
    : undefined;
  return {
    modernWriteText,
    legacyCopy: legacyCopyPublicExportText,
  };
}

export async function copyPublicExportText(
  text: string,
  environment: PublicClipboardEnvironment = browserClipboardEnvironment()
): Promise<boolean> {
  if (environment.modernWriteText) {
    try {
      await environment.modernWriteText(text);
      return true;
    } catch {
      // Fall through for browsers that expose the API but deny clipboard writes.
    }
  }
  try {
    // execCommand only reports that the legacy attempt was handled. It cannot
    // verify that the expected payload reached the clipboard.
    environment.legacyCopy(text);
    return false;
  } catch {
    return false;
  }
}
