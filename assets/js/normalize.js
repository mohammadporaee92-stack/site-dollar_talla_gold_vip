/**
 * نرمال‌سازی پاسخ منابع قیمت به یک ساختار واحد.
 * خروجی همیشه به این شکل است:
 *
 *   {
 *     asOf: 1749757080,          // آخرین زمان به‌روزرسانی (یونیکس)
 *     generatedAt: 1749757999,   // زمان تولید این فایل
 *     source: "BrsApi",
 *     items: { USD: { ...نماد... }, ... }
 *   }
 *
 * هر آیتم: { symbol, name, nameEn, unit, group, price, changeValue,
 *            changePercent, timeUnix, date, time }
 *
 * هم در مرورگر و هم در Node قابل اجراست.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DG_normalize = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* نام فارسی پیش‌فرض برای نمادهایی که API نام فارسی نمی‌دهد */
  var NAMES_FA = {
    USD: "دلار آمریکا",
    EUR: "یورو",
    GBP: "پوند انگلیس",
    AED: "درهم امارات",
    CHF: "فرانک سوئیس",
    CAD: "دلار کانادا",
    AUD: "دلار استرالیا",
    CNY: "یوآن چین",
    TRY: "لیر ترکیه",
    SAR: "ریال عربستان",
    QAR: "ریال قطر",
    OMR: "ریال عمان",
    BHD: "دینار بحرین",
    KWD: "دینار کویت",
    IQD: "دینار عراق",
    JPY: "صد ین ژاپن",
    INR: "روپیه هند",
    PKR: "روپیه پاکستان",
    AFN: "افغانی",
    SEK: "کرون سوئد",
    MYR: "رینگیت مالزی",
    RUB: "روبل روسیه",
    USDT_IRT: "دلار تتر",
    BTC: "بیت‌کوین",
    ETH: "اتریوم",
    XRP: "ریپل",
    BNB: "بایننس کوین",
    SOL: "سولانا",
    DOGE: "دوج‌کوین",
    LTC: "لایت‌کوین",
    TRX: "ترون",
    XAUUSD: "انس جهانی طلا",
    IR_GOLD_18K: "طلای ۱۸ عیار",
    IR_GOLD_24K: "طلای ۲۴ عیار",
    IR_GOLD_MELTED: "طلای آب‌شده",
    IR_COIN_EMAMI: "سکه امامی",
    IR_COIN_BAHAR: "سکه بهار آزادی",
    IR_COIN_HALF: "نیم سکه",
    IR_COIN_QUARTER: "ربع سکه",
    IR_COIN_1G: "سکه یک گرمی",
  };

  /* نام کوتاه برای نشان (badge) جدول */
  var BADGES = {
    USD: "USD", EUR: "EUR", GBP: "GBP", AED: "AED", CHF: "CHF", CAD: "CAD",
    AUD: "AUD", CNY: "CNY", TRY: "TRY", SAR: "SAR", QAR: "QAR", OMR: "OMR",
    BHD: "BHD", KWD: "KWD", IQD: "IQD", JPY: "JPY", INR: "INR", PKR: "PKR",
    AFN: "AFN", SEK: "SEK", MYR: "MYR", RUB: "RUB", USDT_IRT: "USDT",
    BTC: "BTC", ETH: "ETH", XRP: "XRP", BNB: "BNB", SOL: "SOL", DOGE: "DOGE",
    LTC: "LTC", TRX: "TRX",
    XAUUSD: "XAU", IR_GOLD_18K: "۱۸ع", IR_GOLD_24K: "۲۴ع",
    IR_GOLD_MELTED: "آب‌شده", IR_COIN_EMAMI: "امامی", IR_COIN_BAHAR: "بهار",
    IR_COIN_HALF: "نیم", IR_COIN_QUARTER: "ربع", IR_COIN_1G: "۱ گرمی",
  };

  var CRYPTO = ["USDT_IRT", "USDT", "BTC", "ETH", "XRP", "BNB", "SOL", "USDC",
    "ADA", "DOGE", "TRX", "LINK", "XLM", "AVAX", "SHIB", "LTC", "DOT", "UNI",
    "FIL", "ATOM", "MATIC", "POL"];

  function badge(symbol) {
    if (BADGES[symbol]) return BADGES[symbol];
    return symbol.replace(/^IR_/, "").slice(0, 6);
  }

  function nameFa(item) {
    return (item.name && String(item.name).trim()) || NAMES_FA[item.symbol] || item.nameEn || item.symbol;
  }

  function groupOf(symbol, section) {
    if (CRYPTO.indexOf(symbol) !== -1) return "crypto";
    if (symbol.indexOf("IR_COIN") === 0 || symbol.indexOf("IR_PCOIN") === 0) return "coin";
    if (symbol.indexOf("IR_GOLD") === 0 || symbol === "XAUUSD" || symbol === "XAGUSD") return "gold";
    if (section === "gold") return "gold";
    if (section === "currency") return "currency";
    if (/^[A-Z]{3}$/.test(symbol)) return "currency";
    return "other";
  }

  /** واحد را به «تومان» تبدیل می‌کند (انس طلا با واحد دلار دست‌نخورده می‌ماند) */
  function normalizeUnit(price, unit) {
    var u = String(unit || "").trim();
    if (u === "ریال" || u === "IRR" || u === "rial") return { price: price / 10, unit: "تومان" };
    if (u === "دلار" || u === "USD" || u === "usd") return { price: price, unit: "دلار" };
    return { price: price, unit: u || "تومان" };
  }

  function toNumber(v) {
    if (v === null || v === undefined || v === "") return null;
    var n = Number(String(v).replace(/[,\s۰-۹]/g, function (ch) {
      if (ch >= "۰" && ch <= "۹") return String("۰۱۲۳۴۵۶۷۸۹".indexOf(ch));
      return "";
    }));
    return isFinite(n) ? n : null;
  }

  /** یک آیتم خام را به آیتم نرمال تبدیل می‌کند */
  function normalizeItem(raw, section) {
    if (!raw || typeof raw !== "object") return null;
    var symbol = raw.symbol || raw.sym || raw.code;
    if (!symbol) return null;
    symbol = String(symbol).toUpperCase().trim();

    var price = toNumber(raw.price !== undefined ? raw.price : raw.value);
    if (price === null || price <= 0) return null;

    var changeValue = toNumber(raw.change_value !== undefined ? raw.change_value : raw.diff);
    var changePercent = toNumber(raw.change_percent !== undefined ? raw.change_percent : raw.percent);
    if (changePercent === null && changeValue !== null && price - changeValue !== 0) {
      changePercent = (changeValue / (price - changeValue)) * 100;
    }
    if (changePercent !== null) changePercent = Math.round(changePercent * 100) / 100;

    var unit = normalizeUnit(price, raw.unit);
    var timeUnix = toNumber(raw.time_unix || raw.timestamp || raw.ts) || null;

    return {
      symbol: symbol,
      name: nameFa(raw),
      nameEn: raw.name_en || raw.nameEn || symbol,
      badge: badge(symbol),
      group: groupOf(symbol, section),
      price: Math.round(unit.price * 100) / 100,
      changeValue: changeValue,
      changePercent: changePercent,
      unit: unit.unit,
      timeUnix: timeUnix,
      date: raw.date || null,
      time: raw.time || null,
    };
  }

  /**
   * پاسخ را می‌پیماید و همهٔ آرایه‌های حاوی آیتم قیمت را پیدا می‌کند.
   * با این کار هم ساختار Pro (gold.type / currency.free / ...) و هم
   * ساختار رایگان (gold / currency به صورت آرایهٔ تخت) پشتیبانی می‌شود.
   */
  function collectItems(node, section, out) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (var i = 0; i < node.length; i++) {
        var raw = node[i];
        if (raw && typeof raw === "object" && !Array.isArray(raw) && raw.symbol) {
          var item = normalizeItem(raw, section);
          if (item) out.push(item);
        } else {
          collectItems(raw, section, out);
        }
      }
      return;
    }
    Object.keys(node).forEach(function (key) {
      var child = node[key];
      var nextSection = section;
      if (key === "gold" || key === "currency" || key === "cryptocurrency" || key === "crypto") {
        nextSection = key === "crypto" ? "cryptocurrency" : key;
      }
      collectItems(child, nextSection, out);
    });
  }

  /** ورودی اصلی: پاسخ خام یک منبع → ساختار نرمال */
  function fromBrsApi(payload, meta) {
    meta = meta || {};
    var list = [];
    var root = payload && payload.data && typeof payload.data === "object" ? payload.data : payload;
    collectItems(root, null, list);

    var items = {};
    var latest = 0;
    list.forEach(function (item) {
      // اگر نماد تکراری بود، تازه‌ترین را نگه می‌داریم
      var prev = items[item.symbol];
      if (prev && (prev.timeUnix || 0) > (item.timeUnix || 0)) return;
      items[item.symbol] = item;
      if (item.timeUnix && item.timeUnix > latest) latest = item.timeUnix;
    });

    return {
      asOf: latest || null,
      generatedAt: meta.generatedAt || Math.floor(Date.now() / 1000),
      source: meta.source || "منبع ناشناس",
      sourceId: meta.sourceId || null,
      items: items,
    };
  }

  /** تعداد آیتم‌های قابل نمایش */
  function count(snapshot) {
    if (!snapshot || !snapshot.items) return 0;
    return Object.keys(snapshot.items).length;
  }

  /** گرفتن یک نماد از اسنپ‌شات */
  function get(snapshot, symbol) {
    if (!snapshot || !snapshot.items) return null;
    return snapshot.items[symbol] || null;
  }

  /** فهرست آیتم‌های یک گروه، به ترتیب آرایهٔ دلخواه (و بعد بقیه) */
  function byGroup(snapshot, group, order) {
    if (!snapshot || !snapshot.items) return [];
    var all = Object.keys(snapshot.items)
      .map(function (k) { return snapshot.items[k]; })
      .filter(function (it) { return it.group === group; });
    if (!order || !order.length) return all;
    var rank = {};
    order.forEach(function (s, i) { rank[s] = i; });
    return all.sort(function (a, b) {
      var ra = rank[a.symbol] === undefined ? 999 : rank[a.symbol];
      var rb = rank[b.symbol] === undefined ? 999 : rank[b.symbol];
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name, "fa");
    });
  }

  return {
    NAMES_FA: NAMES_FA,
    BADGES: BADGES,
    normalizeItem: normalizeItem,
    fromBrsApi: fromBrsApi,
    collectItems: collectItems,
    count: count,
    get: get,
    byGroup: byGroup,
    groupOf: groupOf,
    normalizeUnit: normalizeUnit,
  };
});
