// Vercel Serverless Function for Gas Prices
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    const targetUrl = 'https://gasfind.trustyalec.workers.dev/';
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const prices = [];
    
    // 解析每个价格区块
    // 网站结构：每个日期是一个 div.mb-6，h3 包含日期，内部的 grid 包含价格
    $('div.mb-6.bg-gray-50').each((index, element) => {
      if (index >= 3) return; // 只取最近3天的数据

      const $element = $(element);
      
      // 提取日期 (例如: "Gas Prices for Tuesday, April 14, 2026")
      const dateRaw = $element.find('h3').text().replace('Gas Prices for ', '').trim();
      
      // 提取价格
      const grid = $element.find('.grid.grid-cols-3');
      const regular = grid.find('div').eq(0).find('span.text-2xl').text().trim();
      const premium = grid.find('div').eq(1).find('span.text-2xl').text().trim();
      const diesel = grid.find('div').eq(2).find('span.text-2xl').text().trim();

      prices.push({
        date: dateRaw,
        regular: regular,
        premium: premium,
        diesel: diesel
      });
    });

    res.status(200).json({
      source: targetUrl,
      timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'America/Toronto' }),
      prices: prices
    });

  } catch (error) {
    console.error('Error scraping gas prices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch gas prices',
      details: error.message 
    });
  }
}