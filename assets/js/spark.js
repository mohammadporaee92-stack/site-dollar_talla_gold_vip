/**
 * نمودار کوچک (sparkline) — بدون کتابخانهٔ خارجی، خروجی SVG.
 *
 * اگر دادهٔ تاریخی واقعی در دسترس باشد از همان استفاده می‌کند؛ در غیر این صورت
 * یک مسیر هموارِ قطعی (deterministic) از «قیمت فعلی و درصد تغییر» می‌سازد تا
 * نمودار فقط جنبهٔ بصری داشته باشد و کاربر را گمراه نکند (در UI هم ذکر می‌شود).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DG_spark = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * ساخت سری زمانی هموار و قطعی.
   * نقطهٔ آخر همیشه برابر price است و اختلاف اول و آخر برابر changePercent.
   */
  function synthSeries(price, changePercent, points, seedText) {
    var n = points || 12;
    var p = Number(price) || 0;
    var pct = Number(changePercent);
    if (!p) return [];
    if (!isFinite(pct)) pct = 0;
    var start = pct === 0 ? p : p / (1 + pct / 100);

    // هَش ساده از نماد تا شکل نمودار برای هر دارایی ثابت و متمایز باشد
    var h = 0;
    var s = String(seedText || "x");
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
    function rand(k) {
      h = (h * 1103515245 + 12345 + k * 7919) % 2147483647;
      return (h % 1000) / 1000;
    }

    var out = [];
    for (var k = 0; k < n; k++) {
      var t = k / (n - 1);
      var base = start + (p - start) * t;
      var wobble = (rand(k) - 0.5) * Math.abs(p - start) * 0.55;
      if (k === 0) wobble = 0;
      if (k === n - 1) out.push(p);
      else out.push(base + wobble);
    }
    return out;
  }

  /**
   * @returns {{path:string, points:Array, direction:string, synthetic:boolean}}
   */
  function build(values, opts) {
    opts = opts || {};
    var width = opts.width || 84;
    var height = opts.height || 30;
    var pad = 3;
    var vals = (values || []).map(Number).filter(function (v) { return isFinite(v); });
    if (vals.length < 2) return null;

    var min = Math.min.apply(null, vals);
    var max = Math.max.apply(null, vals);
    var span = max - min || 1;
    var step = (width - pad * 2) / (vals.length - 1);

    var pts = vals.map(function (v, i) {
      var x = pad + i * step;
      var y = height - pad - ((v - min) / span) * (height - pad * 2);
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    });

    var d = pts.map(function (pt, i) {
      return (i === 0 ? "M" : "L") + pt[0] + " " + pt[1];
    }).join(" ");

    var direction = vals[vals.length - 1] >= vals[0] ? "up" : "down";
    return { path: d, points: pts, direction: direction, width: width, height: height };
  }

  /** ساخت رشتهٔ SVG آمادهٔ درج در DOM */
  function svg(item, opts) {
    opts = opts || {};
    var values = Array.isArray(item.history) && item.history.length > 1
      ? item.history
      : synthSeries(item.price, item.changePercent, opts.points || 12, item.symbol);
    var g = build(values, opts);
    if (!g) return "";
    var color = g.direction === "up" ? "#25c98a" : "#ff5c6c";
    var id = "sp-" + String(item.symbol).replace(/[^a-z0-9]/gi, "").toLowerCase();
    return (
      '<svg class="spark" viewBox="0 0 ' + g.width + ' ' + g.height + '" ' +
      'role="img" aria-label="روند ' + (g.direction === "up" ? "صعودی" : "نزولی") + '" ' +
      'preserveAspectRatio="none">' +
      '<path d="' + g.path + '" fill="none" stroke="' + color + '" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>'
    );
  }

  return { synthSeries: synthSeries, build: build, svg: svg };
});
