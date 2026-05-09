/** Minimal in-memory router. Screens receive their full route + a `nav` callback to switch. */

import type { MapId } from './state.js';

export type Route =
  | { name: 'title' }
  | { name: 'characters' }
  | { name: 'editor'; characterId: string | null }
  | { name: 'mapSelect' }
  | { name: 'game'; map: MapId }
  | { name: 'win'; map: MapId };

export type Nav = (route: Route) => void;

export type Cleanup = void | (() => void);

export type Screen = (root: HTMLElement, nav: Nav, route: Route) => Cleanup;

export class Router {
  private current: Route = { name: 'title' };
  private cleanup: Cleanup | null = null;
  private mountFn: (route: Route, nav: Nav) => Cleanup;

  constructor(mountFn: (route: Route, nav: Nav) => Cleanup) {
    this.mountFn = mountFn;
  }

  start(initial: Route = { name: 'title' }): void {
    this.go(initial);
  }

  go = (route: Route): void => {
    if (this.cleanup) {
      try {
        (this.cleanup as () => void)();
      } catch (e) {
        console.error('Screen cleanup failed:', e);
      }
      this.cleanup = null;
    }
    this.current = route;
    const result = this.mountFn(route, this.go);
    this.cleanup = result;
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  };

  getRoute(): Route {
    return this.current;
  }
}
