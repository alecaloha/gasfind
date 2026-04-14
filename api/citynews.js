// api/citynews.js
// 数据源: https://toronto.citynews.ca/toronto-gta-gas-prices/
//
// 原始问题:
// 1. 直接 fetch 被服务器拒绝 (403/blocked) — 需要加 User-Agent / Accept 等浏览器请求头
// 2. 正则 "rise (\d+) cent" 需要前面有空格，若出现 "rise 3 cent" 可以匹配，
//    但页面实际文字是 "expected to rise 3 cent(s)" — 需确认正则无误
// 3. history 正则 "(\w+\s+\d+,\s+\d{4})\s*([+-]?\d+)\s*cent.*?(\d+\.?\d*)" 过于复杂，
//    实际历史条目格式不同，导致 historyMatches 为空
// 4. pastMonths 是写死的静态数据，未从页面抓取

export default {
  async fetch(request) {
    // 模拟浏览器请求头，避免 403
    const headers = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-CA,en;q=0.9",
      "Referer": "https://toronto.citynews.ca/"
    };

    try {
      const res = await fetch("https://toronto.citynews.ca/toronto-gta-gas-prices/", { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      // ── 主摘要 ──────────────────────────────────────────────────────
      // 页面文字示例:
      // "En-Pro tells CityNews that prices are expected to rise 3 cent(s) at 12:01am on April 15, 2026 to an average of 176.9 cent(s)/litre"
      // 或 "...expected to fall 3 cent(s)..."
      // 或 "...expected to hold steady..."

      const riseM  = html.match(/expected to rise\s+([\d.]+)\s*cent/i);
      const fallM  = html.match(/expected to fall\s+([\d.]+)\s*cent/i);
      const holdM  = html.match(/expected to hold\s+steady/i);

      const cents  = riseM ? riseM[1] : (fallM ? fallM[1] : "0");
      const isRise = !!riseM;
      const isHold = !riseM && !fallM;

      // 生效日期: "at 12:01am on April 15, 2026"
      const dateM  = html.match(/at\s+[\d:]+[ap]m\s+on\s+([A-Za-z]+ \d{1,2},\s*\d{4})/i);
      const date   = dateM ? dateM[1].trim() : "";

      // 生效时间
      const timeM  = html.match(/at\s+([\d:]+[ap]m)\s+on/i);
      const time   = timeM ? timeM[1] : "12:01am";

      // 平均价格
      const avgM   = html.match(/average of\s+([\d.]+)\s*cent/i);
      const average= avgM ? avgM[1] : "";

      const description = isHold
        ? `En-Pro tells CityNews that prices are expected to hold steady.`
        : `En-Pro tells CityNews that prices are expected to ${isRise ? "rise" : "fall"} ${cents} cent(s) at ${time} on ${date} to an average of ${average} cent(s)/litre at local stations.`;

      // ── 历史价格 Historical Values ────────────────────────────────
      // 页面通常有如下格式的历史列表：
      // "April 13, 2026  +2  176.9"  或表格行
      const history = [];

      // 策略1: 查找 "月 日, 年" 配对价格行
      // 示例: "April 13, 2026\n174.9"
      const histRe1 = /([A-Z][a-z]+ \d{1,2},\s*\d{4})[^\d]*([\d]{3}\.?\d?)\s*cent/gi;
      let hm1;
      while ((hm1 = histRe1.exec(html)) !== null && history.length < 10) {
        // 排除摘要中的日期（已用 date 变量）
        if (hm1[1].trim() !== date) {
          history.push({ date: hm1[1].trim(), price: hm1[2] });
        }
      }

      // 策略2: 如果策略1抓不到，找 "+/-X cents" + 日期格式
      if (history.length === 0) {
        const histRe2 = /([A-Z][a-z]+ \d{1,2},\s*\d{4}).*?([+-]\d+)\s*cent.*?([\d]{3}\.?\d?)/gi;
        let hm2;
        while ((hm2 = histRe2.exec(html)) !== null && history.length < 10) {
          history.push({
            date:   hm2[1].trim(),
            change: hm2[2],
            price:  hm2[3]
          });
        }
      }

      // ── Past Months ───────────────────────────────────────────────
      // 页面通常有如: "March, 2026  High: 178.9  Low: 135.9"
      const pastMonths = [];
      const monthRe = /([A-Z][a-z]+,\s*\d{4})[^<]*?[Hh]igh[:\s]*([\d.]+)[^<]*?[Ll]ow[:\s]*([\d.]+)/g;
      let mm;
      while ((mm = monthRe.exec(html)) !== null && pastMonths.length < 6) {
        pastMonths.push({ month: mm[1], high: mm[2], low: mm[3] });
      }

      // 策略2: 如果 high/low 格式找不到，找月份 + 单个价格
      if (pastMonths.length === 0) {
        const monthRe2 = /([A-Z][a-z]+,?\s*\d{4})[^<\d]*([\d]{3}\.?\d?)/g;
        let mm2;
        const seen = new Set();
        while ((mm2 = monthRe2.exec(html)) !== null && pastMonths.length < 6) {
          const key = mm2[1].trim();
          if (!seen.has(key)) {
            seen.add(key);
            pastMonths.push({ month: key, price: mm2[2] });
          }
        }
      }

      return Response.json({
        success: true,
        date,
        time,
        rise: isRise,
        hold: isHold,
        cents,
        average,
        description,
        history,
        pastMonths
      });

    } catch (err) {
      // 如果抓取失败（403等），返回错误信息和 success:false
      // 前端应展示适当的错误提示，不使用静态数据
      return Response.json({
        success: false,
        error: err.message
      }, { status: 500 });
    }
  }
};
