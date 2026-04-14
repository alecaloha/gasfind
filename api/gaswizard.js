// api/gaswizard.js
// 数据源: https://gaswizard.trustyalec.workers.dev
// 实际HTML结构 (list items):
//   Tuesday - Apr 14, 2026
//   Regular
//   174.9 (n/c)
//   Premium
//   204.9 (n/c)
//   Diesel
//   202.9 (n/c)
//
// 原始问题:
// 1. 正则 "Regular\s*:\s*(\d+\.?\d*)" 匹配不到 — 实际无冒号，价格另起一行
// 2. 日期是缩写月份 "Apr 14, 2026"，new Date("Tuesday Apr 14, 2026") 解析失败
// 3. dateMatches 和 regularMatches 不对应 — 日期匹配同时命中了新闻/天气等无关日期

export default {
  async fetch(request) {
    try {
      const res = await fetch("https://gaswizard.trustyalec.workers.dev", {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const html = await res.text();

      const predictions = [];
      const now = new Date();
      // 统一今天零点，只比较日期部分
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 缩写月份映射 → 全写（用于 new Date() 解析）
      const monthMap = {
        Jan:"January", Feb:"February", Mar:"March",    Apr:"April",
        May:"May",     Jun:"June",     Jul:"July",     Aug:"August",
        Sep:"September",Oct:"October", Nov:"November", Dec:"December"
      };

      // 修正正则: 匹配一个价格块，格式如:
      //   "Tuesday - Apr 14, 2026\n  Regular\n  174.9 (n/c)\n  Premium\n  204.9 (n/c)\n  Diesel\n  202.9 (n/c)"
      // 使用单次宽泛匹配来捕获日期区块内的三个价格
      const blockRe = /(\w+)\s*-\s*((\w+)\s+(\d+),\s*(\d{4}))\s+Regular\s+([\d.]+)\s*(\([^)]*\))?\s+Premium\s+([\d.]+)\s*(\([^)]*\))?\s+Diesel\s+([\d.]+)\s*(\([^)]*\))?/g;

      let match;
      while ((match = blockRe.exec(html)) !== null && predictions.length < 3) {
        const [, dayName, rawDate, abbMonth, day, year,
               regular, regChange,
               premium, premChange,
               diesel,  diesChange] = match;

        // 修正月份缩写 → 全写，使 new Date() 可靠解析
        const fullMonth = monthMap[abbMonth] || abbMonth;
        const normalizedDate = `${fullMonth} ${day}, ${year}`;
        const cardDate = new Date(normalizedDate);
        const cardMidnight = new Date(cardDate.getFullYear(), cardDate.getMonth(), cardDate.getDate());

        let tag;
        const diffDays = Math.round((cardMidnight - todayMidnight) / 86400000);
        if (diffDays === 0)     tag = "今日";
        else if (diffDays > 0)  tag = "未来";
        else                    tag = "过去";

        const changeStr = (regChange || "").replace(/[()]/g, "").trim() || "n/c";

        predictions.push({
          date:    `${dayName} - ${rawDate}`,
          dateCN:  `${normalizedDate}`,
          tag,
          regular: parseFloat(regular),
          premium: parseFloat(premium),
          diesel:  parseFloat(diesel),
          change:  changeStr
        });
      }

      // 兜底: 如果块级正则未命中（页面有细微格式变化），分别抓取日期和价格
      if (predictions.length === 0) {
        const dateRe    = /(\w+)\s*-\s*(\w{3})\s+(\d{1,2}),\s*(\d{4})/g;
        const regularRe = /Regular\s+([\d.]+)\s*(\([^)]*\))?/g;
        const premiumRe = /Premium\s+([\d.]+)\s*(\([^)]*\))?/g;
        const dieselRe  = /Diesel\s+([\d.]+)\s*(\([^)]*\))?/g;

        const dates    = [...html.matchAll(dateRe)];
        const regulars = [...html.matchAll(regularRe)];
        const premiums = [...html.matchAll(premiumRe)];
        const diesels  = [...html.matchAll(dieselRe)];

        for (let i = 0; i < Math.min(3, dates.length, regulars.length); i++) {
          const [, dayName, abbMonth, day, year] = dates[i];
          const fullMonth   = monthMap[abbMonth] || abbMonth;
          const normalizedDate = `${fullMonth} ${day}, ${year}`;
          const cardDate    = new Date(normalizedDate);
          const cardMidnight= new Date(cardDate.getFullYear(), cardDate.getMonth(), cardDate.getDate());
          const diffDays    = Math.round((cardMidnight - todayMidnight) / 86400000);
          const tag         = diffDays === 0 ? "今日" : diffDays > 0 ? "未来" : "过去";

          predictions.push({
            date:    dates[i][0],
            dateCN:  normalizedDate,
            tag,
            regular: parseFloat(regulars[i]?.[1] || 0),
            premium: parseFloat(premiums[i]?.[1]  || 0),
            diesel:  parseFloat(diesels[i]?.[1]   || 0),
            change:  (regulars[i]?.[2] || "(n/c)").replace(/[()]/g, "").trim()
          });
        }
      }

      // 历史价格: "$1.749 (Reported at: Apr 14, 2026 06:21)"
      const history = [];
      const histRe = /\$([\d.]+)\s*\(?Reported(?:\s+at)?:\s*([A-Za-z]{3}\s+\d{1,2},\s*\d{4}\s*[\d:]+)\)?/g;
      let hm;
      while ((hm = histRe.exec(html)) !== null && history.length < 8) {
        history.push({ price: hm[1], date: hm[2].trim() });
      }

      return Response.json({
        success: true,
        source: "Gas Wizard",
        predictions,
        history
      });

    } catch (err) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }
};
