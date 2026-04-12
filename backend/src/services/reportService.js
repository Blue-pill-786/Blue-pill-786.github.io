import dayjs from 'dayjs';
import { Invoice } from '../models/Invoice.js';
import { Expense } from '../models/Expense.js';

export const getMonthlyReport = async (targetMonth) => {
  const month = targetMonth.format('YYYY-MM');
  const start = targetMonth.startOf('month').toDate();
  const end = targetMonth.endOf('month').toDate();

  /* ================= INCOME ================= */

  const invoices = await Invoice.find({ billingMonth: month });

  const income = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  /* ================= EXPENSES ================= */

  const expenses = await Expense.find({
    expenseDate: { $gte: start, $lte: end }
  });

  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + exp.amount,
    0
  );

  /* ================= NET ================= */

  return {
    month: dayjs().format('YYYY-MM'),
    income,
    expenses: totalExpenses,
    net: income - totalExpenses,
    totalInvoices: invoices.length,
    paidInvoices: invoices.filter(i => i.status === 'paid').length
  };
};