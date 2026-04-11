// api/gas.js
export default {
  async fetch(request) {
    try {
      const response = await fetch("https://gasfind.trustyalec.workers.dev");
      const html = await response.text();

      const predictions = [];
      const dateRegex = /Gas Prices for (.*?, \d{4})/g;
      const priceRegex = /Regular<br>(\d+\.?\d*)/g;

      let dateMatch;
      let priceMatch;

      // 简单粗暴但有效的匹配方式
      const dates = [...html.matchAll(dateRegex)];
      const prices = [...html.matchAll(priceRegex)];

      for (let i = 0; i < Math.min(dates.length, prices.length, 3); i++) {
        predictions.push({
          date: dates[i][1].trim(),           // 如 "Tuesday, April 14, 2026"
          regular: parseFloat(prices[i][1]),
          change: ""                          // 可后续优化抓取 ↑ ↓
        });
      }

      return Response.json({
        success: true,
        location: "GTA",
        source: "Dan McTeague - Gas Price Predictions",
        predictions: predictions,
        updated: new Date().toISOString()
      });

    } catch (error) {
      console.error("Gas API error:", error);
      return Response.json({
        success: false,
        error: "无法获取油价数据，请稍后重试"
      }, { status: 500 });
    }
  }
};