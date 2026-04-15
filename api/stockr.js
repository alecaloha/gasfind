// api/stockr.js
export default async function handler(req, res) {
  try {
    const response = await fetch("https://stockr.trustyalec.workers.dev", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept": "*/*"
      }
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const html = await response.text();

    const predictions = [];

    // ---- 通用宽松匹配：Today ----
    // 逻辑：在整段文本里找：
    //  Today ... 数字 ... 英文日期
    const todayRegex =
      /Today[^0-9]{0,40}(\d+\.?\d*)[^A-Za-z]{0,40}([A-Za-z]+ \d{1,2}, \d{4})/i;
    const todayMatch = html.match(todayRegex);
    if (todayMatch) {
      predictions.push({
        label: "今天",
        price: parseFloat(todayMatch[1]),
        date: todayMatch[2].trim()
      });
    }

    // ---- 通用宽松匹配：Tomorrow ----
    const tomorrowRegex =
      /Tomorrow[^0-9]{0,40}(\d+\.?\d*)[^A-Za-z]{0,40}([A-Za-z]+ \d{1,2}, \d{4})/i;
    const tomorrowMatch = html.match(tomorrowRegex);
    if (tomorrowMatch) {
      predictions.push({
        label: "明天",
        price: parseFloat(tomorrowMatch[1]),
        date: tomorrowMatch[2].trim()
      });
    }

    // ---- 兜底：从 <title> 里至少拿到“明天价格” ----
    // 例如：Tomorrow's Gas Price in Toronto - 174.9 cents/Litre | stockr
    if (!tomorrowMatch) {
      const titleMatch = html.match(
        /Tomorrow's Gas Price in Toronto\s*-\s*(\d+\.?\d*)\s*cents\/Litre/i
      );
      if (titleMatch) {
        predictions.push({
          label: "明天",
          price: parseFloat(titleMatch[1]),
          date: null // 标题里没有日期，就先留空
        });
      }
    }

    if (predictions.length === 0) {
      throw new Error("未能解析到 Stockr 油价数据（Worker 返回内容不含 Today/Tomorrow 模式）");
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
