"use strict";

/**
 * DOM حداقلی برای اجرای app.js در Node.
 * هدفش fidelity کامل نیست؛ فقط در حدی است که کد واقعی رابط کاربری
 * (رندر جدول، وضعیت داده، ماشین‌حساب، تنظیمات) اجرا و بررسی شود.
 */

const VOID = new Set(["br", "img", "input", "meta", "link", "hr", "source", "area", "col", "embed", "track", "wbr"]);

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

class ClassList {
  constructor(el) {
    this.el = el;
  }
  get set() {
    return new Set((this.el._attrs.class || "").split(/\s+/).filter(Boolean));
  }
  _write(set) {
    this.el._attrs.class = [...set].join(" ");
  }
  add(...names) {
    const s = this.set;
    names.forEach((n) => s.add(n));
    this._write(s);
  }
  remove(...names) {
    const s = this.set;
    names.forEach((n) => s.delete(n));
    this._write(s);
  }
  contains(name) {
    return this.set.has(name);
  }
  toggle(name, force) {
    const has = this.contains(name);
    const want = force === undefined ? !has : !!force;
    if (want) this.add(name);
    else this.remove(name);
    return want;
  }
  toString() {
    return this.el._attrs.class || "";
  }
}

class El {
  constructor(tag, owner) {
    this.tagName = String(tag).toUpperCase();
    this.nodeName = this.tagName;
    this.children = [];
    this.parentNode = null;
    this._attrs = {};
    this._listeners = {};
    this._owner = owner;
    this._html = "";
    const self = this;
    this.classList = new ClassList(this);
    this.dataset = new Proxy(
      {},
      {
        get: (_t, k) => self._attrs["data-" + String(k).replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())],
        set: (_t, k, v) => {
          self._attrs["data-" + String(k).replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())] = String(v);
          return true;
        },
        has: (_t, k) =>
          ("data-" + String(k).replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())) in self._attrs,
      }
    );
  }

  get className() {
    return this._attrs.class || "";
  }
  set className(v) {
    this._attrs.class = String(v);
  }

  getAttribute(name) {
    return name in this._attrs ? this._attrs[name] : null;
  }
  setAttribute(name, value) {
    this._attrs[name] = String(value);
  }
  removeAttribute(name) {
    delete this._attrs[name];
  }
  hasAttribute(name) {
    return name in this._attrs;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i !== -1) this.children.splice(i, 1);
    return child;
  }

  get textContent() {
    if (!this.children.length) return this._text || "";
    return this.children.map((c) => c.textContent).join("");
  }
  set textContent(v) {
    this.children = [];
    this._html = "";
    this._text = String(v);
  }

  get innerHTML() {
    return this._html || this.children.map((c) => c.outerHTML || c.textContent).join("");
  }
  set innerHTML(html) {
    this._html = String(html);
    this.children = [];
    parseHTML(this._html, this._owner, this);
  }

  get outerHTML() {
    return "<" + this.tagName.toLowerCase() + ">" + this.innerHTML + "</" + this.tagName.toLowerCase() + ">";
  }

  addEventListener(type, fn) {
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  }
  removeEventListener(type, fn) {
    const arr = this._listeners[type] || [];
    const i = arr.indexOf(fn);
    if (i !== -1) arr.splice(i, 1);
  }
  dispatchEvent(evt) {
    const arr = this._listeners[evt.type] || [];
    evt.target = evt.target || this;
    evt.currentTarget = this;
    if (typeof evt.preventDefault !== "function") evt.preventDefault = () => {};
    if (typeof evt.stopPropagation !== "function") evt.stopPropagation = () => {};
    arr.forEach((fn) => fn.call(this, evt));
    return true;
  }
  focus() {}
  select() {}
  click() {
    this.dispatchEvent({ type: "click", target: this });
  }
  reset() {
    this.querySelectorAll("input, textarea").forEach((el) => {
      el.value = "";
    });
  }

  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
  querySelectorAll(sel) {
    const out = [];
    const parts = String(sel).trim().split(/\s+/).filter(Boolean).map(parseSimple);
    walk(this, (el) => {
      if (el === this) return;
      if (matchesChain(el, parts)) out.push(el);
    });
    return out;
  }

  matches(sel) {
    return matchesChain(this, String(sel).trim().split(/\s+/).filter(Boolean).map(parseSimple));
  }
}

