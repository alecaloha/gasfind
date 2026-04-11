// api/gas.js
export default {
  async fetch(request) {
    try {
      const html = await (await fetch("https://gasfind.trustyalec.workers.dev")).text();

      const predictions = [];

      // 提取日期
      const dateMatches = [...html.matchAll(/### Gas Prices for (.*?,\s*\d{4})/g)];

      // 提取 Regular 价格
      const priceMatches = [...html.matchAll(/Regular\s*\n\s*(\d+\.?\d*)/g)];

      for (let i = 0; i < Math.min(3, dateMatches.length, priceMatches.length); i++) {
        const date = dateMatches[i][1].trim();
        const regular = parseFloat(priceMatches[i][1]);

        // 尝试提取变化（n/c、↑、↓）
        const sectionStart = html.indexOf(dateMatches[i][0]);
        const section = html.substring(sectionStart, sectionStart + 300);
        const changeMatch = section.match(/Regular\s*\n\s*\d+\.?\d*\s*([↑↓(n/c)].*?)(?=\n\n|Premium)/i);
        const change = changeMatch ? changeMatch[1].trim() : '(n/c)';

        predictions.push({ date, regular, change });
      }

      return Response.json({
        success: true,
        location: "GTA",
        source: "Dan McTeague",
        predictions: predictions,
        updated: new Date().toISOString()
      });

    } catch (err) {
      return Response.json({ 
        success: false, 
        error: err.message || "抓取失败" 
      }, { status: 500 });
    }
  }
};