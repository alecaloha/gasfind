import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    const proxyUrl = "https://gasfind.trustyalec.workers.dev";
    const response = await fetch(proxyUrl);
    const html = await response.text();

    const $ = cheerio.load(html);

    // 找到最新一天的价格区块
    const firstDay = $('.mb-6.bg-gray-50.rounded').first();

    const date = firstDay.find('h3').text().trim();

    const prices = firstDay.find('.text-2xl.md\\:text-5xl.font-bold')
      .map((i, el) => $(el).text().trim())
      .get();

    const changes = firstDay.find('.text-sm.font-bold')
      .map((i, el) => $(el).text().trim())
      .get();

    res.status(200).json({
      date,
      regular: prices[0],
      premium: prices[1],
      diesel: prices[2],
      change_regular: changes[0],
      change_premium: changes[1],
      change_diesel: changes[2]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to parse gas prices' });
  }
}
