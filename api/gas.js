import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    const proxyUrl = "https://gasfind.trustyalec.workers.dev";
    const response = await fetch(proxyUrl);
    const html = await response.text();

    const $ = cheerio.load(html);

    // 找到包含油价的区块
    const block = $('.wp-block-group').first();

    const title = block.find('p').eq(0).text().trim();
    const price = block.find('strong').first().text().trim();
    const updated = block.find('p').eq(2).text().trim();

    // 如果 price 为空，说明解析失败
    if (!price) {
      return res.status(500).json({ error: "Parsing failed" });
    }

    res.status(200).json({
      title,
      price,
      updated
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch gas prices' });
  }
}
