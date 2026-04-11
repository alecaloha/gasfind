// api/gas.js
export default {
  async fetch(request) {
    try {
      const response = await fetch("https://gasfind.trustyalec.workers.dev");
      const html = await response.text();

      const predictions = [];

      // 匹配日期
      const dateMatches = [...html.matchAll(/### Gas Prices for (.*?,\s*\d{4})/g)];

      // 匹配 Regular 价格（支持 (n/c) 和 ↑ ↓ 格式）
      const regularMatches = [...html.matchAll(/Regular\s*\n\s*(\d+\.?\d*)/g)];

      for (let i = 0; i < Math.min(dateMatches.length, regularMatches.length, 3); i++) {
        const date = dateMatches[i][1].trim();
        const regular = parseFloat(regularMatches[i][1]);

        // 尝试提取涨跌信息
        const changeRegex = new RegExp(`### Gas Prices for ${date.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?Regular\\s*\\n\\s*\\d+\\.\\d*\\s*([↑↓(n/c)].*?)(?=\\n\\n|Premium|$)`, 'i');
        const changeMatch = html.match(changeRegex);
        const change = changeMatch ? changeMatch[1].trim() : '';

        predictions.push({
          date: date,
          regular: regular,
          change: change
        });
      }

      if (predictions.length === 0) {
        return Response.json({ success: false, error: "未能提取油价数据" }, { status: 500 });
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