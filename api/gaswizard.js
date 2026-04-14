// api/gaswizard.js
export default {
  async fetch(request) {
    try {
      const res = await fetch("https://gaswizard.trustyalec.workers.dev");
      const html = await res.text();

      const predictions = [];
      const now = new Date();

      // 匹配日期和 Regular 价格（格式示例：Tuesday - Apr 14, 2026）
      const dateMatches = [...html.matchAll(/(\w+)\s*-\s*(\w+\s+\d+,\s+\d{4})/g)];
      const regularMatches = [...html.matchAll(/Regular\s*:\s*(\d+\.?\d*)/g)];

      for (let i = 0; i < Math.min(dateMatches.length, regularMatches.length, 3); i++) {
        const fullDateStr = dateMatches[i][0];
        const dateText = `${dateMatches[i][1]} ${dateMatches[i][2]}`;
        const regular = parseFloat(regularMatches[i][1]);

        // 判断今日/未来/过去（简单日期比较）
        let tag = "未来";
        const cardDate = new Date(dateText);
        if (cardDate.toDateString() === now.toDateString()) tag = "今日";
        else if (cardDate < now) tag = "过去";

        const change = html.includes("n/c") ? "(n/c)" : "";

        predictions.push({
          date: `${tag} - ${dateText}`,
          regular: regular,
          change: change
        });
      }

      return Response.json({
        success: true,
        source: "Gas Wizard",
        predictions: predictions
      });

    } catch (err) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }
};