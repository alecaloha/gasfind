// api/gas.js
export default async function handler(req, res) {
  try {
    const response = await fetch("https://gasfind.trustyalec.workers.dev");
    const html = await response.text();

    const predictions = [];
    const dateMatches = [...html.matchAll(/### Gas Prices for (.*?,\s*\d{4})/g)];
    const regularMatches = [...html.matchAll(/Regular\s*\n\s*(\d+\.?\d*)/g)];

    for (let i = 0; i < Math.min(3, dateMatches.length, regularMatches.length); i++) {
      predictions.push({
        date: dateMatches[i][1].trim(),
        regular: parseFloat(regularMatches[i][1]),
        change: "(n/c)"
      });
    }

    res.status(200).json({
      success: true,
      predictions: predictions.length > 0 ? predictions : [],
      timestamp: new Date().toLocaleString('zh-CN')
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "获取失败" });
  }
}