const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get("/insights", async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { userId: req.userId },
      orderBy: { date: "desc" },
      take: 50,
    });

    if (expenses.length === 0) {
      return res.json({ insight: "Add some expenses first to get AI insights!" });
    }

    const summary = {};
    expenses.forEach((e) => {
      if (!summary[e.category]) summary[e.category] = 0;
      summary[e.category] += e.amount;
    });

    const total = expenses.reduce((s, e) => s + e.amount, 0);

    const prompt = `I am a college student. Here is my expense summary:
Total spent: ₹${total}
Category breakdown: ${Object.entries(summary).map(([k, v]) => `${k}: ₹${v}`).join(", ")}

Give me 3 specific, practical money-saving tips based on this data. Keep it short and friendly. Use bullet points.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ insight: "AI service unavailable. Please try again later." });
    }

    const insight = data.choices[0].message.content;
    res.json({ insight });
  } catch (err) {
    console.error(err);
    res.status(500).json({ insight: "Something went wrong." });
  }
});

module.exports = router;