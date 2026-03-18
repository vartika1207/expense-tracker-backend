// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenses");
const budgetRoutes = require("./routes/budgets");

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/budgets", budgetRoutes);

// Health check
app.get("/", (req, res) => res.json({ message: "Expense Tracker API running!" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
