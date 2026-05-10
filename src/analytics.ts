/**
 * Analytics call sites.
 *
 * The actual PostHog initialization + cookie-consent gating + global error
 * listeners + Tally postMessage handler all live in the inline `<script>` in
 * `index.html` (per HANDOFF: must run in <head> before any other custom script).
 *
 * That inline script:
 *   1. Sets `window.track = function () {}` immediately as a no-op shim — so
 *      callsites are safe to fire from page-load forward, even before consent.
 *   2. On user `Accept`, loads the PostHog snippet, initializes it, then
 *      replaces `window.track` with the real `ph.capture` wrapper.
 *   3. On user `Decline`, never loads PostHog. `window.track` stays a no-op.
 *
 * This module is the typed surface that game code imports. It just forwards to
 * `window.track` if present. That keeps consent gating in one place (the
 * inline script) and lets game code stay framework-agnostic.
 */

declare global {
  interface Window {
    track?: (event: string, props?: Record<string, unknown>) => void;
    __currentScreen?: { name: string; enteredAt: number };
    __levelAttempts?: Record<string, number>;
  }
}

/** Every event we emit. Mirror of the matrix in HANDOFF.md (OneDrive copy). */
export type AnalyticsEvent =
  | 'screen_viewed'
  | 'game_started'
  | 'game_finished'
  | 'level_started'
  | 'level_completed'
  | 'level_failed'
  | 'level_abandoned'
  | 'character_created'
  | 'character_updated'
  | 'character_deleted'
  | 'back_to_menu'
  | 'feedback_button_clicked'
  | 'feedback_submitted'
  | 'share_link_copied'
  | 'share_native_used'
  | 'difficulty_picked';

/** Send an analytics event. No-op if PostHog isn't initialized (pre-consent or declined). */
export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && typeof window.track === 'function') {
    window.track(event, props);
  }
}

/** Record a screen transition. Returns the previous screen + ms spent on it,
 *  for use as `screen_viewed` event properties. Updates the global `__currentScreen`. */
export function recordScreenTransition(name: string): {
  previous_screen: string | null;
  time_on_previous_screen_ms: number;
} {
  const now = Date.now();
  const prev = (typeof window !== 'undefined' && window.__currentScreen) || null;
  const result = {
    previous_screen: prev?.name ?? null,
    time_on_previous_screen_ms: prev ? now - prev.enteredAt : 0,
  };
  if (typeof window !== 'undefined') {
    window.__currentScreen = { name, enteredAt: now };
  }
  return result;
}

/** Bump the per-session attempt counter for a given map. Returns the new count. */
export function bumpAttempt(map: string): number {
  if (typeof window === 'undefined') return 1;
  if (!window.__levelAttempts) window.__levelAttempts = {};
  const next = (window.__levelAttempts[map] ?? 0) + 1;
  window.__levelAttempts[map] = next;
  return next;
}

/** Read current attempt count without incrementing. Defaults to 1. */
export function currentAttempt(map: string): number {
  if (typeof window === 'undefined') return 1;
  return window.__levelAttempts?.[map] ?? 1;
}
