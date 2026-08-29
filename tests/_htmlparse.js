"use strict";

/**
 * پارسر خیلی سادهٔ HTML برای تست‌های ساختاری.
 * فقط چیزی را استخراج می‌کند که لازم داریم: شناسه‌ها، جفت‌شدن تگ‌ها و متن.
 */

const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

class HTMLParser {
  constructor(html) {
    this.html = String(html);
  }

  parse() {
    // حذف کامنت‌ها تا تگ‌های داخل کامنت شمرده نشوند
    const html = this.html.replace(/<!--[\s\S]*?-->/g, "");
    const ids = [];
    const seen = new Set();
    const duplicateIds = [];
    const stack = [];
    const unclosed = [];
    const strayClose = [];

    const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
    let m;
    while ((m = tagRe.exec(html))) {
      const isClose = m[1] === "/";
      const name = m[2].toLowerCase();
      const attrs = m[3] || "";
      const selfClose = m[4] === "/";

      const idMatch = attrs.match(/\sid="([^"]+)"/);
      if (idMatch) {
        if (seen.has(idMatch[1])) duplicateIds.push(idMatch[1]);
        else {
          seen.add(idMatch[1]);
          ids.push(idMatch[1]);
        }
      }

      if (VOID.has(name) || selfClose) continue;

      if (isClose) {
        const idx = stack.lastIndexOf(name);
        if (idx === -1) {
          strayClose.push(name);
        } else {
          // تگ‌های بازِ مانده روی پشته، بسته‌نشده حساب می‌شوند
          for (let i = stack.length - 1; i > idx; i--) unclosed.push(stack[i]);
          stack.length = idx;
        }
      } else {
        stack.push(name);
      }
    }

    for (const name of stack) unclosed.push(name);

    return { ids, duplicateIds, unclosed, strayClose };
  }
}

module.exports = { HTMLParser, VOID };
