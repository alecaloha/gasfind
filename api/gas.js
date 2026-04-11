// api/gas.js
export default {
  async fetch(request) {
    const proxyUrl = "https://gasfind.trustyalec.workers.dev";

    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

      const predictions = [];

      const rewriter = new HTMLRewriter()
        .on("h3", {
          element(element) {
            // 找到日期标题时，准备收集下一个价格
            this.currentDate = element.text.trim();
          }
        })
        .on(".text-5xl, .text-4xl, .text-3xl, .font-bold", {   // 价格数字常见 class
          element(element) {
            if (this.currentDate && predictions.length < 3) {
              const priceText = element.text.trim().replace(/[^0-9.]/g, "");
              const price = parseFloat(priceText);

              if (price > 100) {  // 过滤无效价格
                predictions.push({
                  date: this.currentDate,
                  regular: price,
                  change: ""  // 可后续扩展抓取涨跌符号
                });
              }
            }
          }
        });

      await rewriter.transform(res).arrayBuffer();  // 执行解析

      // 如果没抓够3天，尝试备用逻辑（页面结构可能变化）
      if (predictions.length === 0) {
        // 可在这里加更宽松的 selector，或返回错误提示
      }

      return Response.json({
        success: true,
        location: "GTA / Oakville",
        source: "Dan McTeague - Gas Price Predictions",
        predictions: predictions.slice(0, 3),   // 确保最多3天
        updated: new Date().toISOString()
      });

    } catch (error) {
      console.error(error);
      return Response.json({
        success: false,
        error: "无法解析油价数据，请稍后重试",
        message: error.message
      }, { status: 500 });
    }
  }
};