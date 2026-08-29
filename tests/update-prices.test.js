"use strict";

/**
 * تست ابزار به‌روزرسانی خودکار نرخ‌ها (همان اسکریپتی که GitHub Actions اجرا می‌کند).
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tool = require("../tools/update-prices.js");
const { PRO_RESPONSE } = require("./fixtures.js");

function stubFetch(handler) {
  const original = global.fetch;
  global.fetch = handler;
  return () => {
    global.fetch = original;
  };
}

/** tool.main آرگومان را از process.argv می‌خواند */
function runTool(argv) {
  const originalArgv = process.argv;
  process.argv = ["node", "tools/update-prices.js"].concat(argv);
  return tool.main().finally(() => {
    process.argv = originalArgv;
  });
}

test("parseArgs مقادیر پیش‌فرض و آرگومان‌ها را درست می‌خواند", () => {
  const defaults = tool.parseArgs([]);
  assert.equal(defaults.url, "");
  assert.equal(defaults.out, "data/latest.json");
  assert.ok(tool.DEFAULT_URL.indexOf("brsapi.ir") !== -1, "آدرس پیش‌فرض باید BrsApi باشد");

  const args = tool.parseArgs(["--url", "https://x.test/a", "--out", "tmp/x.json", "--timeout", "1000"]);
  assert.equal(args.url, "https://x.test/a");
  assert.equal(args.out, "tmp/x.json");
  assert.equal(args.timeout, 1000);
});

test("resolveUrl کلید را از BRSAPI_KEY جای‌گذاری می‌کند", () => {
  process.env.BRSAPI_KEY = "ABC123";
  assert.equal(tool.resolveUrl("https://x.test/a?key={KEY}"), "https://x.test/a?key=ABC123");
  delete process.env.BRSAPI_KEY;
  assert.equal(tool.resolveUrl("https://x.test/a?key={KEY}"), "https://x.test/a?key=");
});

test("main خروجی نرمال‌شده را در فایل می‌نویسد", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dg-"));
  const out = path.join(dir, "nested", "latest.json");

  const seen = [];
  const restore = stubFetch((url) => {
    seen.push(String(url));
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PRO_RESPONSE) });
  });
  process.env.BRSAPI_KEY = "TESTKEY";
  try {
    const code = await runTool(["--url", "https://x.test/a?key={KEY}&section=gold,currency", "--out", out]);
    assert.equal(code, 0);
    assert.match(seen[0], /key=TESTKEY/, "کلید باید در درخواست باشد");
    assert.ok(fs.existsSync(out), "فایل باید ساخته شود (همراه با پوشهٔ والد)");

    const snap = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.equal(Object.keys(snap.items).length, 9);
    assert.equal(snap.items.USD.price, 201700);
    assert.equal(snap.items.IR_GOLD_18K.group, "gold");
    assert.equal(snap.sourceId, "actions");
    assert.ok(snap.asOf > 1700000000);
  } finally {
    restore();
    delete process.env.BRSAPI_KEY;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("بدون کلید و با آدرس کلیددار، با کد ۱ خارج می‌شود", async () => {
  delete process.env.BRSAPI_KEY;
  const code = await runTool(["--url", "https://x.test/a?key={KEY}"]);
  assert.equal(code, 1);
});

test("پاسخ خالی باعث شکست می‌شود تا ورک‌فلو خطا بدهد", async () => {
  const restore = stubFetch(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ gold: [] }) })
  );
  process.env.BRSAPI_KEY = "TESTKEY";
  try {
    const code = await runTool([
      "--url", "https://x.test/a?key={KEY}",
      "--out", path.join(os.tmpdir(), "dg-should-not-exist.json"),
    ]);
    assert.equal(code, 1);
  } finally {
    restore();
    delete process.env.BRSAPI_KEY;
  }
});

test("پاسخ با successful=false خطا می‌دهد", async () => {
  const restore = stubFetch(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ successful: false, message_error: "کلید نامعتبر است" }),
    })
  );
  process.env.BRSAPI_KEY = "BAD";
  try {
    const code = await runTool(["--url", "https://x.test/a?key={KEY}"]);
    assert.equal(code, 1);
  } finally {
    restore();
    delete process.env.BRSAPI_KEY;
  }
});
