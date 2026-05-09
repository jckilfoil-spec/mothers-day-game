/** Tiny DOM helpers — keep screen modules concise without pulling in a UI framework. */

export type Children = (Node | string | null | undefined | false)[];

type AttrValue = string | number | boolean | null | undefined | EventListener;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  children: Children = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, raw] of Object.entries(attrs)) {
    if (raw === false || raw === null || raw === undefined) continue;
    if (key.startsWith('on') && typeof raw === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), raw);
    } else if (key === 'class') {
      node.className = String(raw);
    } else if (key === 'html') {
      node.innerHTML = String(raw);
    } else if (key in node && typeof raw !== 'string') {
      // direct property assignment (value, checked, disabled, etc.)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (node as any)[key] = raw;
    } else {
      node.setAttribute(key, String(raw));
    }
  }
  appendChildren(node, children);
  return node;
}

export function appendChildren(parent: Node, children: Children): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (typeof child === 'string') {
      parent.appendChild(document.createTextNode(child));
    } else {
      parent.appendChild(child);
    }
  }
}

export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function mount(parent: HTMLElement, child: Node): void {
  clear(parent);
  parent.appendChild(child);
}
