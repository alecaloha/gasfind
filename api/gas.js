import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    const url = 'https://www.affordableenergy.ca/gas-prices/oakville/';
    const response = await fetch(url);
    const html = await response.text();

    const $ = cheerio.load(html);
    const results = [];

    $('.gas-price-row').each((i, el) => {
      const station = $(el).find('.location').text().trim();
      const price = $(el).find('.price').text().trim();
      const updated = $(el).find('.updated').text().trim();

      if (station && price) {
        results.push({ station, price, updated });
      }
    });

    res.status(200).json({
      count: results.length,
      data: results
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch gas prices' });
  }
}
