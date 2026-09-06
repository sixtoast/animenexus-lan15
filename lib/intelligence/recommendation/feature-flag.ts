/**
 * Soft enable Recommendation Intelligence V3.
 * Client: localStorage key an_rec_v3 = "1"
 * Server/build: NEXT_PUBLIC_REC_V3=1
 * Default: off (legacy path) until validated in lab.
 */

export const REC_V3_STORAGE_KEY = "an_rec_v3";

export function isRecV3Enabled(): boolean {
  if (process.env.NEXT_PUBLIC_REC_V3 === "1") return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(REC_V3_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setRecV3Enabled(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(REC_V3_STORAGE_KEY, "1");
    else window.localStorage.removeItem(REC_V3_STORAGE_KEY);
    window.dispatchEvent(new Event("animenexus:rec-v3"));
  } catch {
    /* */
  }
}
