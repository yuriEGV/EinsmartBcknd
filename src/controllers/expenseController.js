import Expense from '../models/expenseModel.js';

// Get all expenses
export const getExpenses = async (req, res) => {
    try {
        const { category, startDate, endDate } = req.query;
        const query = { tenantId: req.user.tenantId };

        if (category) query.category = category;
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const expenses = await Expense.find(query).sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new expense
export const createExpense = async (req, res) => {
    try {
        const expense = new Expense({
            ...req.body,
            tenantId: req.user.tenantId,
            createdBy: req.user._id
        });
        const savedExpense = await expense.save();
        res.status(201).json(savedExpense);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update an expense
export const updateExpense = async (req, res) => {
    try {
        const expense = await Expense.findOneAndUpdate(
            { _id: req.params.id, tenantId: req.user.tenantId },
            req.body,
            { new: true }
        );
        if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });
        res.json(expense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete an expense
export const deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!expense) return res.status(404).json({ message: 'Gasto no encontrado' });
        res.json({ message: 'Gasto eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Expense Statistics
export const getExpenseStats = async (req, res) => {
    try {
        const stats = await Expense.aggregate([
            { $match: { tenantId: req.user.tenantId } },
            {
                $group: {
                    _id: '$category',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
