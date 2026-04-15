// api/stockr.js
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const response = await fetch("https://stockr.trustyalec.workers.dev", {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const html = await response.text();

    // 极简提取（适配当前 Markdown 结构）
    const todayPrice = html.match(/### Today[\s\S]*?(\d+\.?\d*)/);
    const tomorrowPrice = html.match(/### Tomorrow[\s\S]*?(\d+\.?\d*)/);

    const todayDate = html.match(/### Today[\s\S]*?([A-Za-z]+ [A-Za-z]+ \d+, \d{4})/);
    const tomorrowDate = html.match(/### Tomorrow[\s\S]*?([A-Za-z]+ [A-Za-z]+ \d+, \d{4})/);

    const predictions = [];

    if (todayPrice) {
      predictions.push({
        label: "今天",
        price: parseFloat(todayPrice[1]),
        date: todayDate ? todayDate[1].trim() : "Today"
      });
    }

    if (tomorrowPrice) {
      predictions.push({
        label: "明天",
        price: parseFloat(tomorrowPrice[1]),
        date: tomorrowDate ? tomorrowDate[1].trim() : "Tomorrow"
      });
    }

    if (predictions.length === 0) {
      return res.status(500).json({ success: false, error: "未能提取 Stockr 数据" });
    }

    return res.status(200).json({
      success: true,
      predictions: predictions
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Stockr 接口错误" });
  }
}
