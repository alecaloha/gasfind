// api/gaswizard.js
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const response = await fetch("https://gaswizard.ca/gas-prices/toronto/", {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html"
      }
    });

    const html = await response.text();
    console.log(html.slice(0, 500));

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
