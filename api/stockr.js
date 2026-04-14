// api/stockr.js
// 数据源: https://stockr.trustyalec.workers.dev
// 实际HTML结构:
//   ### Today
//   174.9
//   Tuesday April 14, 2026
//   ### Tomorrow
//   174.9
//   Wednesday April 15, 2026
// 原始正则 "Today's price.*?(\d+\.?\d*)" 永远匹配不到，因为价格单独成行。

export default {
  async fetch(request) {
    try {
      const res = await fetch("https://stockr.trustyalec.workers.dev", {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const html = await res.text();

      const predictions = [];

      // 修正: 按 "### Today" 和 "### Tomorrow" 分块，取后面紧跟的数字和日期行
      // 用 [\s\S] 跨行匹配
      const blocks = [
        { key: "Today",    labelCN: "今天" },
        { key: "Tomorrow", labelCN: "明天" }
      ];

      for (const { key, labelCN } of blocks) {
        // 匹配 "### Today\n数字\n日期" 或 "### Tomorrow\n数字\n日期"
        const re = new RegExp(
          `###\\s*${key}\\s*[\\r\\n]+\\s*([\\d.]+)\\s*[\\r\\n]+\\s*([A-Za-z]+ [A-Za-z]+ \\d+,\\s*\\d{4})`,
          "i"
        );
        const m = html.match(re);
        if (m) {
          predictions.push({
            label: labelCN,
            price: parseFloat(m[1]),
            date: m[2].trim()
          });
        }
      }

      // 兜底: 如果上面未匹配到（页面结构略有变化），
      // 尝试抓取所有出现的价格数字（如 174.9）
      if (predictions.length === 0) {
        const priceMatches = [...html.matchAll(/(\d{3}\.\d)/g)];
        const dateMatches  = [...html.matchAll(/([A-Z][a-z]+ [A-Z][a-z]+ \d{1,2},\s*\d{4})/g)];
        const labels = ["今天", "明天"];
        for (let i = 0; i < Math.min(2, priceMatches.length); i++) {
          predictions.push({
            label: labels[i] || `第${i+1}天`,
            price: parseFloat(priceMatches[i][1]),
            date: dateMatches[i] ? dateMatches[i][1] : ""
          });
        }
      }

      return Response.json({ success: true, predictions });

    } catch (err) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }
};
