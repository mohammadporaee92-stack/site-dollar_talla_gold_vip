/**
 * اجرای فایل‌های جاوااسکریپت مرورگری در Node برای تست.
 * یک «مرورگر حداقلی» می‌سازد: window، localStorage و fetch ساختگی.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const JS_DIR = path.join(__dirname, "..", "assets", "js");

function makeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    _dump: () => Object.fromEntries(store),
  };
}

/**
 * @param {string[]} files   نام فایل‌ها داخل assets/js (به ترتیب اجرا)
 * @param {object} [extra]  اعضای اضافی برای تزریق به window
 * @returns {{sandbox:object, window:object, storage:object, calls:object[]}}
 */
function loadBrowserEnv(files, extra) {
  const storage = makeLocalStorage();
  const calls = [];
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    Promise,
    Intl,
    AbortController,
    fetch: (url, opts) => {
      calls.push({ url, opts });
      return Promise.reject(new TypeError("Failed to fetch"));
    },
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.localStorage = storage;
  Object.assign(sandbox, extra || {});

  const context = vm.createContext(sandbox);
  for (const file of files) {
    const code = fs.readFileSync(path.join(JS_DIR, file), "utf8");
    vm.runInContext(code, context, { filename: file });
  }
  return { sandbox, window: sandbox, storage, calls, context };
}

/** پاسخ fetch ساختگی */
function jsonResponse(body, status) {
  const code = status || 200;
  return Promise.resolve({
    ok: code >= 200 && code < 300,
    status: code,
    json: () => Promise.resolve(body),
  });
}

module.exports = { loadBrowserEnv, jsonResponse, makeLocalStorage, JS_DIR };
