// api/gaswizard.js
//
// ══════════════════════════════════════════════════════
// 数据源: https://gaswizard.trustyalec.workers.dev
//
// 页面真实HTML结构 (价格列表部分):
//
//   <ul>
//     <li>
//       Tuesday - Apr 14, 2026    ← 日期行（缩写月份）
//       Regular                   ← 燃料类型文字
//       174.9 (n/c)               ← 价格 + 变动（括号内）
//       Premium
//       204.9 (n/c)
//       Diesel
//       202.9 (n/c)
//     </li>
//     <li>
//       Monday - Apr 13, 2026
//       Regular
//       174.9 (n/c)
//       ...
//     </li>
//
//     <!-- 当前均价列表，紧跟在价格li之后 -->
//     <li>
//       Current Average Price     ← h3标题
//       $1.749 (Reported at: Apr 14, 2026 06:21)
//     </li>
//     <li>$1.749 (Reported: Apr 13, 2026 18:20)</li>
//     <li>$1.749 (Reported: Apr 13, 2026 06:20)</li>
//     <li>$1.749 (Reported: Apr 12, 2026 18:20)</li>
//     <li>$1.749 (Reported: Apr 12, 2026 06:21)</li>
//   </ul>
//
// 关键特征:
// 1. 日期格式: "Tuesday - Apr 14, 2026" (缩写月份，有破折号)
// 2. Regular/Premium/Diesel 是纯文本标签，价格紧跟其后同一个li内
// 3. 变动标注在括号内: (n/c) 或 (+2.0) 等
// 4. 历史均价格式: "$1.749 (Reported at: Apr 14, 2026 06:21)"
//    或             "$1.749 (Reported: Apr 13, 2026 18:20)"
//
// 原始错误原因:
// 1. "Regular\s*:\s*(\d+)" → 无冒号，Regular和价格不在同一行且无标点分隔
// 2. dateMatches 和 regularMatches 是分开匹配再靠index对齐 → 数量不一定对应
// 3. new Date("Tuesday Apr 14, 2026") → 缩写月份在部分环境解析为NaN
// ══════════════════════════════════════════════════════

const MONTH_MAP = {
  Jan:"January", Feb:"February", Mar:"March",    Apr:"April",
  May:"May",     Jun:"June",     Jul:"July",     Aug:"August",
  Sep:"September",Oct:"October", Nov:"November", Dec:"December"
};

function abbToFull(abbMonth) {
  return MONTH_MAP[abbMonth] || abbMonth;
}

// 将 "Apr 14, 2026" 解析为 Date 对象（容忍缩写月份）
function parseDate(str) {
  // str 可能是 "Apr 14, 2026" 或 "April 14, 2026"
  const m = str.match(/(\w{3,9})\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return null;
  const fullMonth = abbToFull(m[1]);
  return new Date(`${fullMonth} ${m[2]}, ${m[3]}`);
}

function getTag(dateStr, now) {
  const d = parseDate(dateStr);
  if (!d) return "未知";
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cardDay  = new Date(d.getFullYear(),   d.getMonth(),   d.getDate());
  const diff     = Math.round((cardDay - today) / 86400000);
  if (diff === 0)  return "今日";
  if (diff > 0)   return "未来";
  return "过去";
}

export default {
  async fetch(request) {
    try {
      const res = await fetch("https://gaswizard.trustyalec.workers.dev", {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const html = await res.text();
      const now  = new Date();

      // ── 1. 解析价格块 ─────────────────────────────────────────────
      // 每个 <li> 内包含: 日期行 + Regular价格 + Premium价格 + Diesel价格
      // 用正则匹配整个li的文本块，一次性捕获三个价格
      //
      // 目标: 匹配 li 内容，提取:
      //   - 日期: "Tuesday - Apr 14, 2026"
      //   - Regular价格: 174.9
      //   - Regular变动: n/c 或 +2.0 等
      //   - Premium价格, Diesel价格

      const predictions = [];

      // 提取所有 <li>...</li> 块
      const liRe = /<li>([\s\S]*?)<\/li>/gi;
      let liMatch;
      while ((liMatch = liRe.exec(html)) !== null && predictions.length < 3) {
        const liText = liMatch[1];

        // 判断是否是价格块: 必须同时含有日期格式 和 "Regular"
        const dateM = liText.match(/(\w+day)\s*-\s*(\w{3}\s+\d{1,2},\s*\d{4})/);
        if (!dateM) continue;
        if (!liText.includes("Regular")) continue;

        const dateLabel = `${dateM[1]} - ${dateM[2]}`; // "Tuesday - Apr 14, 2026"
        const tag = getTag(dateM[2], now);

        // 从li文本中依次提取三种燃料价格
        // 格式: "Regular\n  174.9 (n/c)" → 取 Regular 后面第一个 数字(变动)
        const fuelRe = /(\w+)\s+([\d]{3}\.[\d])\s*\(([^)]*)\)/g;
        const fuels = {};
        let fm;
        while ((fm = fuelRe.exec(liText)) !== null) {
          const name = fm[1]; // Regular / Premium / Diesel
          if (["Regular","Premium","Diesel"].includes(name)) {
            fuels[name] = { price: parseFloat(fm[2]), change: fm[3].trim() };
          }
        }

        if (!fuels.Regular) continue;

        predictions.push({
          date:    dateLabel,
          tag,
          regular: fuels.Regular.price,
          change:  fuels.Regular.change,
          premium: fuels.Premium ? fuels.Premium.price : null,
          diesel:  fuels.Diesel  ? fuels.Diesel.price  : null
        });
      }

      // ── 2. 解析历史均价 ───────────────────────────────────────────
      // 格式1: "$1.749(Reported at: Apr 14, 2026 06:21)"
      // 格式2: "$1.749 (Reported: Apr 13, 2026 18:20)"
      const history = [];
      const histRe  = /\$([\d.]+)\s*\(Reported(?:\s+at)?:\s*([A-Za-z]{3}\s+\d{1,2},\s*\d{4}\s+[\d:]+)\)/g;
      let hm;
      while ((hm = histRe.exec(html)) !== null && history.length < 6) {
        history.push({
          price: hm[1],       // "1.749"
          date:  hm[2].trim() // "Apr 14, 2026 06:21"
        });
      }

      if (predictions.length === 0) {
        throw new Error("未能从页面解析到价格数据，页面结构可能已变更");
      }

      return Response.json({
        success:     true,
        source:      "Gas Wizard",
        predictions,
        history
      });

    } catch (err) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }
};
