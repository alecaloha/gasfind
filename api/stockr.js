// api/stockr.js
//
// ══════════════════════════════════════════════════════
// 数据源: https://stockr.trustyalec.workers.dev
//
// 页面真实HTML结构:
//   <h3>Today</h3>
//   <p>174.9</p>
//   <p>Tuesday April 14, 2026</p>
//
//   <h3>Tomorrow</h3>
//   <p>174.9</p>
//   <p>Wednesday April 15, 2026</p>
//
// 价格和日期各自在独立的 <p> 标签里，紧跟在 <h3> 之后。
// 标题文字就是 "Today" / "Tomorrow"，无冒号、无额外修饰词。
// ══════════════════════════════════════════════════════

export default {
  async fetch(request) {
    try {
      const res = await fetch("https://stockr.trustyalec.workers.dev", {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const html = await res.text();

      // 从 <h3>Label</h3> 开始，取后面 400 字符内的第一个价格和日期
      function extractBlock(label) {
        const h3Re = new RegExp(
          `<h3[^>]*>\\s*${label}\\s*</h3>([\\s\\S]{0,400})`,
          "i"
        );
        const m = html.match(h3Re);
        if (!m) return null;
        const chunk = m[1];

        // 价格格式: 3位整数 + 小数点 + 1位，例如 174.9
        const priceM = chunk.match(/<p[^>]*>([\d]{3}\.[\d])<\/p>/);
        // 日期格式: "Tuesday April 14, 2026" — 完整星期 + 完整月份
        const dateM  = chunk.match(/<p[^>]*>([A-Z][a-z]+ [A-Z][a-z]+ \d{1,2}, \d{4})<\/p>/);

        if (!priceM) return null;
        return {
          price: parseFloat(priceM[1]),
          date:  dateM ? dateM[1] : ""
        };
      }

      const todayData    = extractBlock("Today");
      const tomorrowData = extractBlock("Tomorrow");

      const predictions = [];
      if (todayData)    predictions.push({ label: "今天", price: todayData.price,    date: todayData.date });
      if (tomorrowData) predictions.push({ label: "明天", price: tomorrowData.price, date: tomorrowData.date });

      if (predictions.length === 0) {
        throw new Error("未能从页面解析到价格数据，页面结构可能已变更");
      }

      return Response.json({ success: true, predictions });

    } catch (err) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }
};
