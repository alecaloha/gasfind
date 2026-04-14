// api/gas.js   ← 完整替换成这个（Vercel 专用）
export default async function handler(req, res) {
  try {
    const response = await fetch("https://gasfind.trustyalec.workers.dev");
    const html = await response.text();

    const predictions = [];

    // 适配当前页面结构
    const dateMatches = [...html.matchAll(/### Gas Prices for (.*?,\s*\d{4})/g)];
    const regularMatches = [...html.matchAll(/Regular\s*\n\s*(\d+\.?\d*)/g)];

    for (let i = 0; i < Math.min(3, dateMatches.length, regularMatches.length); i++) {
      predictions.push({
        date: dateMatches[i][1].trim(),
        regular: parseFloat(regularMatches[i][1]),
        change: "(n/c)"
      });
    }

    if (predictions.length === 0) {
      return res.status(500).json({ success: false, error: "未能提取油价" });
    }

    return res.status(200).json({
      success: true,
      source: "Dan McTeague",
      predictions: predictions
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "服务器错误" });
  }
}