import Report from '../models/Report.js';
import { Invoice } from '../models/Invoice.js';
import { Expense } from '../models/Expense.js';
import { Tenant } from '../models/Tenant.js';
import { Property } from '../models/Property.js';

// Report Templates with default configurations
const REPORT_TEMPLATES = {
  occupancy: {
    name: 'Occupancy Report',
    description: 'Track property occupancy rates and trends',
    dataSource: 'properties',
    metrics: ['count', 'percentage', 'trend'],
    chartType: 'line',
    groupBy: 'month',
  },
  revenue: {
    name: 'Revenue Report',
    description: 'Monthly revenue analysis and trends',
    dataSource: 'invoices',
    metrics: ['total', 'average', 'trend'],
    chartType: 'bar',
    groupBy: 'month',
  },
  expense: {
    name: 'Expense Report',
    description: 'Track expenses by category',
    dataSource: 'expenses',
    metrics: ['total', 'average', 'percentage'],
    chartType: 'pie',
    groupBy: 'category',
  },
  tenant: {
    name: 'Tenant Report',
    description: 'Tenant demographics and status',
    dataSource: 'tenants',
    metrics: ['count', 'percentage'],
    chartType: 'bar',
    groupBy: 'status',
  },
  maintenance: {
    name: 'Maintenance Report',
    description: 'Maintenance request tracking',
    dataSource: 'maintenance',
    metrics: ['count', 'average', 'percentage'],
    chartType: 'line',
    groupBy: 'month',
  },
  financial: {
    name: 'Financial Summary',
    description: 'Complete financial overview',
    dataSource: 'all',
    metrics: ['total', 'trend', 'comparison'],
    chartType: 'area',
    groupBy: 'month',
  },
};

class ReportService {
  // Create new report
  async createReport(organizationId, userId, reportData) {
    try {
      const report = new Report({
        organizationId,
        createdBy: userId,
        ...reportData,
      });

      // If template specified, apply defaults
      if (reportData.template && REPORT_TEMPLATES[reportData.template]) {
        const template = REPORT_TEMPLATES[reportData.template];
        report.formatting = { ...template, ...report.formatting };
      }

      // Schedule first run if scheduled
      if (report.schedule.isScheduled) {
        report.scheduleNextRun();
      }

      await report.save();
      return {
        success: true,
        data: report,
        message: 'Report created successfully',
      };
    } catch (error) {
      throw new Error(`Failed to create report: ${error.message}`);
    }
  }

  // Get organization reports
  async getReports(organizationId, filters = {}) {
    try {
      const query = { organizationId, deletedAt: null };

      if (filters.status) query.status = filters.status;
      if (filters.type) query.type = filters.type;
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const limit = filters.limit || 20;
      const skip = filters.skip || 0;

      const reports = await Report.find(query)
        .select('-lastGenerated.data')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await Report.countDocuments(query);

      return {
        success: true,
        data: reports,
        meta: { total, limit, skip },
      };
    } catch (error) {
      throw new Error(`Failed to fetch reports: ${error.message}`);
    }
  }

  // Get single report with cached data
  async getReport(reportId, organizationId) {
    try {
      const report = await Report.findOne({
        _id: reportId,
        organizationId,
        deletedAt: null,
      });

      if (!report) {
        throw new Error('Report not found');
      }

      // If cached data is still valid, return it
      if (
        report.lastGenerated &&
        report.lastGenerated.expiresAt &&
        new Date() < report.lastGenerated.expiresAt
      ) {
        return {
          success: true,
          data: report,
          cached: true,
        };
      }

      return {
        success: true,
        data: report,
        cached: false,
      };
    } catch (error) {
      throw new Error(`Failed to fetch report: ${error.message}`);
    }
  }

