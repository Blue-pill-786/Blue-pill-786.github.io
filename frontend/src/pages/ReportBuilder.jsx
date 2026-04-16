import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const ReportBuilder = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'revenue',
    frequency: 'monthly',
    metrics: ['total_revenue'],
    filters: {
      dateRange: 'month',
      properties: []
    },
    chartType: 'bar'
  });

  const [availableProperties, setAvailableProperties] = useState([]);
  const [previewData, setPreviewData] = useState(null);

  // Load properties on component mount
  useState(() => {
    const loadProperties = async () => {
      try {
        const response = await api.get('/api/admin/properties');
        setAvailableProperties(response.data.data || []);
      } catch (err) {
        console.error('Failed to load properties:', err);
      }
    };
    loadProperties();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleMetricsChange = (metric) => {
    setFormData(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metric)
        ? prev.metrics.filter(m => m !== metric)
        : [...prev.metrics, metric]
    }));
  };

  const handlePropertyChange = (propertyId) => {
    setFormData(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        properties: prev.filters.properties.includes(propertyId)
          ? prev.filters.properties.filter(p => p !== propertyId)
          : [...prev.filters.properties, propertyId]
      }
    }));
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/reports/preview', formData);
      setPreviewData(response.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to preview report');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Report title is required');
      return;
    }

    if (formData.metrics.length === 0) {
      setError('Please select at least one metric');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/reports', formData);
      alert(`Report "${formData.title}" created successfully!`);
      navigate('/reports');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  const metricOptions = {
    revenue: [
      { value: 'total_revenue', label: 'Total Revenue' },
      { value: 'average_rent', label: 'Average Rent' },
      { value: 'late_payments', label: 'Late Payments' }
    ],
    occupancy: [
      { value: 'occupancy_rate', label: 'Occupancy Rate' },
      { value: 'vacant_rooms', label: 'Vacant Rooms' },
      { value: 'avg_stay_duration', label: 'Average Stay Duration' }
    ],
    maintenance: [
      { value: 'maintenance_cost', label: 'Maintenance Cost' },
      { value: 'open_tickets', label: 'Open Tickets' },
      { value: 'avg_resolution_time', label: 'Avg Resolution Time' }
    ]
  };

  const currentMetrics = metricOptions[formData.type] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-10">
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-cyan-400 mb-2">Report Builder</h1>
          <p className="text-slate-400">Create custom reports to analyze your business metrics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* FORM SECTION */}
          <div className="bg-slate-900/80 border border-slate-700 rounded-lg shadow-float p-8 backdrop-blur-xl">
            
            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-6">

              {/* Title & Description */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Report Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Monthly Revenue Report"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Add optional details about this report"
                  rows="2"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Report Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="revenue">Revenue Analysis</option>
                  <option value="occupancy">Occupancy Report</option>
                  <option value="maintenance">Maintenance Report</option>
                </select>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Frequency</label>
                <select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {/* Chart Type */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">Chart Type</label>
                <select
                  name="chartType"
                  value={formData.chartType}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="pie">Pie Chart</option>
                  <option value="area">Area Chart</option>
                </select>
              </div>

              {/* Metrics */}
              <div>
                <label className="block text-sm font-medium mb-3 text-slate-300">Metrics *</label>
                <div className="space-y-2">
                  {currentMetrics.map(metric => (
                    <label key={metric.value} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.metrics.includes(metric.value)}
                        onChange={() => handleMetricsChange(metric.value)}
                        className="w-4 h-4 accent-cyan-500"
                      />
                      <span className="text-slate-300">{metric.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Properties Filter */}
              <div>
                <label className="block text-sm font-medium mb-3 text-slate-300">Filter by Properties</label>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {availableProperties.length > 0 ? (
                    availableProperties.map(property => (
                      <label key={property._id} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.filters.properties.includes(property._id)}
                          onChange={() => handlePropertyChange(property._id)}
                          className="w-4 h-4 accent-cyan-500"
                        />
                        <span className="text-slate-300">{property.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">No properties available</p>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="gap-3 flex pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={loading}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg px-4 py-2 font-medium transition disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Preview'}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-medium rounded-lg px-4 py-2 transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Report'}
                </button>
              </div>

            </form>
          </div>

          {/* PREVIEW SECTION */}
          <div className="bg-slate-900/80 border border-slate-700 rounded-lg shadow-float p-8 backdrop-blur-xl">
            {previewData ? (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-cyan-400">Preview</h2>
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  {previewData.stats && Object.entries(previewData.stats).map(([key, value]) => (
                    <div key={key} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <p className="text-slate-400 text-sm capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-2xl font-bold text-cyan-300 mt-2">
                        {typeof value === 'number' && value > 1000 
                          ? (value / 1000).toFixed(1) + 'K'
                          : value
                        }
                      </p>
                    </div>
                  ))}
                </div>

                {/* Trends */}
                {previewData.trends && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Trend Data</h3>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 max-h-40 overflow-y-auto">
                      <pre className="text-slate-400 text-xs font-mono whitespace-pre-wrap break-words">
                        {JSON.stringify(previewData.trends.slice(0, 3), null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-sm text-cyan-200">
                  ✓ Preview data loaded successfully. Click "Create Report" to save.
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <p className="text-lg font-medium mb-2">No Preview Yet</p>
                  <p className="text-sm">Click "Preview" to see sample data with your current settings</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
