import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    const url = 'https://www.affordableenergy.ca/gas-prices/oakville/';
    const response = await fetch(url);
    const html = await response.text();

    const $ = cheerio.load(html);
    const results = [];

    $('.gas-price-item').each((i, el) => {
      results.push({
        station: $(el).find('.gas-price-location').text().trim(),
        price: $(el).find('.gas-price-price').text().trim(),
        updated: $(el).find('.gas-price-updated').text().trim(),
      });
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
