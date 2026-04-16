# Reports Feature Implementation

## Overview
The Reports feature enables admins to create, manage, and view comprehensive business analytics reports with customizable metrics, time periods, and visualization options.

## Architecture

### Backend Components

#### 1. **Report Model** (`backend/src/models/Report.js`)
- Stores report configurations and metadata
- Schema includes: title, description, type, frequency, metrics, filters, chartType
- Tracks report creation and generation history

#### 2. **Report Service** (`backend/src/services/reportService.js`)
- Core business logic for report generation
- Methods:
  - `generateReport()`: Creates report with actual data
  - `previewReport()`: Shows sample data for builder
  - `exportReport()`: Generates CSV export
  - `calculateStats()`: Computes aggregate metrics

#### 3. **Report Controller** (`backend/src/controllers/reportController.js`)
- API endpoints:
  - `POST /api/reports` - Create new report
  - `GET /api/reports` - List all reports
  - `GET /api/reports/:id` - Get specific report
  - `DELETE /api/reports/:id` - Delete report
  - `POST /api/reports/preview` - Preview report data
  - `GET /api/reports/:id/export` - Export as CSV

#### 4. **Report Routes** (`backend/src/routes/reports.js`)
- RESTful route definitions
- Protected with admin/manager roles

### Frontend Components

#### 1. **ReportBuilder** (`frontend/src/pages/ReportBuilder.jsx`)
- Interactive report configuration form
- Features:
  - Title and description input
  - Report type selection (revenue, occupancy, maintenance)
  - Metric selection with checkboxes
  - Property filtering
  - Chart type selection
  - Real-time preview
- Live preview updates as configuration changes

#### 2. **ReportList** (`frontend/src/pages/ReportList.jsx`)
- Displays all created reports in grid layout
- Features:
  - Report cards with metadata display
  - View, Export, Delete actions
  - Last generation timestamp
  - Creation date
  - Quick stats (metrics count, report type)

#### 3. **ReportView** (`frontend/src/pages/ReportView.jsx`)
- Detailed report display
- Features:
  - Dynamic chart rendering (Bar, Line, Pie, Area)
  - Statistics cards with KPIs
  - Data table with detailed metrics
  - Trend indicators (↑/↓)
  - CSV export functionality
  - Responsive design

#### 4. **Layout Updates** (`frontend/src/components/Layout.jsx`)
- Added "Reports" navigation link to admin section
- Links to `/reports` route

### API Endpoints

```
POST   /api/reports                 - Create new report
GET    /api/reports                 - List all reports
GET    /api/reports/:id             - Get report details
DELETE /api/reports/:id             - Delete report
POST   /api/reports/preview         - Preview report data
GET    /api/reports/:id/export      - Export report as CSV
```

## Report Types

### 1. Revenue Analysis
**Metrics:**
- Total Revenue
- Average Rent
- Late Payments

**Use Case:** Track income streams and payment issues

### 2. Occupancy Report
**Metrics:**
- Occupancy Rate (%)
- Vacant Rooms
- Average Stay Duration

**Use Case:** Monitor property utilization

### 3. Maintenance Report
**Metrics:**
- Maintenance Costs
- Open Tickets
- Avg Resolution Time

**Use Case:** Track maintenance operations efficiency

## Data Visualization

### Chart Types
1. **Bar Chart** - Categorical comparisons
2. **Line Chart** - Trend analysis over time
3. **Pie Chart** - Distribution and composition
4. **Area Chart** - Cumulative trends

### Dynamic Data Generation
- Respects selected filters (date range, properties)
- Calculates aggregates from actual data
- Includes trend indicators (% change from previous period)

## Filtering & Customization

### Available Filters
- **Date Range**: day, week, month, quarter, year
- **Properties**: Multi-select property filtering
- **Metrics**: Dynamic based on report type

### Frequency Options
- Daily
- Weekly
- Monthly (default)
- Quarterly
- Yearly

## Export Functionality

### CSV Export Features
- Report title and generation date in headers
- Column headers matching metric names
- Formatted numeric data
- Downloadable via browser

### Export Format
```csv
Report: Monthly Revenue Report
Generated: 2024-01-15
Date,Total_Revenue,Average_Rent,Late_Payments
2024-01,125000,5000,8
2024-02,128000,5100,6
```

## Data Flow

1. **Report Creation**
   ```
   User fills form → Form validation → API POST /api/reports
   → ReportService generates data → Report saved to DB
   ```

