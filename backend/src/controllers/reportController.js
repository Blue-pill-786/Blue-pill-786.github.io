import dayjs from 'dayjs';
import * as reportService from '../services/reportService.js';
import { catchAsync } from '../utils/catchAsync.js';

/* ================= MONTHLY REPORT ================= */

export const getMonthlyReport = catchAsync(async (req, res) => {

  // ✅ Accept custom month: ?month=2026-04
  const { month } = req.query;

  let targetMonth;

  if (month) {
    const parsed = dayjs(month, 'YYYY-MM', true);

    if (!parsed.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Invalid month format. Use YYYY-MM"
      });
    }

    targetMonth = parsed;
  } else {
    targetMonth = dayjs();
  }

  console.log("📊 Generating report for:", targetMonth.format('YYYY-MM'));

  const report = await reportService.getMonthlyReport(targetMonth);

  res.json({
    success: true,
    data: report
  });

});