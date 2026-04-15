// api/stockr.js
export default async function handler(req, res) {
  try {
    const response = await fetch("https://stockr.net/toronto/gasprice.aspx", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "text/html"
      }
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const html = await response.text();

    const predictions = [];

    // Today
    const todayMatch = html.match(/Today\s+(\d+\.?\d*)\s+([A-Za-z]+ \d{1,2}, \d{4})/i);
    if (todayMatch) {
      predictions.push({
        label: "今天",
        price: parseFloat(todayMatch[1]),
        date: todayMatch[2]
      });
    }

    // Tomorrow
    const tomorrowMatch = html.match(/Tomorrow\s+(\d+\.?\d*)\s+([A-Za-z]+ \d{1,2}, \d{4})/i);
    if (tomorrowMatch) {
      predictions.push({
        label: "明天",
        price: parseFloat(tomorrowMatch[1]),
        date: tomorrowMatch[2]
      });
    }

    if (predictions.length === 0) {
      throw new Error("未能解析到 Stockr 油价数据（页面结构可能变更）");
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