  // Generate report with actual data
  async generateReport(reportId, organizationId) {
    try {
      const report = await Report.findOne({
        _id: reportId,
        organizationId,
        deletedAt: null,
      });

      if (!report) {
        throw new Error('Report not found');
      }

      const startTime = Date.now();
      const data = await this.fetchReportData(report);
      const duration = Date.now() - startTime;

      // Process data according to template
      const processedData = await this.processReportData(data, report);

      // Cache for 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      report.lastGenerated = {
        data: processedData,
        generatedAt: new Date(),
        expiresAt,
        duration,
      };

      report.schedule.lastRunAt = new Date();
      report.scheduleNextRun();

      await report.save();

      return {
        success: true,
        data: processedData,
        duration,
        generatedAt: report.lastGenerated.generatedAt,
      };
    } catch (error) {
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  // Fetch raw data based on data source
  async fetchReportData(report) {
    const { organizationId, dataSource } = report;
    const { start, end } = dataSource.dateRange || {};
    const dateFilter = start && end ? { createdAt: { $gte: start, $lte: end } } : {};

    const baseFilter = { organizationId, ...dateFilter };

    try {
      switch (dataSource.type) {
        case 'invoices':
          return await Invoice.find({
            ...baseFilter,
            ...(dataSource.status && { status: { $in: dataSource.status } }),
            ...(dataSource.properties.length && { propertyId: { $in: dataSource.properties } }),
          }).lean();

        case 'expenses':
          return await Expense.find({
            ...baseFilter,
            ...(dataSource.tags && { tags: { $in: dataSource.tags } }),
          }).lean();

        case 'tenants':
          return await Tenant.find({
            ...baseFilter,
            ...(dataSource.status && { status: { $in: dataSource.status } }),
            ...(dataSource.properties.length && { propertyId: { $in: dataSource.properties } }),
          }).lean();

        case 'properties':
          return await Property.find({
            ...baseFilter,
            ...(dataSource.properties.length && { _id: { $in: dataSource.properties } }),
          }).lean();

        case 'all':
          return {
            invoices: await Invoice.find(baseFilter).lean(),
            expenses: await Expense.find(baseFilter).lean(),
            tenants: await Tenant.find(baseFilter).lean(),
            properties: await Property.find(baseFilter).lean(),
          };

        default:
          throw new Error('Invalid data source');
      }
    } catch (error) {
      throw new Error(`Failed to fetch report data: ${error.message}`);
    }
  }

  // Process and aggregate report data
  async processReportData(rawData, report) {
    const { formatting, type } = report;
    const processed = {
      summary: {},
      details: [],
      charts: [],
    };

    try {
      const dataArray = Array.isArray(rawData) ? rawData : [];

      // Calculate metrics
      if (formatting.metrics.includes('count')) {
        processed.summary.totalCount = dataArray.length;
      }

      if (formatting.metrics.includes('total')) {
        processed.summary.total = dataArray.reduce((sum, item) => {
          return sum + (item.amount || item.total || 0);
        }, 0);
      }

      if (formatting.metrics.includes('average')) {
        processed.summary.average =
          dataArray.length > 0 ? processed.summary.total / dataArray.length : 0;
      }

      if (formatting.metrics.includes('min')) {
        processed.summary.min = Math.min(
          ...dataArray.map((item) => item.amount || item.total || 0)
        );
      }

      if (formatting.metrics.includes('max')) {
        processed.summary.max = Math.max(
          ...dataArray.map((item) => item.amount || item.total || 0)
        );
      }

      // Group data if specified
      if (formatting.groupBy) {
        processed.details = this.groupData(dataArray, formatting.groupBy);
      } else {
        processed.details = dataArray;
      }

      // Generate chart data if requested
      if (formatting.includeCharts && processed.details.length > 0) {
        processed.charts = this.generateChartData(
          processed.details,
          formatting.chartType,
          formatting.groupBy
        );
      }

      return processed;
    } catch (error) {
      console.error('Error processing report data:', error);
      return processed;
    }
  }

  // Group data by specified field
  groupData(data, groupBy) {
    const grouped = {};

    data.forEach((item) => {
      let key = item[groupBy];

      if (groupBy === 'month' && item.createdAt) {
        const date = new Date(item.createdAt);
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (groupBy === 'week' && item.createdAt) {
        const date = new Date(item.createdAt);
        const weekNum = Math.ceil(date.getDate() / 7);
        key = `${date.getFullYear()}-W${weekNum}`;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return Object.entries(grouped).map(([key, items]) => ({
      groupKey: key,
      items,
      count: items.length,
      total: items.reduce((sum, item) => sum + (item.amount || item.total || 0), 0),
    }));
  }

  // Generate chart data
  generateChartData(groupedData, chartType, groupBy) {
    return {
      type: chartType,
      labels: groupedData.map((group) => group.groupKey),
      datasets: [
        {
          label: 'Count',
          data: groupedData.map((group) => group.count),
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
        },
        {
          label: 'Total',
          data: groupedData.map((group) => group.total),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
        },
      ],
    };
  }

  // Update report
  async updateReport(reportId, organizationId, updates) {
    try {
      const report = await Report.findOneAndUpdate(
        { _id: reportId, organizationId, deletedAt: null },
        {
          ...updates,
          version: updates.version ? updates.version + 1 : undefined,
        },
        { new: true, runValidators: true }
      );

      if (!report) {
        throw new Error('Report not found');
      }

      // Reschedule if schedule changed
      if (updates.schedule) {
        report.scheduleNextRun();
        await report.save();
      }

      return {
        success: true,
        data: report,
        message: 'Report updated successfully',
      };
    } catch (error) {
      throw new Error(`Failed to update report: ${error.message}`);
    }
  }

  // Clone report
  async cloneReport(reportId, organizationId, userId, newName) {
    try {
      const original = await Report.findOne({
        _id: reportId,
        organizationId,
        deletedAt: null,
      });

      if (!original) {
        throw new Error('Report not found');
      }

      const cloned = new Report({
        organizationId,
        createdBy: userId,
        name: newName || `${original.name} (Copy)`,
        type: original.type,
        template: original.template,
        dataSource: { ...original.dataSource },
        formatting: { ...original.formatting },
        schedule: { ...original.schedule, isScheduled: false },
        notifications: { ...original.notifications },
      });

      await cloned.save();

      return {
        success: true,
        data: cloned,
        message: 'Report cloned successfully',
      };
    } catch (error) {
      throw new Error(`Failed to clone report: ${error.message}`);
    }
  }

  // Delete report (soft delete)
  async deleteReport(reportId, organizationId) {
    try {
      const report = await Report.findOneAndUpdate(
        { _id: reportId, organizationId },
        { deletedAt: new Date() },
        { new: true }
      );

      if (!report) {
        throw new Error('Report not found');
      }

      return {
        success: true,
        message: 'Report deleted successfully',
      };
    } catch (error) {
      throw new Error(`Failed to delete report: ${error.message}`);
    }
  }

  // Get available templates
  getTemplates() {
    return {
      success: true,
      data: Object.entries(REPORT_TEMPLATES).map(([key, template]) => ({
        id: key,
        ...template,
      })),
    };
  }

  // Export report as PDF/Excel/CSV
  async exportReport(reportId, organizationId, format = 'pdf') {
    try {
      const report = await Report.findOne({
        _id: reportId,
        organizationId,
        deletedAt: null,
      });

      if (!report) {
        throw new Error('Report not found');
      }

      if (!report.lastGenerated || !report.lastGenerated.data) {
        throw new Error('Report must be generated first');
      }

      // Format export based on type
      const exportData = {
        report: {
          name: report.name,
          type: report.type,
          generatedAt: report.lastGenerated.generatedAt,
          ...report.lastGenerated.data,
        },
      };

      return {
        success: true,
        data: exportData,
        format,
        filename: `${report.name.replace(/\s+/g, '_')}_${Date.now()}.${this.getFileExtension(format)}`,
      };
    } catch (error) {
      throw new Error(`Failed to export report: ${error.message}`);
    }
  }

  getFileExtension(format) {
    const extensions = {
      pdf: 'pdf',
      excel: 'xlsx',
      csv: 'csv',
      html: 'html',
    };
    return extensions[format] || 'txt';
  }

  // Get report statistics
  async getReportStats(organizationId) {
    try {
      const total = await Report.countDocuments({
        organizationId,
        deletedAt: null,
      });

      const byType = await Report.aggregate([
        {
          $match: { organizationId, deletedAt: null },
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]);

      const scheduled = await Report.countDocuments({
        organizationId,
        'schedule.isScheduled': true,
        deletedAt: null,
      });

      return {
        success: true,
        data: {
          total,
          byType: Object.fromEntries(byType.map((item) => [item._id, item.count])),
          scheduled,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get report statistics: ${error.message}`);
    }
  }
}

export default new ReportService();