import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import * as cheerio from "cheerio";
import cron from "node-cron";

const TOKEN = "INSERISCI_IL_TUO_TOKEN_BOT";
const bot = new TelegramBot(TOKEN, { polling: true });

// 🔍 Scraper generico per più siti
async function getPrices() {
  const results = [];

  // --- 1️⃣ eBay ---
  try {
    const ebayURL = "https://www.ebay.it/sch/i.html?_nkw=playstation+5&_sop=15";
    const { data } = await axios.get(ebayURL, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const $ = cheerio.load(data);
    $(".s-item").each((_, el) => {
      const title = $(el).find(".s-item__title").text();
      const priceText = $(el).find(".s-item__price").text().replace("€", "").replace(",", ".");
      const link = $(el).find(".s-item__link").attr("href");
      const price = parseFloat(priceText);
      if (price && price < 350) {
        results.push({ site: "eBay", title, price, link });
      }
    });
  } catch (err) {
    console.error("Errore eBay:", err.message);
  }

  // --- 2️⃣ Mediaworld ---
  try {
    const mwURL = "https://www.mediaworld.it/search?text=playstation%205";
    const { data } = await axios.get(mwURL);
    const $ = cheerio.load(data);
    $("div.product").each((_, el) => {
      const title = $(el).find("h3").text().trim();
      const priceText = $(el).find(".price").text().replace("€", "").replace(",", ".");
      const link = "https://www.mediaworld.it" + $(el).find("a").attr("href");
      const price = parseFloat(priceText);
      if (price && price < 400) {
        results.push({ site: "Mediaworld", title, price, link });
      }
    });
  } catch (err) {
    console.error("Errore Mediaworld:", err.message);
  }

  // --- 3️⃣ Unieuro ---
  try {
    const unieuroURL = "https://www.unieuro.it/online/SearchDisplay?categoryId=&storeId=20081&catalogId=10001&langId=-4&pageSize=30&searchTerm=playstation%205";
    const { data } = await axios.get(unieuroURL);
    const $ = cheerio.load(data);
    $(".product-list-item").each((_, el) => {
      const title = $(el).find(".product-name").text().trim();
      const priceText = $(el).find(".price").text().replace("€", "").replace(",", ".");
      const link = "https://www.unieuro.it" + $(el).find("a").attr("href");
      const price = parseFloat(priceText);
      if (price && price < 400) {
        results.push({ site: "Unieuro", title, price, link });
      }
    });
  } catch (err) {
    console.error("Errore Unieuro:", err.message);
  }

  return results;
}

// 🔎 Comando /ps5
bot.onText(/\/ps5/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "🔍 Cerco errori di prezzo sulla PlayStation 5...");

  const offers = await getPrices();

  if (offers.length === 0) {
    await bot.sendMessage(chatId, "Nessun prezzo anomalo trovato 😔");
  } else {
    const text = offers
      .map(
        (o) =>
          `🔥 <b>${o.title}</b>\n💶 <b>${o.price}€</b> su ${o.site}\n🔗 <a href="${o.link}">Vedi offerta</a>`
      )
      .join("\n\n");

    await bot.sendMessage(chatId, text, { parse_mode: "HTML", disable_web_page_preview: true });
  }
});

// 🕒 Controllo automatico ogni 2 ore
cron.schedule("0 */2 * * *", async () => {
  console.log("Controllo automatico...");
  const offers = await getPrices();
  if (offers.length > 0) {
    const text = offers
      .map(
        (o) =>
          `⚠️ Prezzo basso su ${o.site}\n${o.title}\n💶 ${o.price}€\n🔗 ${o.link}`
      )
      .join("\n\n");
    await bot.sendMessage("INSERISCI_TUO_CHAT_ID", text, { disable_web_page_preview: true });
  }
});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "🎮 Ciao! Io trovo errori di prezzo sulla PlayStation 5.\nUsa /ps5 per cercare ora 🔍"
  );
});