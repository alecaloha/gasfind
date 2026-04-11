// api/gas.js   ← 完整替换成这个
export default {
  async fetch(request) {
    try {
      const res = await fetch("https://gasfind.trustyalec.workers.dev");
      const html = await res.text();

      const predictions = [];

      // 提取3天预测
      const dateRegex = /### Gas Prices for (.*?,\s*\d{4})/g;
      const dates = [...html.matchAll(dateRegex)];

      const regularRegex = /Regular\s*\n\s*(\d+\.?\d*)/g;
      const prices = [...html.matchAll(regularRegex)];

      for (let i = 0; i < Math.min(dates.length, prices.length, 3); i++) {
        const date = dates[i][1].trim();
        const regular = parseFloat(prices[i][1]);

        // 提取涨跌（更宽松）
        const changeMatch = html.match(new RegExp(`### Gas Prices for ${date.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?Regular\\s*\\n\\s*\\d+\\.\\d*\\s*([↑↓(].*?)(?=\\n\\n|Premium)`, 'i'));
        const change = changeMatch ? changeMatch[1].trim() : '(n/c)';

        predictions.push({ date, regular, change });
      }

      if (predictions.length === 0) {
        throw new Error("No data extracted");
      }

      return Response.json({
        success: true,
        location: "GTA",
        source: "Dan McTeague",
        predictions: predictions,
        updated: new Date().toISOString()
      });

    } catch (err) {
      console.error(err);
      return Response.json({
        success: false,
        error: "抓取失败，请检查页面结构",
        message: err.message
      }, { status: 500 });
    }
  }
};