function walk(node, fn) {
  for (const child of node.children) {
    if (child instanceof El) {
      fn(child);
      walk(child, fn);
    }
  }
}

/* ------------------------------ سلکتور ------------------------------ */
function parseSimple(part) {
  const out = { tag: null, id: null, classes: [], attrs: [] };
  const re = /([.#]?)([A-Za-z0-9_-]+)(?:\(([a-z-]+)\))?/g;
  const tokens = part.match(/^[a-zA-Z][\w-]*|#[\w-]+|\.[\w-]+|\[[^\]]+\]/g) || [];
  for (const token of tokens) {
    if (token.startsWith("#")) out.id = token.slice(1);
    else if (token.startsWith(".")) out.classes.push(token.slice(1));
    else if (token.startsWith("[")) {
      const m = token.slice(1, -1).split("=");
      out.attrs.push([m[0], m.length > 1 ? m[1].replace(/^["']|["']$/g, "") : undefined]);
    } else out.tag = token.toUpperCase();
  }
  return out;
}

function matchesSimple(el, part) {
  if (part.tag && el.tagName !== part.tag) return false;
  if (part.id && el.getAttribute("id") !== part.id) return false;
  for (const cls of part.classes) if (!el.classList.contains(cls)) return false;
  for (const [name, value] of part.attrs) {
    if (!el.hasAttribute(name)) return false;
    if (value !== undefined && el.getAttribute(name) !== value) return false;
  }
  return true;
}

function matchesChain(el, parts) {
  const last = parts[parts.length - 1];
  if (!matchesSimple(el, last)) return false;
  let node = el.parentNode;
  for (let i = parts.length - 2; i >= 0; i--) {
    let found = false;
    while (node) {
      if (node instanceof El && matchesSimple(node, parts[i])) {
        found = true;
        node = node.parentNode;
        break;
      }
      node = node && node.parentNode;
    }
    if (!found) return false;
  }
  return true;
}

/* ------------------------------ پارس HTML ------------------------------ */
/**
 * تجزیهٔ رشتهٔ HTML به درختی از El.
 * اگر `host` داده شود، گره‌های سطح اول فرزند همان عنصر می‌شوند و
 * parentNode به درستی ست می‌شود (برای سلکتورهای والد-فرزندی لازم است).
 */
function parseHTML(html, owner, host) {
  const stack = [host ? { children: host.children, node: host } : { children: [], node: null }];
  const attrRe = /([A-Za-z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = tagRe.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[5] !== undefined) {
      const text = decodeEntities(m[5]);
      if (text.trim() || text === " ") {
        top.children.push({ textContent: text, children: [], parentNode: top.node || null });
      }
      continue;
    }
    const isClose = m[1] === "/";
    const tag = m[2].toLowerCase();
    const attrText = m[3] || "";
    const selfClose = m[4] === "/";

    if (isClose) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].node && stack[i].node.tagName === tag.toUpperCase()) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const el = new El(tag, owner);
    el.parentNode = top.node || null;
    let a;
    attrRe.lastIndex = 0;
    while ((a = attrRe.exec(attrText))) {
      el.setAttribute(
        a[1],
        decodeEntities(a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : "")
      );
    }
    top.children.push(el);
    if (!VOID.has(tag) && !selfClose) stack.push({ children: el.children, node: el });
  }
  return host ? host.children : stack[0].children;
}

/* ------------------------------ document ------------------------------ */
function makeDocument(html, owner) {
  const root = new El("html", owner);
  root.innerHTML = html || "";
  root.childNodes = root.children;

  const listeners = {};
  const document = {
    documentElement: root,
    body: root.querySelector("body") || root,
    head: root.querySelector("head") || root,
    readyState: "complete",
    createElement: (tag) => new El(tag, owner),
    getElementById: (id) => root.querySelector("#" + id),
    querySelector: (sel) => root.querySelector(sel),
    querySelectorAll: (sel) => root.querySelectorAll(sel),
    addEventListener: (type, fn) => {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    removeEventListener: (type, fn) => {
      const arr = listeners[type] || [];
      const i = arr.indexOf(fn);
      if (i !== -1) arr.splice(i, 1);
    },
    dispatchEvent: (evt) => {
      (listeners[evt.type] || []).forEach((fn) => fn(evt));
      return true;
    },
    execCommand: () => true,
    _listeners: listeners,
    _root: root,
  };
  return document;
}

module.exports = { El, makeDocument, parseHTML, VOID };
