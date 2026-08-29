/**
 * اسکریپت اصلی رابط کاربری: تیکر، جدول قیمت‌ها، ماشین‌حساب، تنظیمات.
 */
(function () {
  "use strict";

  var CFG = window.DG_CONFIG || {};
  var API = window.DG_api;
  var N = window.DG_normalize;
  var C = window.DG_calc;
  var F = window.DG_format;
  var S = window.DG_spark;

  var state = {
    tab: "currency",
    query: "",
    data: null, // نتیجهٔ API.load
    timer: null,
  };

  /* ================================ ابزار DOM ================================ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function icon(name) {
    var paths = {
      up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
      down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
      flat: '<path d="M5 12h14"/>',
      refresh: '<path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
      gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 11 4a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 20 11a2 2 0 1 1 0 4z"/>',
      close: '<path d="M18 6 6 18M6 6l12 12"/>',
      menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
      copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
      check: '<path d="m5 13 4 4L19 7"/>',
      alert: '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
      inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || "") + "</svg>";
  }

  /* ================================ تیکر ================================ */
  function renderTicker() {
    var track = $(".ticker-track");
    if (!track || !state.data) return;
    var snap = state.data.snapshot;
    var list = (CFG.featured || []).map(function (sym) { return N.get(snap, sym); }).filter(Boolean);
    if (!list.length) list = N.byGroup(snap, "currency").slice(0, 8);

    var html = list.map(function (it) {
      var cls = F.deltaClass(it.changePercent);
      return '<span class="ticker-item">' +
        '<span class="tick-name">' + esc(it.name) + "</span>" +
        "<b>" + esc(F.money(it.price, { decimals: it.unit === "دلار" ? 2 : 0 })) + "</b>" +
        '<span style="color:var(--' + cls + ')">' + esc(F.percent(it.changePercent)) + "</span>" +
        "</span>";
    }).join("");

    track.innerHTML = html + html; // دوبار برای حرکت بی‌وقفه
  }

  /* ============================ کارت هیرو ============================ */
  function renderHeroCard() {
    var list = $(".mini-list");
    if (!list || !state.data) return;
    var snap = state.data.snapshot;
    var featured = ["USD", "IR_GOLD_18K", "IR_COIN_EMAMI", "XAUUSD"];
    var rows = featured.map(function (s) { return N.get(snap, s); }).filter(Boolean);

    if (!rows.length) {
      list.innerHTML = '<li class="empty-state">' + esc("داده‌ای برای نمایش نیست") + "</li>";
      return;
    }

    list.innerHTML = rows.map(function (it) {
      var cls = F.deltaClass(it.changePercent);
      var decimals = it.unit === "دلار" ? 2 : 0;
      return "<li>" +
        '<span class="mini-name">' + esc(it.name) + "<small>" + esc(it.symbol) + "</small></span>" +
        '<span class="mini-price">' + esc(F.money(it.price, { decimals: decimals })) +
        "<small>" + esc(it.unit) + "</small></span>" +
        '<span class="delta ' + cls + '">' + icon(cls === "flat" ? "flat" : cls === "up" ? "up" : "down") +
        esc(F.percent(it.changePercent)) + "</span>" +
        "</li>";
    }).join("");

    var usd = N.get(snap, "USD");
    var gold = N.get(snap, "IR_GOLD_18K");
    var ounce = N.get(snap, "XAUUSD");
    function setStat(sel, text) {
      var el = $(sel);
      if (el) el.textContent = text;
    }
    if (usd) setStat("#stat-usd", F.compactToman(usd.price) + " تومان");
    if (gold) setStat("#stat-gold", F.compactToman(gold.price) + " تومان");
    if (ounce) setStat("#stat-ounce", F.money(ounce.price, { decimals: 0 }) + " دلار");
  }

  /* ============================ جدول قیمت‌ها ============================ */
  var TAB_LABELS = { currency: "ارز", gold: "طلا", coin: "سکه", crypto: "رمزارز" };

  /**
   * آیتم‌های تب جاری.
   * اگر در config فهرستی برای آن تب تعریف شده باشد، همان فهرست ملاک است
   * (مثلاً تتر هم در تب ارز و هم در تب رمزارز دیده می‌شود)؛ در غیر این صورت
   * همهٔ نمادهای همان گروه نمایش داده می‌شوند.
   */
  function currentItems() {
    if (!state.data) return [];
    var snap = state.data.snapshot;
    var order = (CFG.tabs && CFG.tabs[state.tab]) || [];
    var items;
    if (order.length) {
      var wanted = {};
      order.forEach(function (sym, i) { wanted[sym] = i; });
      items = Object.keys(snap.items)
        .filter(function (sym) { return wanted[sym] !== undefined; })
        .map(function (sym) { return snap.items[sym]; })
        .sort(function (a, b) { return wanted[a.symbol] - wanted[b.symbol]; });
    } else {
      items = N.byGroup(snap, state.tab);
    }
    var q = state.query.trim();
    if (q) {
      var needle = F.toEn(q).toLowerCase();
      items = items.filter(function (it) {
        return it.symbol.toLowerCase().indexOf(needle) !== -1 ||
          it.name.indexOf(q) !== -1 ||
          (it.nameEn || "").toLowerCase().indexOf(needle) !== -1;
      });
    }
    return items;
  }

  function skeletonRows(count) {
    var out = "";
    for (var i = 0; i < count; i++) {
      out += '<tr class="skeleton-row"><td colspan="5">' +
        '<div class="sk" style="width:' + (40 + (i % 4) * 12) + '%"></div></td></tr>';
    }
    return out;
  }

  function renderTable() {
    var tbody = $("#prices-body");
    if (!tbody) return;

    if (!state.data) {
      tbody.innerHTML = skeletonRows(6);
      return;
    }

    var items = currentItems();
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">' + icon("inbox") +
        "<p>موردی با این فیلتر پیدا نشد.</p></div></td></tr>";
      return;
    }

    tbody.innerHTML = items.map(function (it) {
      var cls = F.deltaClass(it.changePercent);
      var decimals = it.unit === "دلار" ? 2 : 0;
      var changeValue = it.changeValue === null || it.changeValue === undefined
        ? "—" : F.money(Math.abs(it.changeValue), { decimals: decimals });
      return "<tr>" +
        "<td>" +
        '<span class="asset"><span class="asset-badge">' + esc(it.badge) + "</span>" +
        '<span class="asset-name">' + esc(it.name) + "<small>" + esc(it.nameEn || it.symbol) + "</small></span></span>" +
        "</td>" +
        '<td class="num">' + esc(F.money(it.price, { decimals: decimals })) + "<small>" + esc(it.unit) + "</small></td>" +
        '<td class="num" style="color:var(--' + cls + ')">' + esc(changeValue) + "</td>" +
        '<td><span class="delta ' + cls + '">' + icon(cls === "flat" ? "flat" : cls === "up" ? "up" : "down") +
        esc(F.percent(it.changePercent)) + "</span></td>" +
        "<td>" + S.svg(it, { points: CFG.sparkPoints }) + "</td>" +
        '<td><div class="row-actions"><button class="copy-btn" type="button" data-copy="' +
        esc(it.symbol) + '">' + icon("copy") + " کپی</button></div></td>" +
        "</tr>";
    }).join("");

    $$(".copy-btn", tbody).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var symbol = btn.getAttribute("data-copy");
        var it = state.data && N.get(state.data.snapshot, symbol);
        if (!it) return;
        copyText(F.toEn(String(Math.round(it.price))) + " (" + it.name + ")");
        btn.classList.add("ok");
        var label = btn.innerHTML;
        btn.innerHTML = icon("check") + " کپی شد";
        setTimeout(function () {
          btn.classList.remove("ok");
          btn.innerHTML = label;
        }, 1600);
      });
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); });
    } else {
      legacyCopy(text);
    }
  }
  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ============================ وضعیت داده ============================ */
  function renderStatus() {
    var el = $("#data-status");
    if (!el) return;
    if (!state.data) {
      el.innerHTML = '<span class="dot"></span> در حال دریافت نرخ‌ها…';
      return;
    }
    var d = state.data;
    var snap = d.snapshot;
    var dotClass = d.mode.indexOf("cache") === 0 || d.mode === "live" ? "live" : d.mode === "auto" ? "stale" : "off";
    var modeLabel = {
      live: "اتصال زنده",
      "cache-live": "اتصال زنده (کش)",
      cache: "کش مرورگر",
      auto: "کش خودکار مخزن",
      manual: "دیتای دستی",
    }[d.mode] || d.mode;

    el.innerHTML =
      '<span class="dot ' + dotClass + '"></span>' +
      esc(modeLabel) + " · " + esc(snap.source || "—") +
      " · آخرین نرخ: <b>" + esc(F.timeAgo(snap.asOf)) + "</b>" +
      " (" + esc(F.clock(snap.asOf)) + ")";

    var warn = $("#source-warning");
    if (warn) {
      var failed = (d.log || []).filter(function (l) { return l.status === "error" || l.status === "skipped"; });
      if (d.mode !== "live" && failed.length) {
        warn.classList.add("show");
        warn.innerHTML = icon("alert") +
          "<div><b>قیمت‌ها به‌صورت زنده دریافت نشد.</b><br>" +
          esc(failed.map(function (f) { return f.label + ": " + f.note; }).join(" | ")) +
          '<br>برای اتصال زنده، کلید رایگان API را در <button class="copy-btn" type="button" id="warn-open-settings">تنظیمات</button> وارد کنید.</div>';
        var b = $("#warn-open-settings");
        if (b) b.addEventListener("click", openSettings);
      } else {
        warn.classList.remove("show");
        warn.innerHTML = "";
      }
    }
  }

  /* ============================ ماشین‌حساب ============================ */
  function fillSelects() {
    if (!state.data) return;
    var snap = state.data.snapshot;

    var cur = $("#calc-currency");
    if (cur) {
      var wanted = ["USD", "EUR", "AED", "GBP", "TRY", "CHF", "CAD", "AUD", "USDT_IRT"];
      var list = wanted.map(function (s) { return N.get(snap, s); }).filter(Boolean);
      if (!list.length) list = N.byGroup(snap, "currency").slice(0, 10);
      var prev = cur.value;
      cur.innerHTML = list.map(function (it) {
        return '<option value="' + esc(it.symbol) + '">' + esc(it.name) + "</option>";
      }).join("");
      if (prev && N.get(snap, prev)) cur.value = prev;
    }

    var goldSel = $("#gold-type");
    if (goldSel) {
      var gsyms = (CFG.goldCalcSymbols || []).map(function (s) { return N.get(snap, s); }).filter(Boolean);
      var prevG = goldSel.value;
      goldSel.innerHTML = gsyms.map(function (it) {
        return '<option value="' + esc(it.symbol) + '">' + esc(it.name) + "</option>";
      }).join("");
      if (prevG && N.get(snap, prevG)) goldSel.value = prevG;
    }
  }

  function runCurrencyCalc() {
    var out = $("#calc-currency-result");
    if (!out || !state.data) return;
    var symbol = $("#calc-currency").value;
    var it = N.get(state.data.snapshot, symbol);
    var amount = $("#calc-amount").value;
    var fee = $("#calc-fee").value;
    if (!it) return;
    var res = C.currency(amount, it.price, fee);
    if (!res) {
      out.innerHTML = '<span class="hint">مقدار را وارد کنید تا نتیجه نمایش داده شود.</span>';
      return;
    }
    out.innerHTML =
      "<b>" + esc(F.money(res.total)) + " <small>تومان</small></b>" +
      "<span>" + esc(F.toEn(amount) || "۰") + " × " + esc(F.money(res.rate)) +
      (res.fee ? " + کارمزد " + esc(F.money(res.fee)) : "") + "</span>";
  }

  function runGoldCalc() {
    var out = $("#gold-result");
    if (!out || !state.data) return;
    var symbol = $("#gold-type").value;
    var it = N.get(state.data.snapshot, symbol);
    var weight = $("#gold-weight").value;
    var extra = $("#gold-extra").value;
    if (!it) return;
    var res = C.gold(weight, it.price, extra);
    if (!res) {
      out.innerHTML = '<span class="hint">وزن را وارد کنید تا نتیجه نمایش داده شود.</span>';
      return;
    }
    out.innerHTML =
      "<b>" + esc(F.money(res.total)) + " <small>تومان</small></b>" +
      "<span>نرخ هر گرم " + esc(F.money(res.perGram)) +
      (res.wages ? " · اجرت و سود " + esc(F.money(res.wages)) : "") + "</span>";
  }

  /** ارزش‌گذاری طلای دست‌دوم بر اساس عیار */
  function runKaratCalc() {
    var out = $("#karat-result");
    if (!out || !state.data) return;
    var rate24 = N.get(state.data.snapshot, "IR_GOLD_24K");
    if (!rate24) {
      out.innerHTML = '<span class="hint">نرخ طلای ۲۴ عیار در دسترس نیست.</span>';
      return;
    }
    var weight = $("#karat-weight").value;
    var karat = $("#karat-value").value;
    var res = C.karatValue(weight, karat, rate24.price);
    if (!res) {
      out.innerHTML = '<span class="hint">وزن را وارد کنید تا ارزش طلای خالص نمایش داده شود.</span>';
      return;
    }
    out.innerHTML =
      "<b>" + esc(F.money(res.value)) + " <small>تومان</small></b>" +
      "<span>" + esc(F.money(res.pureGram, { decimals: 3 })) + " گرم طلای خالص" +
      " × " + esc(F.money(rate24.price)) + "</span>";
  }

  /** اختلاف نرخ خرید و فروش */
  function runSpreadCalc() {
    var out = $("#spread-result");
    if (!out) return;
    var buy = $("#spread-buy").value;
    var sell = $("#spread-sell").value;
    var pct = C.spreadPercent(buy, sell);
    if (pct === null) {
      out.innerHTML = '<span class="hint">دو نرخ را وارد کنید.</span>';
      return;
    }
    var diff = Math.abs(Number(sell) - Number(buy));
    out.innerHTML =
      "<b>" + esc(F.percent(pct)) + "</b>" +
      "<span>اختلاف " + esc(F.money(diff)) + " تومان نسبت به میانگین دو نرخ</span>";
  }

  function bindCalc() {
    ["#karat-weight", "#karat-value"].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener("input", runKaratCalc);
    });
    ["#spread-buy", "#spread-sell"].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener("input", runSpreadCalc);
    });
    ["#calc-amount", "#calc-fee", "#calc-currency"].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener("input", runCurrencyCalc);
    });
    ["#gold-weight", "#gold-extra", "#gold-type"].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener("input", runGoldCalc);
    });
    var swap = $("#calc-swap");
    if (swap) swap.addEventListener("click", function () {
      var sel = $("#calc-currency");
      var amount = $("#calc-amount");
      if (!sel || !amount || !state.data) return;
      var it = N.get(state.data.snapshot, sel.value);
      if (!it || !amount.value) return;
      var res = C.currency(amount.value, it.price, 0);
      if (res) {
        amount.value = String(res.total);
        runCurrencyCalc();
      }
    });
  }

  /* ============================ تنظیمات (مودال) ============================ */
  function openSettings() {
    var m = $("#settings-modal");
    if (!m) return;
    var keys = API.allKeys();
    (CFG.sources || []).forEach(function (src) {
      var input = document.getElementById("key-" + src.id);
      if (input) {
        input.value = keys[src.id] || src.apiKey || "";
        input.placeholder = /\{KEY\}/.test(src.url) ? "کلید رایگان خود را وارد کنید" : "این منبع به کلید نیاز ندارد";
      }
    });
    m.classList.add("show");
    m.setAttribute("aria-hidden", "false");
    var first = m.querySelector("input");
    if (first) first.focus();
  }
  function closeSettings() {
    var m = $("#settings-modal");
    if (!m) return;
    m.classList.remove("show");
    m.setAttribute("aria-hidden", "true");
  }

  function bindSettings() {
    $$("[data-open-settings]").forEach(function (b) { b.addEventListener("click", openSettings); });
    var m = $("#settings-modal");
    if (!m) return;
    m.addEventListener("click", function (e) { if (e.target === m) closeSettings(); });
    var closeBtn = $("#settings-close");
    if (closeBtn) closeBtn.addEventListener("click", closeSettings);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSettings(); });

    var save = $("#settings-save");
    if (save) save.addEventListener("click", function () {
      (CFG.sources || []).forEach(function (src) {
        var input = document.getElementById("key-" + src.id);
        if (input) API.setApiKey(src.id, input.value);
      });
      closeSettings();
      refresh(true);
    });

    var test = $("#settings-test");
    if (test) test.addEventListener("click", function () {
      var logEl = $("#settings-log");
      test.disabled = true;
      test.textContent = "در حال تست…";
      API.load({ force: true }).then(function (res) {
        logEl.className = "alert show";
        logEl.innerHTML = "<b>اتصال برقرار شد.</b><br>" + esc(res.log.map(function (l) {
          return l.label + ": " + l.note;
        }).join("<br>"));
        state.data = res;
        renderAll();
      }).catch(function (err) {
        logEl.className = "alert warn show";
        logEl.innerHTML = "<b>اتصال برقرار نشد.</b><br>" + esc((err.log || []).map(function (l) {
          return l.label + ": " + l.note;
        }).join("<br>"));
      }).finally(function () {
        test.disabled = false;
        test.textContent = "تست اتصال";
      });
    });
  }

  /* ============================ بارگذاری داده ============================ */
  function renderAll() {
    renderTicker();
    renderHeroCard();
    renderTable();
    renderStatus();
    fillSelects();
    runCurrencyCalc();
    runGoldCalc();
    runKaratCalc();
    runSpreadCalc();
  }

  function refresh(force) {
    var btn = $$(".js-refresh");
    btn.forEach(function (b) { b.disabled = true; });
    return API.load({ force: !!force })
      .then(function (res) {
        state.data = res;
        renderAll();
      })
      .catch(function (err) {
        var tbody = $("#prices-body");
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">' + icon("alert") +
            "<p>" + esc(err.message || "دریافت قیمت‌ها ناموفق بود") + "</p>" +
            '<button class="btn btn-ghost js-refresh" type="button">تلاش دوباره</button></div></td></tr>';
          bindRefresh();
        }
        renderStatus();
      })
      .finally(function () {
        btn.forEach(function (b) { b.disabled = false; });
      });
  }

  function bindRefresh() {
    $$(".js-refresh").forEach(function (b) {
      if (b.dataset.bound) return;
      b.dataset.bound = "1";
      b.addEventListener("click", function () { refresh(true); });
    });
  }

  /* ============================ اجزای صفحه ============================ */
  function bindNav() {
    var toggle = $("#nav-toggle");
    var links = $("#nav-links");
    if (toggle && links) {
      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      $$("#nav-links a").forEach(function (a) {
        a.addEventListener("click", function () { links.classList.remove("open"); });
      });
    }
  }

  function bindTabs() {
    $$(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        $$(".tab").forEach(function (t) { t.setAttribute("aria-selected", "false"); });
        tab.setAttribute("aria-selected", "true");
        state.tab = tab.getAttribute("data-tab");
        renderTable();
      });
    });
    var search = $("#price-search");
    if (search) {
      search.addEventListener("input", function () {
        state.query = search.value || "";
        renderTable();
      });
    }
  }

  function bindReveal() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
  }

  function bindBrandInfo() {
    var b = CFG.brand || {};
    $$("[data-brand]").forEach(function (el) {
      var key = el.getAttribute("data-brand");
      if (b[key] !== undefined) el.textContent = b[key];
    });
    $$("[data-brand-href]").forEach(function (el) {
      var key = el.getAttribute("data-brand-href");
      if (b[key] !== undefined) el.setAttribute("href", b[key]);
    });
    var year = $("#year");
    if (year) year.textContent = F.toFa(new Date().getFullYear());
    var today = $$(".js-today");
    if (today.length) {
      var txt = F.jalaliDate(new Date());
      today.forEach(function (el) { el.textContent = txt; });
    }
  }

  function bindContactForm() {
    var form = $("#contact-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = $("#form-status");
      var name = (form.querySelector('[name="name"]') || {}).value || "";
      var msg = (form.querySelector('[name="message"]') || {}).value || "";
      if (name.trim().length < 2 || msg.trim().length < 5) {
        status.className = "form-status show err";
        status.textContent = "لطفاً نام و متن درخواست را کامل وارد کنید.";
        return;
      }
      var b = CFG.brand || {};
      var body = encodeURIComponent("نام: " + name + "\n" + msg);
      status.className = "form-status show ok";
      status.innerHTML = 'درخواست شما آمادهٔ ارسال است. ' +
        '<a href="mailto:' + esc(b.email || "") + "?subject=" + encodeURIComponent("درخواست از سایت") +
        "&body=" + body + '">ارسال با ایمیل</a> یا تماس با ' + esc(b.phone || "");
      form.reset();
    });
  }

  /* ================================ شروع ================================ */
  function autoRefresh() {
    var settings = API.getSettings();
    if (!settings.autoRefresh) return;
    var minutes = CFG.refreshMinutes || 15;
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(function () { refresh(true); }, minutes * 60 * 1000);
  }

  function init() {
    bindBrandInfo();
    bindNav();
    bindTabs();
    bindCalc();
    bindSettings();
    bindContactForm();
    bindRefresh();
    bindReveal();
    renderStatus();
    refresh(false).finally(autoRefresh);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // برای تست و دیباگ
  window.DG_app = {
    state: state,
    refresh: refresh,
    renderAll: renderAll,
    renderTable: renderTable,
    renderStatus: renderStatus,
    renderTicker: renderTicker,
    renderHeroCard: renderHeroCard,
    fillSelects: fillSelects,
    runCurrencyCalc: runCurrencyCalc,
    runGoldCalc: runGoldCalc,
    runKaratCalc: runKaratCalc,
    runSpreadCalc: runSpreadCalc,
    currentItems: currentItems,
    init: init,
    esc: esc,
  };
})();
