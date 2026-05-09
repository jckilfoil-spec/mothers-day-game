/** Entry point. Wires the router to the app root and dispatches to screens. */

import { Router, type Cleanup, type Route } from './router.js';
import { titleScreen } from './screens/title.js';
import { characterManagerScreen } from './screens/characterManager.js';
import { characterEditorScreen } from './screens/characterEditor.js';
import { mapSelectScreen } from './screens/mapSelect.js';
import { gameScreen } from './screens/game.js';
import { winScreen } from './screens/win.js';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root element');

const router = new Router((route, nav): Cleanup => {
  return mountRoute(root, route, nav);
});

function mountRoute(host: HTMLElement, route: Route, nav: (r: Route) => void): Cleanup {
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
