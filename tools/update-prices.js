#!/usr/bin/env node
/**
 * به‌روزرسانی خودکار نرخ‌ها (GitHub Actions).
 *
 * یک منبع API را صدا می‌زند، پاسخ را نرمال می‌کند و نتیجه را در
 * data/latest.json می‌نویسد. سایت این فایل را به عنوان «کش خودکار مخزن»
 * می‌خواند؛ بنابراین حتی اگر مرورگر کاربر به دلیل CORS نتواند مستقیم به
 * منبع وصل شود، نرخ‌ها تازه می‌مانند.
 *
 * استفاده:
 *   node tools/update-prices.js --url "<API_URL>" --out data/latest.json
 *
 * متغیرهای محیطی:
 *   BRSAPI_KEY   کلید API (در URL با {KEY} جای‌گذاری می‌شود)
 *   EXIT_CODE    در صورت شکست ۱ برمی‌گرداند تا ورک‌فلو خطا بدهد
 */
"use strict";

const fs = require("fs");
const path = require("path");
const N = require("../assets/js/normalize.js");

function parseArgs(argv) {
  const args = { url: "", out: "data/latest.json", timeout: 20000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") args.url = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--timeout") args.timeout = Number(argv[++i]);
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

const DEFAULT_URL =
  "https://api.brsapi.ir/Market/Gold_Currency_Pro.php?key={KEY}&section=gold,currency";

function resolveUrl(url) {
  const key = process.env.BRSAPI_KEY || "";
  return url.replace(/\{KEY\}/g, encodeURIComponent(key));
}

function fetchJson(url, timeout) {
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } })
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status + " از " + url);
        return res.json();
      })
      .then((json) => {
        clearTimeout(timer);
        resolve(json);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("node tools/update-prices.js --url <API_URL> --out data/latest.json");
    return 0;
  }

  const url = args.url || DEFAULT_URL;
  const key = process.env.BRSAPI_KEY;

  if (/\{KEY\}/.test(url) && !key) {
    console.error("✗ متغیر BRSAPI_KEY تنظیم نشده؛ نمی‌توان منبع کلیددار را صدا زد.");
    return 1;
  }

  const target = resolveUrl(url);
  console.log("→ دریافت از: " + target.replace(/key=[^&]*/i, "key=***"));

  const json = await fetchJson(target, args.timeout);
  if (json && json.successful === false) {
    console.error("✗ منبع خطا برگرداند: " + (json.message_error || "نامشخص"));
    return 1;
  }

  const snapshot = N.fromBrsApi(json, {
    source: process.env.SOURCE_LABEL || "BrsApi",
    sourceId: "actions",
  });

  const count = N.count(snapshot);
  if (!count) {
    console.error("✗ هیچ نماد قابل‌استفاده‌ای در پاسخ نبود.");
    return 1;
  }

  const usd = N.get(snapshot, "USD");
  const gold = N.get(snapshot, "IR_GOLD_18K");
  const symbols = Object.keys(snapshot.items).sort();

  const outFile = path.resolve(process.cwd(), args.out);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  console.log("✓ " + count + " نماد نوشته شد در " + path.relative(process.cwd(), outFile));
  console.log("  نمادها: " + symbols.join(", "));
  if (usd) console.log("  USD = " + usd.price + " " + usd.unit + " (" + usd.changePercent + "%)");
  if (gold) console.log("  طلای ۱۸ عیار = " + gold.price + " " + gold.unit);
  console.log("  asOf = " + snapshot.asOf + " (" + new Date(snapshot.asOf * 1000).toISOString() + ")");
  return 0;
}

if (require.main === module) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error("✗ شکست: " + (err && err.message ? err.message : err));
      process.exit(1);
    });
}

module.exports = { parseArgs, resolveUrl, main, DEFAULT_URL };