2. **Report Preview**
   ```
   User clicks preview → API POST /api/reports/preview
   → Service calculates sample data → Returns stats & trends
   → Chart preview updates in real-time
   ```

3. **Report View**
   ```
   User clicks report → API GET /api/reports/:id
   → Service retrieves report & data → Chart renders
   → User can export or delete
   ```

## Frontend Routes

```javascript
/reports              - List all reports (admin only)
/reports/builder      - Create new report (admin only)
/reports/:reportId    - View specific report (admin only)
```

## Database Integration

### Report Collection Structure
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  organizationId: ObjectId,
  createdBy: ObjectId,
  type: String,                    // 'revenue', 'occupancy', 'maintenance'
  frequency: String,               // 'monthly', 'weekly', etc.
  metrics: [String],               // ['total_revenue', 'average_rent']
  filters: {
    dateRange: String,
    properties: [ObjectId]
  },
  chartType: String,               // 'bar', 'line', 'pie', 'area'
  data: {
    stats: Object,                 // Aggregate metrics
    chartData: [Object],           // For chart rendering
    tableData: [Object]            // Detailed breakdown
  },
  lastGeneratedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Access Control

### Role-Based Permissions
- **Admin**: Full report access (create, view, delete, export)
- **Manager**: View and export reports only
- **Staff**: View reports only
- **Tenant**: No report access

### Tenant Isolation
- Reports scoped to organization
- Users only see reports for their organization
- Middleware enforces tenant isolation

## Performance Optimization

1. **Caching**
   - Cache report data after generation
   - Invalidate on report update

2. **Pagination**
   - Reports list paginated (default 20 per page)
   - Large datasets handled with streaming exports

3. **Indexing**
   - Index on organizationId for faster queries
   - Index on createdAt for sorting

## Error Handling

### Validation
- Title required
- At least one metric must be selected
- Valid date range required
- Properties list optional but validated

### Error Responses
```javascript
{
  success: false,
  message: "Error message",
  error: "error_code"
}
```

### Common Errors
- 400: Invalid report configuration
- 401: Unauthorized access
- 404: Report not found
- 500: Server error

## Testing

### Test Scenarios
1. Create report with valid metrics ✓
2. Preview report before generating ✓
3. Export report as CSV ✓
4. Delete report ✓
5. Filter reports by type ✓
6. Access control enforcement ✓

## Future Enhancements

1. **Scheduled Reports**
   - Automatic generation at specified intervals
   - Email delivery

2. **Report Templates**
   - Pre-built templates for common reports
   - Save custom templates

3. **Advanced Filtering**
   - Multi-date range comparisons
   - Custom metric calculations
   - Benchmark comparisons

4. **Real-time Updates**
   - WebSocket-based live data updates
   - Live dashboard embedding

5. **Report Sharing**
   - Generate shareable links
   - Read-only access control

## Security Considerations

1. **Authentication**
   - JWT token validation on all endpoints
   - Session timeout enforcement

2. **Authorization**
   - Role-based access control
   - Organization tenant isolation

3. **Data Protection**
   - Sensitive data masked in exports
   - Audit logging for report access

4. **Rate Limiting**
   - Prevent report generation abuse
   - Handle large exports gracefully

## Integration Points

### Database Models Used
- Property (for filtering)
- Invoice (for revenue metrics)
- Tenant (for occupancy metrics)
- Expense (for maintenance costs)

### Middleware Applied
- Authentication middleware
- Tenant isolation middleware
- Error handling middleware

## Deployment Notes

1. Ensure `backend/src/models/Report.js` is created
2. Ensure `backend/src/services/reportService.js` has data generation logic
3. Ensure `backend/src/controllers/reportController.js` mounted to server
4. Ensure routes mounted in `backend/src/server.js`
5. Frontend components must import Recharts for charts
6. Ensure API endpoints are correctly configured in frontend

## Configuration

### Environment Variables
```
NODE_ENV=production
REPORTS_ENABLED=true
REPORT_EXPORT_MAX_ROWS=10000
```

### Frontend Configuration
- Chart colors: Cyan (#06b6d4) and related shades
- Date format: YYYY-MM-DD
- Number format: 2 decimal places
- CSV encoding: UTF-8

---

**Last Updated:** 2024
**Version:** 1.0
**Status:** Fully Implemented ✓
