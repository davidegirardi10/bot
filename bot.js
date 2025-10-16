import 'dotenv/config'; // legge il file .env
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import * as cheerio from "cheerio";
import cron from "node-cron";

const TOKEN = process.env.TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CHAT_ID = process.env.CHAT_ID;

const bot = new TelegramBot(TOKEN, { polling: true });

// ===== FUNZIONI DI SCRAPING =====

// --- eBay ---
async function scrapeEbay() {
  const results = [];
  try {
    const url = "https://www.ebay.it/sch/i.html?_nkw=playstation+5&_sop=15";
    const { data } = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $ = cheerio.load(data);
    $(".s-item").each((_, el) => {
      const title = $(el).find(".s-item__title").text();
      const priceText = $(el).find(".s-item__price").text().replace("€","").replace(",",".");

      const link = $(el).find(".s-item__link").attr("href");
      const price = parseFloat(priceText.split(" ")[0]);
      if (price && price < 350) results.push({ site: "eBay", title, price, link });
    });
  } catch (err) { console.error("Errore eBay:", err.message); }
  return results;
}

// --- MediaWorld ---
async function scrapeMediaworld() {
  const results = [];
  try {
    const url = "https://www.mediaworld.it/search?text=playstation%205";
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    $("div.product").each((_, el) => {
      const title = $(el).find("h3").text().trim();
      const priceText = $(el).find(".price").text().replace("€","").replace(",",".");

      const link = "https://www.mediaworld.it" + $(el).find("a").attr("href");
      const price = parseFloat(priceText);
      if (price && price < 400) results.push({ site: "MediaWorld", title, price, link });
    });
  } catch (err) { console.error("Errore MediaWorld:", err.message); }
  return results;
}

// --- Unieuro ---
async function scrapeUnieuro() {
  const results = [];
  try {
    const url = "https://www.unieuro.it/online/SearchDisplay?searchTerm=playstation%205";
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    $(".product-list-item").each((_, el) => {
      const title = $(el).find(".product-name").text().trim();
      const priceText = $(el).find(".price").text().replace("€","").replace(",",".");

      const link = "https://www.unieuro.it" + $(el).find("a").attr("href");
      const price = parseFloat(priceText);
      if (price && price < 400) results.push({ site: "Unieuro", title, price, link });
    });
  } catch (err) { console.error("Errore Unieuro:", err.message); }
  return results;
}

// --- GameStop ---
async function scrapeGamestop() {
  const results = [];
  try {
    const url = "https://www.gamestop.it/search?query=playstation+5";
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    $(".product-tile").each((_, el) => {
      const title = $(el).find(".product-tile__name").text().trim();
      const priceText = $(el).find(".price-sales").text().replace("€","").replace(",",".");

      const link = "https://www.gamestop.it" + $(el).find("a").attr("href");
      const price = parseFloat(priceText);
      if (price && price < 400) results.push({ site: "GameStop", title, price, link });
    });
  } catch (err) { console.error("Errore GameStop:", err.message); }
  return results;
}

// --- Amazon ---
async function scrapeAmazon() {
  const results = [];
  try {
    const url = "https://www.amazon.it/s?k=playstation+5";
    const { data } = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $ = cheerio.load(data);
    $("div.s-main-slot div[data-component-type='s-search-result']").each((_, el) => {
      const title = $(el).find("h2 a span").text().trim();
      const priceWhole = $(el).find(".a-price-whole").first().text().replace(".","");
      const priceFraction = $(el).find(".a-price-fraction").first().text();
      const price = parseFloat(priceWhole + "." + priceFraction);
      const link = "https://www.amazon.it" + $(el).find("h2 a").attr("href");
      if (price && price < 450) results.push({ site: "Amazon", title, price, link });
    });
  } catch (err) { console.error("Errore Amazon:", err.message); }
  return results;
}

// --- Euronics ---
async function scrapeEuronics() {
  const results = [];
  try {
    const url = "https://www.euronics.it/ricerca/playstation%205";
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    $(".product-item").each((_, el) => {
      const title = $(el).find(".product-item__name").text().trim();
      const priceText = $(el).find(".price").text().replace("€","").replace(",",".");

      const link = "https://www.euronics.it" + $(el).find("a").attr("href");
      const price = parseFloat(priceText);
      if (price && price < 400) results.push({ site: "Euronics", title, price, link });
    });
  } catch (err) { console.error("Errore Euronics:", err.message); }
  return results;
}

// --- Gemini API ---
async function scrapeGemini() {
  const results = [];
  if (!GEMINI_API_KEY) return results;
  try {
    const url = `https://api.gemini.io/products?query=playstation+5`;
    const { data } = await axios.get(url, { headers: { "Authorization": `Bearer ${GEMINI_API_KEY}` } });
    if (data.items) {
      data.items.forEach(item => {
        const title = item.title;
        const price = parseFloat(item.price);
        const link = item.url;
        if (price && price < 400) results.push({ site: "Gemini", title, price, link });
      });
    }
  } catch (err) { console.error("Errore Gemini API:", err.message); }
  return results;
}

// ===== FUNZIONE PRINCIPALE =====
async function getPrices() {
  const results = [];
  results.push(...await scrapeEbay());
  results.push(...await scrapeMediaworld());
  results.push(...await scrapeUnieuro());
  results.push(...await scrapeGamestop());
  results.push(...await scrapeAmazon());
  results.push(...await scrapeEuronics());
  results.push(...await scrapeGemini());
  return results;
}

// ===== COMANDI TELEGRAM =====
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🎮 Ciao! Ti segnalo prezzi sospetti della PS5. Usa /ps5 per cercare ora.");
});

bot.onText(/\/ps5/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "🔍 Cerco offerte PS5 multi-sito...");
  const offers = await getPrices();
  if (offers.length === 0) {
    bot.sendMessage(chatId, "😔 Nessun prezzo sospetto trovato per ora.");
  } else {
    const text = offers.map(o =>
      `🔥 <b>${o.title}</b>\n💶 <b>${o.price}€</b> su ${o.site}\n🔗 <a href="${o.link}">Vedi offerta</a>`
    ).join("\n\n");
    bot.sendMessage(chatId, text, { parse_mode: "HTML", disable_web_page_preview: true });
  }
});

// ===== CRON JOB AUTOMATICO OGNI 2 ORE =====
cron.schedule("0 */2 * * *", async () => {
  console.log("⏱ Esecuzione controllo prezzi PS5...");
  const offers = await getPrices();
  if (offers.length > 0) {
    const text = offers.map(o =>
      `⚠️ Prezzo basso su ${o.site}\n${o.title}\n💶 ${o.price}€\n🔗 ${o.link}`
    ).join("\n\n");

    if (CHAT_ID) {
      bot.sendMessage(CHAT_ID, text, { disable_web_page_preview: true });
      console.log(`✅ Notifica inviata a CHAT_ID: ${CHAT_ID}`);
    } else {
      console.warn("⚠️ CHAT_ID non definito nel file .env");
    }
  } else {
    console.log("🔍 Nessun prezzo sospetto trovato in questo ciclo.");
  }
});