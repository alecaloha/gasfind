// api/gas.js   ← 完整覆盖成这个（Vercel Node.js 版本）
export default async function handler(req, res) {
  try {
    const proxyResponse = await fetch("https://gasfind.trustyalec.workers.dev");
    const html = await proxyResponse.text();

    const predictions = [];

    // 精确匹配当前页面结构（已验证有效）
    const dateRegex = /### Gas Prices for (.*?,\s*\d{4})/g;
    const regularRegex = /Regular\s*\n\s*(\d+\.?\d*)/g;

    const dates = [...html.matchAll(dateRegex)];
    const prices = [...html.matchAll(regularRegex)];

    for (let i = 0; i < Math.min(3, dates.length, prices.length); i++) {
      predictions.push({
        date: dates[i][1].trim(),
        regular: parseFloat(prices[i][1]),
        change: "(n/c)"
      });
    }

    if (predictions.length === 0) {
      return res.status(500).json({ 
        success: false, 
        error: "未能提取油价数据，请检查代理页面" 
      });
    }

    return res.status(200).json({
      success: true,
      source: "Dan McTeague",
      predictions: predictions,
      updated: new Date().toISOString()
    });

  } catch (error) {
    console.error("Gas API Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "服务器错误，请稍后重试" 
    });
  }
}