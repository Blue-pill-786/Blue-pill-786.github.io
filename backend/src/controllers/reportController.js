/**
 * Phase 3 - Custom Report Controller
 * Advanced reporting with templates, scheduling, and export functionality
 */

import reportService from '../services/reportService.js';
import { catchAsync } from '../utils/catchAsync.js';

/* ================= CUSTOM REPORTS (PHASE 3) ================= */

/**
 * @route   POST /api/reports
 * @desc    Create a new custom report
 * @access  Private
 */
const createReport = catchAsync(async (req, res) => {
  const { organizationId } = req.user;
  const { name, type, template, dataSource, formatting, schedule, notifications } = req.body;

  if (!name || !type) {
    return res.status(400).json({
      success: false,
      message: 'Name and type are required',
    });
  }

  const result = await reportService.createReport(organizationId, req.user._id, {
    name,
    type,
    template,
    dataSource: dataSource || {},
    formatting: formatting || {},
    schedule: schedule || { isScheduled: false },
    notifications: notifications || { enabled: false },
  });

  res.status(201).json(result);
});

/**
 * @route   GET /api/reports
 * @desc    Get all organization reports
 * @access  Private
 */
const getReports = catchAsync(async (req, res) => {
  const { organizationId } = req.user;
  const { status, type, search, limit, skip } = req.query;

  const result = await reportService.getReports(organizationId, {
    status,
    type,
    search,
    limit: parseInt(limit) || 20,
    skip: parseInt(skip) || 0,
  });

  res.json(result);
});

/**
 * @route   GET /api/reports/:id
 * @desc    Get single report details
 * @access  Private
 */
const getReport = catchAsync(async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;

  const result = await reportService.getReport(id, organizationId);

  res.json(result);
});

/**
 * @route   POST /api/reports/:id/generate
 * @desc    Generate/regenerate report data
 * @access  Private
 */
const generateReport = catchAsync(async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;

  const result = await reportService.generateReport(id, organizationId);

  res.json(result);
});

/**
 * @route   PUT /api/reports/:id
 * @desc    Update report configuration
 * @access  Private
 */
const updateReport = catchAsync(async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;
  const updates = req.body;

  const result = await reportService.updateReport(id, organizationId, updates);

  res.json(result);
});

/**
 * @route   POST /api/reports/:id/clone
 * @desc    Clone an existing report
 * @access  Private
 */
const cloneReport = catchAsync(async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;
  const { name } = req.body;

  const result = await reportService.cloneReport(id, organizationId, req.user._id, name);

  res.status(201).json(result);
});

/**
 * @route   DELETE /api/reports/:id
 * @desc    Delete report (soft delete)
 * @access  Private
 */
const deleteReport = catchAsync(async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;

  const result = await reportService.deleteReport(id, organizationId);

  res.json(result);
});

/**
 * @route   GET /api/reports/:id/export
 * @desc    Export report in specified format
 * @access  Private
 */
const exportReport = catchAsync(async (req, res) => {
  const { organizationId } = req.user;
  const { id } = req.params;
  const { format = 'pdf' } = req.query;

  const result = await reportService.exportReport(id, organizationId, format);

  res.json(result);
});

/**
 * @route   GET /api/reports/templates/available
 * @desc    Get available report templates
 * @access  Private
 */
const getTemplates = catchAsync(async (req, res) => {
  const result = reportService.getTemplates();

  res.json(result);
});

/**
 * @route   GET /api/reports/stats/organization
 * @desc    Get report statistics for organization
 * @access  Private
 */
const getReportStats = catchAsync(async (req, res) => {
  const { organizationId } = req.user;

  const result = await reportService.getReportStats(organizationId);

  res.json(result);
});

export default {
  // Phase 3 Custom Reports
  createReport,
  getReports,
  getReport,
  generateReport,
  updateReport,
  cloneReport,
  deleteReport,
  exportReport,
  getTemplates,
  getReportStats,
};
