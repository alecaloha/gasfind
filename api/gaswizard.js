// api/gaswizard.js
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const response = await fetch("https://gaswizard.ca/gas-prices/toronto/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const today = $(".gw-price-today .gw-price").first().text().trim();
    const tomorrow = $(".gw-price-tomorrow .gw-price").first().text().trim();

    let change = null;
    const changeText = $(".gw-price-change").text();
    const changeMatch = changeText.match(/([+-]?\d+\.?\d*)/);
    if (changeMatch) change = changeMatch[1];

    res.status(200).json({
      success: true,
      source: "Gas Wizard",
      today,
      tomorrow,
      change
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
