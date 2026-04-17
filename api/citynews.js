// api/citynews.js
//
// ══════════════════════════════════════════════════════════════════
// 数据源: https://citynewsgas.trustyalec.workers.dev
// (该 worker 代理 toronto.citynews.ca/toronto-gta-gas-prices/ 并绕过 Cloudflare)
//
// 页面真实 HTML 结构（已验证）:
//
// 【摘要段落】
//   页面顶部有两个相邻元素:
//     <p>1 cent(s)</p>                          ← 变动量独立段落
//     <p>En-Pro tells CityNews that prices are expected to rise 1 cent(s)
//        at 12:01am on April 17, 2026
//        to an average of 173.9 cent(s)/litre at local stations.</p>
//
//   方向词: rise / fall / hold steady
//   变动量: N cent(s)
//   时间:   12:01am
//   日期:   April 17, 2026
//   均价:   173.9 cent(s)/litre
//
// 【Historical Values 表格】
//   <table>
//     <thead><tr><th>Date</th><th>Change</th><th>Price</th></tr></thead>
//     <tbody>
//       <tr><td>April 16, 2026</td><td>-4 cent(s)</td><td>172.9 cent(s)/litre</td></tr>
//       <tr><td>April 15, 2026</td><td>+3 cent(s)</td><td>176.9 cent(s)/litre</td></tr>
//       ... (当月所有历史记录，约16条)
//     </tbody>
//   </table>
//
// 【Past Months 表格】(当年各月，紧接 Historical Values)
//   <table>
//     <thead><tr><th>Month</th><th>High</th><th>Low</th></tr></thead>
//     <tbody>
//       <tr><td>March, 2026</td><td>178.9 cent(s)/litre</td><td>135.9 cent(s)/litre</td></tr>
//       <tr><td>February, 2026</td><td>134.9 cent(s)/litre</td><td>128.9 cent(s)/litre</td></tr>
//     </tbody>
//   </table>
//
// 【Past Years 表格】(2020–2025，每年一张，"Gas Prices from YYYY" 标题后)
//   2024+ 月份格式: "December, 2024" (有逗号)
//   2023 及更早:    "December 2023"  (无逗号)
//   每行: Month | High | Low，单位 cent(s)/litre 或纯数字
//
// 返回结构:
// {
//   success: true,
//   summary: {
//     direction: "rise" | "fall" | "hold",
//     cents: "1",
//     date: "April 17, 2026",
//     time: "12:01am",
//     average: "173.9"
//   },
//   description: "En-Pro tells CityNews...",
//   history: [
//     { date: "April 16, 2026", change: "-4", price: "172.9" },
//     ...
//   ],
//   pastMonths: [
//     { month: "March, 2026", high: "178.9", low: "135.9" },
//     ...
//   ],
//   pastYears: {
//     "2025": [ { month: "December, 2025", high: "132.9", low: "121.9" }, ... ],
//     "2024": [ ... ],
//     ...
//   }
// }
// ══════════════════════════════════════════════════════════════════

// 从一段 HTML 中找第一张 <table> 并解析所有数据行（跳过表头）
function parseFirstTable(htmlChunk) {
  const tStart = htmlChunk.indexOf("<table");
  const tEnd   = htmlChunk.indexOf("</table>");
  if (tStart === -1 || tEnd === -1) return [];
  const tableHtml = htmlChunk.slice(tStart, tEnd + 8);

  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trM;
  while ((trM = trRe.exec(tableHtml)) !== null) {
    const cells = [];
    const tdRe  = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let tdM;
    while ((tdM = tdRe.exec(trM[1])) !== null) {
      cells.push(tdM[1].replace(/<[^>]+>/g, "").trim());
    }
    if (cells.length >= 2) rows.push(cells);
  }
  // 过滤掉表头行
  return rows.filter(r =>
    !["date","change","price","month","high","low"].includes(r[0].toLowerCase())
  );
}

// 从价格字符串提取数字: "172.9 cent(s)/litre" → "172.9"，"172.9" → "172.9"
function extractPrice(str) {
  const m = (str || "").match(/([\d]+\.[\d])/);
  return m ? m[1] : str.trim();
}

