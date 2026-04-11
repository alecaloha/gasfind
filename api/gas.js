// api/gas.js
export default {
  async fetch(request) {
    try {
      const response = await fetch("https://gasfind.trustyalec.workers.dev");
      const html = await response.text();

      const predictions = [];

      // 匹配所有 3 天的日期
      const dateMatches = [...html.matchAll(/### Gas Prices for (.*?,\s*\d{4})/g)];

      // 匹配 Regular 价格（支持 (n/c) 和 ↑ ↓ 格式）
      const priceMatches = [...html.matchAll(/Regular\s*\n\s*(\d+\.?\d*)/g)];

      for (let i = 0; i < Math.min(dateMatches.length, priceMatches.length, 3); i++) {
        const date = dateMatches[i][1].trim();
        const regular = parseFloat(priceMatches[i][1]);

        // 提取涨跌信息（更宽松匹配）
        const section = html.split(dateMatches[i][0])[1]?.split('###')[0] || '';
        const changeMatch = section.match(/Regular\s*\n\s*\d+\.?\d*\s*([↑↓(n/c)].*?)(?=\n\n|$)/);
        const change = changeMatch ? changeMatch[1].trim() : '';

        predictions.push({
          date: date,
          regular: regular,
          change: change
        });
      }

      if (predictions.length === 0) {
        throw new Error("No predictions found");
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