// routes/budgets.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/budgets — sab budgets + current month spending
router.get("/", async (req, res) => {
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId },
    });

    // Is mahine ki expenses lo
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyExpenses = await prisma.expense.findMany({
      where: {
        userId: req.userId,
        date: { gte: startOfMonth },
      },
    });

    // Category-wise spending calculate karo
    const spending = {};
    monthlyExpenses.forEach((e) => {
      if (!spending[e.category]) spending[e.category] = 0;
      spending[e.category] += e.amount;
    });

    // Budget ke saath merge karo
    const result = budgets.map((b) => ({
      ...b,
      spent: spending[b.category] || 0,
      remaining: b.monthLimit - (spending[b.category] || 0),
      isOver: (spending[b.category] || 0) > b.monthLimit,
    }));

    res.json({ budgets: result });
  } catch (err) {
    res.status(500).json({ error: "Budgets nahi mile." });
  }
});

// POST /api/budgets — budget set karo
router.post("/", async (req, res) => {
  const { category, monthLimit } = req.body;

  if (!category || !monthLimit) {
    return res.status(400).json({ error: "Category aur limit dono chahiye." });
  }

  try {
    // Upsert — agar pehle se hai toh update, warna create
    const budget = await prisma.budget.upsert({
      where: {
        userId_category: { userId: req.userId, category },
      },
      update: { monthLimit: parseFloat(monthLimit) },
      create: {
        category,
        monthLimit: parseFloat(monthLimit),
        userId: req.userId,
      },
    });

    res.json({ message: "Budget set ho gaya!", budget });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Budget set nahi ho saka." });
  }
});

// DELETE /api/budgets/:id
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.budget.findFirst({
      where: { id: parseInt(req.params.id), userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Budget nahi mila." });

    await prisma.budget.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: "Budget delete ho gaya!" });
  } catch (err) {
    res.status(500).json({ error: "Delete nahi ho saka." });
  }
});

module.exports = router;
