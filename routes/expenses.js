// routes/expenses.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Sabhi routes protected hain — login zaroori hai
router.use(authMiddleware);

// GET /api/expenses — sab expenses lo (filter + search bhi)
router.get("/", async (req, res) => {
  const { category, startDate, endDate, search } = req.query;

  const filters = {
    userId: req.userId,
    ...(category && { category }),
    ...(startDate || endDate
      ? {
          date: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
          },
        }
      : {}),
    ...(search && {
      title: { contains: search, mode: "insensitive" },
    }),
  };

  try {
    const expenses = await prisma.expense.findMany({
      where: filters,
      orderBy: { date: "desc" },
    });

    // Total calculate karo
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({ expenses, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Expenses nahi mil sake." });
  }
});

// GET /api/expenses/summary — category-wise summary
router.get("/summary", async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { userId: req.userId },
    });

    const summary = {};
    expenses.forEach((e) => {
      if (!summary[e.category]) summary[e.category] = 0;
      summary[e.category] += e.amount;
    });

    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: "Summary nahi ban saki." });
  }
});

// POST /api/expenses — naya expense add karo
router.post("/", async (req, res) => {
  const { title, amount, category, description, date } = req.body;

  if (!title || !amount || !category) {
    return res.status(400).json({ error: "Title, amount aur category zaroori hai." });
  }

  try {
    const expense = await prisma.expense.create({
      data: {
        title,
        amount: parseFloat(amount),
        category,
        description: description || "",
        date: date ? new Date(date) : new Date(),
        userId: req.userId,
      },
    });

    res.status(201).json({ message: "Expense add ho gaya!", expense });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Expense add nahi ho saka." });
  }
});

// PUT /api/expenses/:id — expense update karo
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, amount, category, description, date } = req.body;

  try {
    // Check karo ki yeh expense usi user ka hai
    const existing = await prisma.expense.findFirst({
      where: { id: parseInt(id), userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Expense nahi mila." });
    }

    const updated = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(category && { category }),
        ...(description !== undefined && { description }),
        ...(date && { date: new Date(date) }),
      },
    });

    res.json({ message: "Expense update ho gaya!", expense: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update nahi ho saka." });
  }
});

// DELETE /api/expenses/:id — expense delete karo
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.expense.findFirst({
      where: { id: parseInt(id), userId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Expense nahi mila." });
    }

    await prisma.expense.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Expense delete ho gaya!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete nahi ho saka." });
  }
});

module.exports = router;
