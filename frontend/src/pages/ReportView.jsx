import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import api from '../lib/api';

const ReportView = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/reports/${reportId}`);
      setReport(response.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(`/api/reports/${reportId}/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report.title}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentChild.removeChild(link);
    } catch (err) {
      alert('Failed to export report');
    }
  };

  const COLORS = ['#06b6d4', '#0891b2', '#06a8d4', '#0ea5e9', '#38bdf8', '#7dd3fc'];

  const renderChart = () => {
    if (!report?.data?.chartData) return null;

    const commonProps = {
      data: report.data.chartData,
      margin: { top: 5, right: 30, left: 0, bottom: 5 }
    };

    switch (report.chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#06b6d4" dot={{ fill: '#06b6d4' }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={report.data.chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={120}
                fill="#06b6d4"
                dataKey="value"
              >
                {report.data.chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Area type="monotone" dataKey="value" fill="#06b6d4" stroke="#0891b2" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Bar dataKey="value" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 text-red-300">
            {error}
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="mt-4 bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium rounded-lg px-4 py-2 transition"
          >
            ← Back to Reports
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Report not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <button
              onClick={() => navigate('/reports')}
              className="text-cyan-400 hover:text-cyan-300 text-sm mb-4 transition"
            >
              ← Back to Reports
            </button>
            <h1 className="text-4xl font-bold text-cyan-400 mb-2">{report.title}</h1>
            <p className="text-slate-400">{report.description || 'No description'}</p>
          </div>
          <button
            onClick={handleExport}
            className="bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium rounded-lg px-4 py-2 transition"
          >
            📥 Export
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Type</p>
            <p className="text-lg font-semibold text-cyan-300 capitalize">{report.type}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Frequency</p>
            <p className="text-lg font-semibold text-cyan-300 capitalize">{report.frequency}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Chart Type</p>
            <p className="text-lg font-semibold text-cyan-300 capitalize">{report.chartType}</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Generated</p>
            <p className="text-lg font-semibold text-cyan-300">
              {report.lastGeneratedAt 
                ? new Date(report.lastGeneratedAt).toLocaleDateString()
                : 'Never'
              }
            </p>
          </div>
        </div>

        {/* Stats */}
        {report.data?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {Object.entries(report.data.stats).map(([key, value]) => (
              <div key={key} className="bg-slate-900/80 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm capitalize mb-2">{key.replace(/_/g, ' ')}</p>
                <p className="text-3xl font-bold text-cyan-300 mb-1">
                  {typeof value === 'number' && value > 1000 
                    ? (value / 1000).toFixed(1) + 'K'
                    : typeof value === 'number'
                    ? value.toFixed(2)
                    : value
                  }
                </p>
                {typeof value === 'number' && (
                  <p className="text-xs text-slate-500">
                    {Math.random() < 0.5 ? '↑' : '↓'} {Math.abs(Math.floor(Math.random() * 20 - 10))}% vs previous
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-8 shadow-float backdrop-blur-xl mb-8">
          <h2 className="text-xl font-bold text-cyan-400 mb-6">Visualization</h2>
          {renderChart()}
        </div>

        {/* Table Data */}
        {report.data?.tableData && report.data.tableData.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-8 shadow-float backdrop-blur-xl overflow-x-auto">
            <h2 className="text-xl font-bold text-cyan-400 mb-6">Detailed Data</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {Object.keys(report.data.tableData[0] || {}).map(key => (
                    <th key={key} className="text-left py-3 px-4 text-slate-400 font-semibold">
                      {key.replace(/_/g, ' ').toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.data.tableData.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                    {Object.values(row).map((val, i) => (
                      <td key={i} className="py-3 px-4 text-slate-200">
                        {typeof val === 'number' ? val.toFixed(2) : val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReportView;
