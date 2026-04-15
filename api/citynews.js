// api/citynews.js
//
// ══════════════════════════════════════════════════════
// 数据源: https://toronto.citynews.ca/toronto-gta-gas-prices/
//
// 页面真实文本结构 (关键片段):
//
// 【摘要段落】
//   "3 cent(s) En-Pro tells CityNews that prices are expected to rise 3 cent(s)
//    at 12:01am on April 15, 2026 to an average of 176.9 cent(s)/litre
//    at local stations."
//
//   或下降版本:
//   "3 cent(s) En-Pro tells CityNews that prices are expected to fall 3 cent(s)
//    at 12:01am on April 15, 2026 to an average of 173.9 cent(s)/litre"
//
//   或持平版本:
//   "En-Pro tells CityNews that prices are expected to hold steady..."
//
//   注意: 页面开头就是那个变动数字 "3 cent(s)"，
//         整个句子都在一个段落里，结构固定。
//
// 【历史价格 Historical Values】
//   页面有历史记录列表，每条格式类似:
//   "April 13, 2026  Rise 2 cent(s)  176.9 cent(s)/litre"
//   或表格: 日期 | 变动 | 价格
//   精确HTML结构依赖页面渲染，用多套正则覆盖。
//
// 【Past Months】
//   月度汇总，格式类似:
//   "March, 2026  High: 178.9  Low: 135.9 cent(s)/litre"
//
// ══════════════════════════════════════════════════════
//
// 注意: toronto.citynews.ca 会拒绝无浏览器UA的请求，
//       必须带完整浏览器请求头才能获取页面内容。
//
// 返回结构:
// {
//   success: true,
//   summary: {
//     direction: "rise" | "fall" | "hold",
//     cents: "3",            // 变动分数，hold时为"0"
//     date: "April 15, 2026",
//     time: "12:01am",
//     average: "176.9"       // 变动后平均价，单位¢/L
//   },
//   description: "完整原文句子",
//   history: [
//     { date: "April 13, 2026", direction: "rise", cents: "2", price: "176.9" },
//     ...
//   ],
//   pastMonths: [
//     { month: "March, 2026", high: "178.9", low: "135.9" },
//     ...
//   ]
// }

export default {
  async fetch(request) {
    const BROWSER_HEADERS = {
      "User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-CA,en;q=0.9",
      "Cache-Control":   "no-cache",
      "Referer":         "https://toronto.citynews.ca/"
    };

    try {
      const res = await fetch(
        "https://toronto.citynews.ca/toronto-gta-gas-prices/",
        { headers: BROWSER_HEADERS }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const html = await res.text();

      // ── 1. 解析摘要 ──────────────────────────────────────────────
      // 主句: "prices are expected to rise/fall N cent(s) at TIME on DATE to an average of AVG cent(s)/litre"
      // 变动方向
      const riseM = html.match(/expected to rise\s+([\d.]+)\s*cent/i);
      const fallM = html.match(/expected to fall\s+([\d.]+)\s*cent/i);
      const holdM = html.match(/expected to hold\s+steady/i);

      const direction = riseM ? "rise" : (fallM ? "fall" : "hold");
      const cents     = riseM ? riseM[1] : (fallM ? fallM[1] : "0");

      // 生效时间: "at 12:01am on April 15, 2026"
      const timeM = html.match(/at\s+([\d:]+[ap]m)\s+on\s+([A-Z][a-z]+ \d{1,2},\s*\d{4})/i);
      const time  = timeM ? timeM[1] : "12:01am";
      const date  = timeM ? timeM[2].trim() : "";

      // 平均价格: "to an average of 176.9 cent(s)/litre"
      const avgM    = html.match(/average of\s+([\d.]+)\s*cent/i);
      const average = avgM ? avgM[1] : "";

      // 提取完整描述句 (En-Pro...stations.)
      const descM = html.match(/(En-Pro tells CityNews[^<.]*\.)/i);
      const description = descM ? descM[1].trim() : "";

      const summary = { direction, cents, date, time, average };

      // ── 2. 解析历史价格 ──────────────────────────────────────────
      // 尝试多种格式:
      // 格式A: "April 13, 2026 Rise 2 cent(s) 176.9"  (纯文本段落)
      // 格式B: 表格 <td>April 13</td><td>+2</td><td>176.9</td>
      const history = [];

      // 格式A: 日期 + rise/fall + 数字 + cent + 价格
      const histReA = /([A-Z][a-z]+ \d{1,2},\s*\d{4})[^<]*?(rise|fall)\s+([\d.]+)\s*cent[^<]*?([\d]{3}\.[\d])/gi;
      let hmA;
      while ((hmA = histReA.exec(html)) !== null && history.length < 10) {
        history.push({
          date:      hmA[1].trim(),
          direction: hmA[2].toLowerCase(),
          cents:     hmA[3],
          price:     hmA[4]
        });
      }

      // 格式B: 表格行 <tr><td>日期</td><td>变动</td><td>价格</td></tr>
      if (history.length === 0) {
        const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let tr;
        while ((tr = trRe.exec(html)) !== null && history.length < 10) {
          const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c =>
            c[1].replace(/<[^>]+>/g, "").trim()
          );
          // 期望: [日期, 变动/价格, ...]
          if (cells.length >= 2) {
            const dateCell  = cells[0];
            const priceCell = cells[cells.length - 1];
            if (/[A-Z][a-z]+ \d/.test(dateCell) && /[\d]{3}\.[\d]/.test(priceCell)) {
              const dirCell = cells[1] || "";
              history.push({
                date:      dateCell,
                direction: /fall|drop|-/i.test(dirCell) ? "fall" : "rise",
                cents:     (dirCell.match(/[\d.]+/) || [""])[0],
                price:     (priceCell.match(/[\d]{3}\.[\d]/) || [""])[0]
              });
            }
          }
        }
      }

      // ── 3. 解析 Past Months ──────────────────────────────────────
      // 格式: "March, 2026 High: 178.9 Low: 135.9" 或表格
      const pastMonths = [];

      const monthReA = /([A-Z][a-z]+,\s*\d{4})[^<]*?[Hh]igh[:\s]*([\d.]+)[^<]*?[Ll]ow[:\s]*([\d.]+)/g;
      let mm;
      while ((mm = monthReA.exec(html)) !== null && pastMonths.length < 6) {
        pastMonths.push({ month: mm[1].trim(), high: mm[2], low: mm[3] });
      }

      return Response.json({
        success: true,
        summary,
        description,
        history,
        pastMonths
      });

    } catch (err) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }
};
