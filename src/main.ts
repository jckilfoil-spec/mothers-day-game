/** Entry point. Wires the router to the app root and dispatches to screens. */

import { Router, type Cleanup, type Route } from './router.js';
import { track, recordScreenTransition } from './analytics.js';
import { getSettings } from './state.js';
import { titleScreen } from './screens/title.js';
import { characterManagerScreen } from './screens/characterManager.js';
import { characterEditorScreen } from './screens/characterEditor.js';
import { mapSelectScreen } from './screens/mapSelect.js';
import { gameScreen } from './screens/game.js';
import { winScreen } from './screens/win.js';

// Audit override: `?touch=1` forces the touch-controls layout regardless of
// pointer type. mobile-audit.html iframes can't fire `@media (pointer: coarse)`,
// so without this we'd be auditing the desktop UI on every emulated phone.
if (new URLSearchParams(location.search).get('touch') === '1') {
  document.body.classList.add('force-touch');
}

// Apply persisted a11y body classes before first paint so users with
// reduce-motion / high-contrast / larger-text don't see a flash of motion or
// small text on initial load.
const initialSettings = getSettings();
if (initialSettings.reduceMotion) document.body.classList.add('reduce-motion');
if (initialSettings.highContrast) document.body.classList.add('hc');
if (initialSettings.largeText) document.body.classList.add('lg-text');

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root element');

const router = new Router((route, nav): Cleanup => {
  return mountRoute(root, route, nav);
});

function mountRoute(host: HTMLElement, route: Route, nav: (r: Route) => void): Cleanup {
  // Hide the floating Feedback button during gameplay so it doesn't sit on top
  // of the canvas HUD. CSS rule: body.gameplay-active .feedback-btn { display: none }.
  document.body.classList.toggle('gameplay-active', route.name === 'game');
  // Hide the cookie consent banner on the win screen so it doesn't sit over the celebration.
  document.body.classList.toggle('final-screen', route.name === 'win');

  // Analytics: every screen transition fires `screen_viewed` (with timing for
  // the previous screen). Landing on title/characters from elsewhere also fires
  // `back_to_menu` per the event matrix.
  const transition = recordScreenTransition(route.name);
  track('screen_viewed', {
    screen_name: route.name,
    previous_screen: transition.previous_screen,
    time_on_previous_screen_ms: transition.time_on_previous_screen_ms,
  });
  if (
    (route.name === 'title' || route.name === 'characters') &&
    transition.previous_screen &&
    transition.previous_screen !== route.name
  ) {
    track('back_to_menu', { from_screen: transition.previous_screen });
  }

  switch (route.name) {
    case 'title':
      return titleScreen(host, nav, route);
    case 'characters':
      return characterManagerScreen(host, nav, route);
    case 'editor':
      return characterEditorScreen(host, nav, route);
    case 'mapSelect':
      return mapSelectScreen(host, nav, route);
    case 'game':
      return gameScreen(host, nav, route);
    case 'win':
      return winScreen(host, nav, route);
  }
}

router.start({ name: 'title' });