// 从变动字符串提取带符号整数: "-4 cent(s)" → "-4", "+3 cent(s)" → "+3", "0 cent(s)" → "0"
function extractChange(str) {
  const m = (str || "").match(/([+-]?\d+)/);
  return m ? m[1] : "0";
}

export default {
  async fetch(request) {
    try {
      const res = await fetch("https://citynewsgas.trustyalec.workers.dev", {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const html = await res.text();

      // ── 1. 摘要 ──────────────────────────────────────────────────
      // 主正则: 一次捕获方向、变动量、时间、日期、均价
      const descM = html.match(
        /En-Pro tells CityNews[^<]*?expected to (rise|fall|hold\s+steady)\s*([\d.]+)?\s*cent[^<]*?at\s+([\d:]+[ap]m)\s+on\s+([A-Z][a-z]+ \d{1,2},\s*\d{4})[^<]*?average of\s+([\d.]+)/i
      );

      let direction, cents, time, date, average;

      if (descM) {
        const dir0 = descM[1].toLowerCase();
        direction  = dir0.startsWith("rise") ? "rise"
                   : dir0.startsWith("fall") ? "fall"
                   : "hold";
        cents   = descM[2] || "0";
        time    = descM[3];
        date    = descM[4].trim();
        average = descM[5];
      } else {
        // 兜底：分字段独立匹配
        const riseM   = html.match(/expected to rise\s+([\d.]+)\s*cent/i);
        const fallM   = html.match(/expected to fall\s+([\d.]+)\s*cent/i);
        direction     = riseM ? "rise" : fallM ? "fall" : "hold";
        cents         = (riseM || fallM)?.[1] ?? "0";
        const timeM   = html.match(/at\s+([\d:]+[ap]m)\s+on\s+([A-Z][a-z]+ \d{1,2},\s*\d{4})/i);
        time          = timeM?.[1] ?? "12:01am";
        date          = timeM?.[2]?.trim() ?? "";
        const avgM    = html.match(/average of\s+([\d.]+)\s*cent/i);
        average       = avgM?.[1] ?? "";
      }

      // 完整描述句（用于前端展示原文）
      const fullDescM  = html.match(/(En-Pro tells CityNews[\s\S]*?at local stations\.)/i);
      const description = fullDescM
        ? fullDescM[1].replace(/\s+/g, " ").trim()
        : "";

      // ── 2. Historical Values 表格 ─────────────────────────────────
      // 定位 "Historical Values" 文本，取其后第一张 <table>
      const histIdx  = html.indexOf("Historical Values");
      const histRows = histIdx !== -1
        ? parseFirstTable(html.slice(histIdx))
        : [];
      const history  = histRows.map(r => ({
        date:   r[0],
        change: extractChange(r[1]),
        price:  extractPrice(r[2])
      }));

      // ── 3. Past Months 表格 ──────────────────────────────────────
      // 定位 "Past Months" 文本，取其后第一张 <table>
      const monthIdx  = html.indexOf("Past Months");
      const monthRows = monthIdx !== -1
        ? parseFirstTable(html.slice(monthIdx))
        : [];
      const pastMonths = monthRows.map(r => ({
        month: r[0],
        high:  extractPrice(r[1]),
        low:   extractPrice(r[2])
      }));

      // ── 4. Past Years（按年分组）────────────────────────────────
      // 定位各 "Gas Prices from YYYY"，取其后第一张 <table>
      const pastYears = {};
      const yearRe    = /Gas Prices from (\d{4})/g;
      let ym;
      while ((ym = yearRe.exec(html)) !== null) {
        const year    = ym[1];
        const rows    = parseFirstTable(html.slice(ym.index));
        if (rows.length > 0) {
          pastYears[year] = rows.map(r => ({
            month: r[0],
            high:  extractPrice(r[1]),
            low:   extractPrice(r[2])
          }));
        }
      }

      return Response.json({
        success: true,
        summary: { direction, cents, date, time, average },
        description,
        history,
        pastMonths,
        pastYears
      });

    } catch (err) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }
};
