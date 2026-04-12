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
    
    // 更精确的选择器：直接查找包含日期的 h3 标签
    // 找到所有包含 "Gas Prices for" 的 h3 标签，然后向上查找父容器
    $('h3:contains("Gas Prices for")').each((index, element) => {
      if (index >= 3) return;

      const $h3 = $(element);
      const $container = $h3.closest('div.mb-6'); // 找到最近的容器
      
      // 提取日期
      const dateRaw = $h3.text().replace('Gas Prices for ', '').trim();
      
      // 提取价格 - 使用更精确的选择器
      const grid = $container.find('.grid.grid-cols-3');
      
      // 检查 grid 是否存在
      if (grid.length === 0) return;

      const cols = grid.find('div');
      if (cols.length < 3) return;

      const regular = cols.eq(0).find('span.text-2xl').text().trim();
      const premium = cols.eq(1).find('span.text-2xl').text().trim();
      const diesel = cols.eq(2).find('span.text-2xl').text().trim();

      // 只有当价格有效时才添加
      if (regular && premium && diesel) {
        prices.push({
          date: dateRaw,
          regular: regular,
          premium: premium,
          diesel: diesel
        });
      }
    });

    // 确保顺序：最早的日期在前面（April 12, 13, 14 -> April 12, 13, 14）
    // 如果已经是正确的顺序，就不需要 reverse
    // 但如果网站返回的是倒序的，我们需要 reverse
    
    // 检查是否需要反转（根据日期字符串判断）
    if (prices.length >= 2) {
      const firstDate = new Date(prices[0].date);
      const lastDate = new Date(prices[prices.length - 1].date);
      if (firstDate > lastDate) {
        prices.reverse();
      }
    }

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
