// api/gaswizard.js
import * as cheerio from "cheerio";

export default {
  async fetch(request) {
    try {
      const res = await fetch("https://gaswizard.ca/gas-prices/toronto/", {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "text/html"
        }
      });

      const html = await res.text();
      const $ = cheerio.load(html);

      // 今日油价
      const today = $(".gw-price-today .gw-price").first().text().trim();

      // 明日油价
      const tomorrow = $(".gw-price-tomorrow .gw-price").first().text().trim();

      // 涨跌幅（如果有）
      let change = null;
      const changeText = $(".gw-price-change").text();
      const changeMatch = changeText.match(/([+-]?\d+\.?\d*)/);
      if (changeMatch) change = changeMatch[1];

      return Response.json({
        success: true,
        source: "Gas Wizard",
        today,
        tomorrow,
        change
      });

    } catch (err) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }
};
