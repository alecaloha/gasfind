// api/stockr.js
export default async function handler(req, res) {
  try {
    const response = await fetch("https://stockr.trustyalec.workers.dev", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const html = await response.text();
    console.log("RAW HTML:", html.slice(0, 500));

    const predictions = [];

    // 通用模式：匹配 "Today" 后跟价格和日期（不依赖换行）
    const todayRegex = /Today[^0-9]*?(\d+\.?\d*)[^A-Za-z]*?([A-Za-z]+ \d{1,2}, \d{4})/i;
    const tomorrowRegex = /Tomorrow[^0-9]*?(\d+\.?\d*)[^A-Za-z]*?([A-Za-z]+ \d{1,2}, \d{4})/i;

    const todayMatch = html.match(todayRegex);
    if (todayMatch) {
      predictions.push({
        label: "今天",
        price: parseFloat(todayMatch[1]),
        date: todayMatch[2]
      });
    }

    const tomorrowMatch = html.match(tomorrowRegex);
    if (tomorrowMatch) {
      predictions.push({
        label: "明天",
        price: parseFloat(tomorrowMatch[1]),
        date: tomorrowMatch[2]
      });
    }

    if (predictions.length === 0) {
      throw new Error("未能解析到 Stockr 油价数据，页面结构可能变更");
    }

    return res.status(200).json({
      success: true,
      predictions
    });

  } catch (err) {
    console.error("Stockr API Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "获取 Stockr 数据失败"
    });
  }
}
