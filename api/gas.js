import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  try {
    const proxyUrl = "https://gasfind.trustyalec.workers.dev";
    
    // 增加 Header 模拟浏览器访问，防止被反爬虫拦截
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 优化后的解析逻辑：尝试更具通用性的选择器
    // 建议先在浏览器控制台运行 $('strong').text() 确认数据位置
    const price = $('strong').first().text().trim();
    
    // 这里的选择器需根据目标页面的具体源码微调
    const title = $('p').first().text().trim();
    const updated = $('p').filter((i, el) => $(el).text().includes('Updated')).text().trim();

    if (!price) {
      // 调试：如果失败，返回部分 HTML 源码查看原因
      console.log("HTML Sample:", html.substring(0, 500));
      return res.status(500).json({ 
        error: "Parsing failed", 
        hint: "Check if the target website structure has changed" 
      });
    }

    // 设置缓存控制，减少频繁请求
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    res.status(200).json({
      title,
      price,
      updated,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("Server Error:", err.message);
    res.status(500).json({ error: 'Failed to fetch gas prices', details: err.message });
  }
}