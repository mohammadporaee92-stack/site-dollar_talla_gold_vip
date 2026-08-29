/**
 * ابزارهای قالب‌بندی — اعداد فارسی، واحد پول، زمان.
 * این فایل هم در مرورگر و هم در Node (برای تست) قابل استفاده است.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DG_format = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

  /** فقط ارقام را فارسی می‌کند (بدون دست‌زدن به جداکننده‌ها) */
  function digits(value) {
    return String(value).replace(/\d/g, function (d) {
      return FA_DIGITS[Number(d)];
    });
  }

  /**
   * ارقام فارسی + جداکنندهٔ هزارگان «٬» و اعشار «٫» مطابق تایپوگرافی فارسی.
   */
  function toFa(value) {
    return digits(value).replace(/,/g, "٬").replace(/\./g, "٫");
  }

  function toEn(value) {
    return String(value).replace(/[۰-۹]/g, function (d) {
      return String(FA_DIGITS.indexOf(d));
    });
  }

  function isNum(n) {
    return typeof n === "number" && isFinite(n);
  }

  /** 1234567 → «۱٬۲۳۴٬۵۶۷» */
  function money(value, opts) {
    opts = opts || {};
    if (value === null || value === undefined || value === "") return "—";
    var n = typeof value === "number" ? value : Number(toEn(value));
    if (!isNum(n)) return "—";
    var frac = opts.decimals === undefined ? 0 : opts.decimals;
    var s = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: frac,
      maximumFractionDigits: frac,
    }).format(n);
    return toFa(s);
  }

  /** قیمت + واحد، مثل «۲۰۱٬۷۰۰ تومان» */
  function price(value, unit, opts) {
    opts = opts || {};
    var v = money(value, opts);
    if (v === "—") return v;
    return v + " " + (unit || "تومان");
  }

  /** اعداد خیلی بزرگ را کوتاه می‌کند: 224000000 → «۲۲۴ میلیون» */
  function compactToman(value) {
    var n = Number(value);
    if (!isNum(n)) return "—";
    var sign = n < 0 ? "−" : "";
    n = Math.abs(n);
    if (n >= 1e9) return sign + toFa((n / 1e9).toFixed(2).replace(/\.?0+$/, "")) + " میلیارد";
    if (n >= 1e6) return sign + toFa((n / 1e6).toFixed(2).replace(/\.?0+$/, "")) + " میلیون";
    if (n >= 1e3) return sign + toFa((n / 1e3).toFixed(1).replace(/\.0$/, "")) + " هزار";
    return sign + money(n);
  }

  /** ۱٫۳۹٪ → «۱٫۳۹٪+» */
  function percent(value, opts) {
    opts = opts || {};
    if (value === null || value === undefined || value === "") return "—";
    var n = Number(value);
    if (!isNum(n)) return "—";
    var digits = opts.decimals === undefined ? 2 : opts.decimals;
    var body = toFa(Math.abs(n).toFixed(digits));
    var sign = n > 0 ? "+" : n < 0 ? "−" : "";
    return sign + body + "٪";
  }

  function deltaClass(value) {
    var n = Number(value);
    if (!isNum(n) || n === 0) return "flat";
    return n > 0 ? "up" : "down";
  }

  /** زمان یونیکس → «۱۶:۲۹» و تاریخ → «۱۴۰۵/۰۶/۰۷» با ارقام فارسی */
  function clock(timeUnix) {
    if (!timeUnix) return "";
    var d = new Date(Number(timeUnix) * 1000);
    if (isNaN(d.getTime())) return "";
    var hh = String(d.getHours()).padStart(2, "0");
    var mm = String(d.getMinutes()).padStart(2, "0");
    return toFa(hh + ":" + mm);
  }

  /** «۵ دقیقه پیش» */
  function timeAgo(timeUnix, now) {
    if (!timeUnix) return "نامشخص";
    var then = Number(timeUnix) * 1000;
    var t = (now || Date.now()) - then;
    if (t < 0) t = 0;
    var mins = Math.floor(t / 60000);
    if (mins < 1) return "همین حالا";
    if (mins < 60) return toFa(mins) + " دقیقه پیش";
    var hours = Math.round(mins / 60);
    if (hours < 24) return toFa(hours) + " ساعت پیش";
    var days = Math.round(hours / 24);
    if (days < 31) return toFa(days) + " روز پیش";
    return toFa(Math.round(days / 30)) + " ماه پیش";
  }

  /** تاریخ شمسی از Intl (بدون کتابخانه جانبی) */
  function jalaliDate(date, locale) {
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat(locale || "fa-IR-u-ca-persian", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    } catch (e) {
      return d.toLocaleDateString();
    }
  }

  return {
    digits: digits,
    toFa: toFa,
    toEn: toEn,
    money: money,
    price: price,
    compactToman: compactToman,
    percent: percent,
    deltaClass: deltaClass,
    clock: clock,
    timeAgo: timeAgo,
    jalaliDate: jalaliDate,
  };
});
