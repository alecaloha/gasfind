export const config = {
  runtime: "edge",
};

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    const proxyUrl = "https://gasfind.trustyalec.workers.dev";

    const response = await fetch(proxyUrl, {
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const firstDay = $('.mb-6.bg-gray-50.rounded').first();
    const date = firstDay.find('h3').text().trim();

    const prices = firstDay
      .find('.text-2xl.md\\:text-5xl.font-bold')
      .map((i, el) => $(el).text().trim())
      .get();

    const changes = firstDay
      .find('.text-sm.font-bold')
      .map((i, el) => $(el).text().trim().replace(/\s+/g, ' '))
      .get();

    res = new Response(JSON.stringify({
      date,
      regular: prices[0],
      premium: prices[1],
      diesel: prices[2],
      change_regular: changes[0] || null,
      change_premium: changes[1] || null,
      change_diesel: changes[2] || null
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
      }
    });

    return res;

  } catch (err) {
    return new Response(JSON.stringify({
      error: "Failed to parse gas prices",
      detail: err.toString()
    }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
}
