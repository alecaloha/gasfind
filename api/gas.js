import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    const proxyUrl = "https://gasfind.trustyalec.workers.dev";

    const response = await fetch(proxyUrl, {
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // 找到最新一天的价格区块（第一个 .mb-6.bg-gray-50.rounded）
    const firstDay = $('.mb-6.bg-gray-50.rounded').first();

    const date = firstDay.find('h3').text().trim();

    // Regular / Premium / Diesel 价格
    const prices = firstDay
      .find('.text-2xl.md\\:text-5xl.font-bold')
      .map((i, el) => $(el).text().trim())
      .get();

    // 涨跌箭头
    const changes = firstDay
      .find('.text-sm.font-bold')
      .map((i, el) => $(el).text().trim().replace(/\s+/g, ' '))
      .get();

    // 如果抓不到价格 → 返回 debug
    if (prices.length < 3) {
      return res.status(500).json({
        error: "Parsing failed: no prices found",
        debug_prices: prices,
        debug_html_snippet: firstDay.html()?.slice(0, 500)
      });
    }

    // 禁止缓存（解决你看到旧数据的问题）
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

    res.status(200).json({
      date,
      regular: prices[0],
      premium: prices[1],
      diesel: prices[2],
      change_regular: changes[0] || null,
      change_premium: changes[1] || null,
      change_diesel: changes[2] || null
    });

  } catch (err) {
    res.status(500).json({
      error: "Failed to parse gas prices",
      detail: err.toString()
    });
  }
}
