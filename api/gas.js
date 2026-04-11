// Vercel Serverless Function for Gas Prices
export default async function handler(req, res) {
  try {
    // 1. 定义要抓取的网站 URL
    const targetUrl = 'https://gasfind.trustyalec.workers.dev/';
    
    // 2. 发起网络请求 (请注意：如果目标站点有反爬虫机制，可能会失败)
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // 3. 解析数据 (这里需要根据实际的目标网站 HTML 结构来编写正则或解析逻辑)
    // ⚠️ 由于这是一个演示，我们使用模拟数据。实际使用中，你需要分析目标网站的 HTML 结构。
    const prices = [
        { date: '2026-04-11 (周六)', regular: '186.9', premium: '216.9', diesel: '236.9' },
        { date: '2026-04-10 (周五)', regular: '188.9', premium: '218.9', diesel: '232.9' },
        { date: '2026-04-09 (周四)', regular: '187.9', premium: '217.9', diesel: '233.9' }
    ];

    // 4. 返回结构化数据给前端
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