/**
 * تنظیمات مرکزی سایت — هر چیزی که ممکن است بخواهید عوض کنید اینجاست.
 * این فایل قبل از بقیهٔ اسکریپت‌ها در صفحه لود می‌شود.
 */
window.DG_CONFIG = {
  /* ------------------------- هویت سایت ------------------------- */
  brand: {
    name: "طلا و ارز VIP",
    nameEn: "Dollar · Talla · Gold VIP",
    tagline: "مرجع لحظه‌ای نرخ دلار، طلا و سکه",
    phone: "۰۲۱-۹۱۰۰۰۰۰۰",
    phoneHref: "tel:+982191000000",
    whatsapp: "989120000000", // بدون + و بدون صفر ابتدایی
    email: "info@example.com",
    address: "تهران، خیابان فردوسی، مجتمع ارزی، طبقه دوم",
    workHours: "شنبه تا چهارشنبه ۹:۰۰ تا ۱۸:۰۰ — پنجشنبه ۹:۰۰ تا ۱۳:۰۰",
  },

  /* ---------------------- منابع قیمت (API) ----------------------
   * به ترتیب تلاش می‌شوند؛ اولین منبعی که پاسخ درست بدهد استفاده می‌شود.
   * اگر هیچ‌کدام در دسترس نبود، سایت به data/prices.json (دیتای دستی) برمی‌گردد.
   *
   * `apiKey` را می‌توانید همین‌جا بگذارید یا در سایت از دکمهٔ «تنظیمات» وارد کنید
   * (کلید واردشده در localStorage مرورگر ذخیره می‌شود و جای این مقدار را می‌گیرد).
   * کلید رایگان BrsApi: https://brsapi.ir/tsetmc-exchange-free-bourse-api-key-request/
   * ------------------------------------------------------------- */
  sources: [
    {
      id: "brsapi",
      label: "BrsApi (طلا، ارز، رمزارز)",
      // نسخه Pro — با key شما. بخش‌های لازم را با section محدود کرده‌ایم تا سبک باشد.
      url: "https://api.brsapi.ir/Market/Gold_Currency_Pro.php?key={KEY}&section=gold,currency",
      apiKey: "BHUmHszYCPbvXt6eRDwdmjPa2Za7emDN", // ← کلید خود را اینجا بگذارید (یا از پنل تنظیمات سایت)
      format: "brsapi",
      enabled: true,
    },
    {
      id: "brsapi-free",
      label: "BrsApi (نسخه رایگان)",
      // اندپوینت عمومی بدون کلید — ممکن است محدود یا غیرفعال باشد.
      url: "https://brsapi.ir/FreeTsetmcBourseApi/Api_Free_Gold_Currency.json",
      apiKey: "",
      format: "brsapi",
      enabled: true,
    },
  ],

  /* ---------------------- مسیرهای داخلی ---------------------- */
  paths: {
    // دادهٔ دستی/کش‌شده که به عنوان آخرین راه حل استفاده می‌شود
    snapshot: "data/prices.json",
    // کش تولیدشده توسط GitHub Actions (اگر ورک‌فلو فعال باشد ساخته می‌شود)
    live: "data/latest.json",
  },

  /* ------------------------- رفتار ------------------------- */
  refreshMinutes: 15, // هر چند دقیقه قیمت‌ها خودکار تازه شوند
  requestTimeoutMs: 9000,
  unit: "تومان", // واحد پیش‌فرض نمایش

  /* فهرست دارایی‌هایی که در «نمایش سریع» و تیکر بالا استفاده می‌شوند */
  featured: ["USD", "EUR", "IR_GOLD_18K", "XAUUSD", "IR_COIN_EMAMI", "IR_COIN_HALF", "USDT_IRT"],

  /* نمادهایی که در هر تب نمایش داده می‌شوند. "*" یعنی همهٔ نمادهای همان بخش. */
  tabs: {
    currency: ["USD", "USDT_IRT", "EUR", "AED", "GBP", "TRY", "CHF", "CAD", "AUD", "CNY", "SAR", "IQD", "JPY", "KWD"],
    gold: ["IR_GOLD_18K", "IR_GOLD_24K", "IR_GOLD_MELTED", "XAUUSD"],
    coin: ["IR_COIN_EMAMI", "IR_COIN_BAHAR", "IR_COIN_HALF", "IR_COIN_QUARTER", "IR_COIN_1G"],
  },

  /* نمادهایی که در ماشین‌حساب طلا قابل انتخاب هستند */
  goldCalcSymbols: ["IR_GOLD_18K", "IR_GOLD_24K", "IR_GOLD_MELTED"],

  /* حداقل تعداد نقاط لازم برای رسم نمودار کوچک */
  sparkPoints: 12,
};
