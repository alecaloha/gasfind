// api/citynews.js
export default {
  async fetch(request) {
    try {
      const res = await fetch("https://toronto.citynews.ca/toronto-gta-gas-prices/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "text/html"
        }
      });

      const html = await res.text();

      // -----------------------------
      // 1. 抓取 “预计涨/跌 + 日期 + 平均价”
      // -----------------------------
      const mainBlock = html.match(/En-Pro tells CityNews[\s\S]*?average of.*?cent/);
      let rise = null, cents = null, date = null, average = null;

      if (mainBlock) {
        const block = mainBlock[0];

        // 涨跌
        const riseMatch = block.match(/(rise|increase)/i);
        const fallMatch = block.match(/(fall|decrease)/i);
        rise = !!riseMatch;

        // 涨跌多少
        const centsMatch = block.match(/(\d+)\s*cent/i);
        cents = centsMatch ? centsMatch[1] : null;

        // 日期
        const dateMatch = block.match(/on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
        date = dateMatch ? dateMatch[1] : null;

        // 平均价
        const avgMatch = block.match(/average of\s+(\d+\.?\d*)/i);
        average = avgMatch ? avgMatch[1] : null;
      }

      // -----------------------------
      // 2. 抓取历史记录（自动解析）
      // -----------------------------
      const history = [];
      const historyRegex = /([A-Za-z]+\s+\d{1,2},\s+\d{4}).*?([+-]?\d+)\s*cent.*?(\d+\.?\d*)/g;
      let m;
      while ((m = historyRegex.exec(html)) !== null) {
        history.push({
          date: m[1],
          change: m[2] + " cent(s)",
          price: m[3]
        });
      }

      // -----------------------------
      // 3. 抓取 Past Months（自动解析）
      // -----------------------------
      const pastMonths = [];
      const monthRegex = /([A-Za-z]+,\s+\d{4}).*?High:\s*(\d+\.?\d*).*?Low:\s*(\d+\.?\d*)/g;
      let mm;
      while ((mm = monthRegex.exec(html)) !== null) {
        pastMonths.push({
          month: mm[1],
          high: mm[2],
          low: mm[3]
        });
      }

      return Response.json({
        success: true,
        rise,
        cents,
        date,
        average,
        history,
        pastMonths
      });

    } catch (err) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }
};
