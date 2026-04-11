// api/gas.js
export default {
  async fetch(request) {
    try {
      const html = await (await fetch("https://gasfind.trustyalec.workers.dev")).text();

      const predictions = [];

      // 提取日期和 Regular 价格（当前页面格式）
      const dateMatches = html.match(/### Gas Prices for (.*?,\s*\d{4})/g) || [];
      const priceMatches = html.match(/Regular\s*\n\s*(\d+\.?\d*)/g) || [];

      for (let i = 0; i < Math.min(dateMatches.length, priceMatches.length, 3); i++) {
        const dateFull = dateMatches[i];
        const date = dateFull.replace('### Gas Prices for ', '').trim();
        const regular = parseFloat(priceMatches[i].match(/\d+\.?\d*/)[0]);

        predictions.push({
          date: date,
          regular: regular,
          change: '(n/c)'   // 暂时固定，后续可优化
        });
      }

      return Response.json({
        success: true,
        location: "GTA",
        source: "Dan McTeague",
        predictions: predictions,
        updated: new Date().toISOString()
      });

    } catch (err) {
      return Response.json({ 
        success: false, 
        error: err.message 
      }, { status: 500 });
    }
  }
};