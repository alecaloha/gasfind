// api/stockr.js
export default {
  async fetch(request) {
    try {
      const res = await fetch("https://stockr.trustyalec.workers.dev");
      const html = await res.text();

      const predictions = [];

      // Today
      const todayPriceMatch = html.match(/Today's price.*?(\d+\.?\d*)/i);
      const todayDateMatch = html.match(/Today.*?(\w+\s+\w+\s+\d+,\s+\d{4})/i);

      if (todayPriceMatch) {
        predictions.push({
          label: "今天",
          price: parseFloat(todayPriceMatch[1]),
          date: todayDateMatch ? todayDateMatch[1] : "Today"
        });
      }

      // Tomorrow
      const tomorrowPriceMatch = html.match(/Tomorrow's price.*?(\d+\.?\d*)/i);
      const tomorrowDateMatch = html.match(/Tomorrow.*?(\w+\s+\w+\s+\d+,\s+\d{4})/i);

      if (tomorrowPriceMatch) {
        predictions.push({
          label: "明天",
          price: parseFloat(tomorrowPriceMatch[1]),
          date: tomorrowDateMatch ? tomorrowDateMatch[1] : "Tomorrow"
        });
      }

      return Response.json({
        success: true,
        predictions: predictions
      });

    } catch (err) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }
};