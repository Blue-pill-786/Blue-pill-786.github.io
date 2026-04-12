import * as dashboardService from '../services/dashboardService.js';
import { catchAsync } from '../utils/catchAsync.js';

/* ================= DASHBOARD ================= */

export const getDashboard = catchAsync(async (req, res) => {

  if (!req.user?._id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }

  console.log(`📊 [${req.user.role}] Fetching dashboard`);

  const data = await dashboardService.getDashboardData(req.user);

  res.json({
    success: true,
    data
  });

});