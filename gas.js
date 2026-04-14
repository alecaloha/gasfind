// api/gas.js
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const proxyResponse = await fetch("https://gasfind.trustyalec.workers.dev", {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!proxyResponse.ok) {
      throw new Error(`Proxy failed: ${proxyResponse.status}`);
    }

    const html = await proxyResponse.text();

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

    if (predictions.length === 0) {
      return res.status(500).json({ 
        success: false, 
        error: "未能从页面提取油价数据" 
      });
    }

    return res.status(200).json({
      success: true,
      source: "Dan McTeague",
      predictions: predictions,
      updated: new Date().toISOString()
    });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "无法获取油价，请稍后重试" 
    });
  }
}