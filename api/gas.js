// api/gas.js
export default {
  async fetch(request, env) {
    const proxyUrl = "https://gasfind.trustyalec.workers.dev";
    
    try {
      const response = await fetch(proxyUrl);
      const html = await response.text();
      
      // 使用 Cheerio 解析（需确保项目已引入 cheerio）
      const $ = cheerio.load(html);   // 如果是 Cloudflare Workers，可能需要用 html-rewriter 或其他方式

      const predictions = [];

      // 抓取所有预测卡片（按页面实际顺序，通常未来日期在前）
      $('.mb-6.bg-gray-50.rounded, .prediction-card, [class*="rounded"][class*="bg-gray"]').each((i, el) => {
        if (predictions.length >= 3) return false;   // 只取前3天

        const $card = $(el);
        const dateText = $card.find('h3').text().trim();           // 日期，如 "Sunday, April 12, 2026"
        const priceEl = $card.find('.text-2xl, .md\\:text-5xl, .font-bold, .text-4xl').first();
        let price = priceEl.text().trim().replace(/[^0-9.]/g, '');

        // 尝试其他可能的价格选择器（兼容性）
        if (!price) {
          price = $card.find('strong, .price, .font-bold').text().trim().replace(/[^0-9.]/g, '');
        }

        if (dateText && price) {
          predictions.push({
            date: dateText,
            regular: parseFloat(price),
            change: $card.find('.text-green-500, .text-red-500, [class*="text-"]').text().trim() || ''
          });
        }
      });

      // 如果没抓到，fallback 到 .first() 的方式（兼容旧结构）
      if (predictions.length === 0) {
        const cards = $('.mb-6.bg-gray-50.rounded');
        cards.each((i, el) => {
          if (i >= 3) return false;
          // ... 同上逻辑
        });
      }

      return Response.json({
        success: true,
        location: "GTA / Oakville",
        source: "Dan McTeague - Gas Price Predictions",
        predictions: predictions,
        updated: new Date().toISOString()
      });

    } catch (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }
  }
};