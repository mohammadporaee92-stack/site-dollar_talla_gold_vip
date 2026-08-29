/**
 * دادهٔ نمونهٔ پاسخ منابع قیمت، دقیقاً به همان ساختاری که
 * BrsApi در نسخهٔ Pro و رایگان برمی‌گرداند.
 */
"use strict";

/* نسخهٔ Pro: بخش‌بندی تو در تو (gold.type / gold.coin / currency.free / ...) */
const PRO_RESPONSE = {
  successful: true,
  code_http: 200,
  message_error: null,
  url_base_icon: "https://brsapi.ir/Api/XXX/Icon",
  gold: {
    ounce: [
      {
        date: "1405/06/07", time: "11:45", time_unix: 1787991300,
        symbol: "XAUUSD", name_en: "Gold Ounce", name: "انس طلا",
        price: 4640.97, change_value: 33.62, change_percent: 0.73,
        unit: "دلار", path_icon: "XAUUSD.png",
      },
    ],
    type: [
      {
        date: "1405/06/07", time: "11:15", time_unix: 1787989500,
        symbol: "IR_GOLD_18K", name_en: "18K Gold", name: "طلای 18 عیار",
        price: 22358800, change_value: 612400, change_percent: 2.81,
        unit: "تومان", path_icon: "IR_GOLD_18K.png",
      },
      {
        date: "1405/06/07", time: "11:15", time_unix: 1787989500,
        symbol: "IR_GOLD_24K", name_en: "24K Gold", name: "طلای 24 عیار",
        price: 29811700, change_value: 816500, change_percent: 2.81,
        unit: "تومان", path_icon: "IR_GOLD_24K.png",
      },
    ],
    coin: [
      {
        date: "1405/06/07", time: "11:00", time_unix: 1787988600,
        symbol: "IR_COIN_EMAMI", name_en: "Emami Coin", name: "سکه امامی",
        price: 224040000, change_value: 5000000, change_percent: 2.28,
        unit: "تومان", path_icon: "IR_COIN_EMAMI.png",
      },
      {
        date: "1405/06/07", time: "11:00", time_unix: 1787988600,
        symbol: "IR_COIN_HALF", name_en: "Half Coin", name: "نیم سکه",
        price: 114400000, change_value: 2000000, change_percent: 1.78,
        unit: "تومان", path_icon: "IR_COIN_HALF.png",
      },
    ],
  },
  currency: {
    free: [
      {
        date: "1405/06/07", time: "10:30", time_unix: 1787986800,
        symbol: "USD", name_en: "US Dollar", name: "دلار آمریکا", sign: "$",
        price: 201700, change_value: 1800, change_percent: 0.9,
        unit: "تومان", path_icon: "USD.png",
      },
      {
        date: "1405/06/07", time: "10:30", time_unix: 1787986800,
        symbol: "EUR", name_en: "Euro", name: "یورو", sign: "€",
        price: 235670, change_value: 2060, change_percent: 0.88,
        unit: "تومان", path_icon: "EUR.png",
      },
      {
        date: "1405/06/07", time: "10:35", time_unix: 1787987100,
        symbol: "USDT_IRT", name_en: "Tether Dollar", name: "دلار تتر",
        price: 202400, change_value: 1500, change_percent: 0.75,
        unit: "تومان", path_icon: "USDT.png",
      },
    ],
  },
  cryptocurrency: {
    free: [
      {
        date: "1405/06/07", time: "11:50", time_unix: 1787991600,
        symbol: "BTC", name_en: "Bitcoin", name: "بیت‌کوین",
        price: 214000000000, change_value: 3100000000, change_percent: 1.47,
        unit: "تومان", path_icon: "BTC.png",
      },
    ],
  },
};

/* نسخهٔ رایگان: آرایهٔ تخت */
const FREE_RESPONSE = {
  gold: [
    {
      date: "1405/06/07", time: "11:15", time_unix: 1787989500,
      symbol: "IR_GOLD_18K", name_en: "18K Gold", name: "طلای 18 عیار",
      price: 22358800, change_value: 612400, change_percent: 2.81, unit: "تومان",
    },
  ],
  currency: [
    {
      date: "1405/06/07", time: "10:30", time_unix: 1787986800,
      symbol: "USD", name_en: "US Dollar", name: "دلار",
      price: 201700, change_value: 1800, change_percent: 0.9, unit: "تومان",
    },
  ],
};

/* واحد ریال — باید به تومان تبدیل شود */
const RIAL_RESPONSE = {
  currency: {
    free: [
      {
        date: "1405/06/07", time: "10:30", time_unix: 1787986800,
        symbol: "USD", name_en: "US Dollar", name: "دلار آمریکا", sign: "$",
        price: 2017000, change_value: 18000, change_percent: 0.9, unit: "ریال",
      },
    ],
  },
};

module.exports = { PRO_RESPONSE, FREE_RESPONSE, RIAL_RESPONSE };
