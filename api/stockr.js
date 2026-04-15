// api/stockr.js
export default async function handler(req, res) {
  try {
    const response = await fetch("https://stockr.trustyalec.workers.dev", {
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
    const todayPrice = html.match(/id="today"[\s\S]*?class="price"[^>]*>(\d+\.?\d*)/i);
    const todayDate = html.match(/id="today"[\s\S]*?class="date"[^>]*>([^<]+)/i);

    if (todayPrice && todayDate) {
      predictions.push({
        label: "今天",
        price: parseFloat(todayPrice[1]),
        date: todayDate[1].trim()
      });
    }

    // Tomorrow
    const tomorrowPrice = html.match(/id="tomorrow"[\s\S]*?class="price"[^>]*>(\d+\.?\d*)/i);
    const tomorrowDate = html.match(/id="tomorrow"[\s\S]*?class="date"[^>]*>([^<]+)/i);

    if (tomorrowPrice && tomorrowDate) {
      predictions.push({
        label: "明天",
        price: parseFloat(tomorrowPrice[1]),
        date: tomorrowDate[1].trim()
      });
    }

    if (predictions.length === 0) {
      throw new Error("未能解析到 Stockr 油价数据（HTML 结构变更）");
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
