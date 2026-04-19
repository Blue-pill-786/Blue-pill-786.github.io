import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const ReportList = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/reports');
      setReports(response.data.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reportId) => {
    try {
      await api.delete(`/api/reports/${reportId}`);
      setReports(reports.filter(r => r._id !== reportId));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete report');
    }
  };

  const handleExport = async (reportId) => {
    try {
      const response = await api.get(`/api/reports/${reportId}/export`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${reportId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentChild.removeChild(link);
    } catch (err) {
      alert('Failed to export report');
    }
  };

  const handleViewReport = (reportId) => {
    navigate(`/reports/${reportId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-cyan-400 mb-2">Reports</h1>
            <p className="text-slate-400">Manage and view all your generated reports</p>
          </div>
          <button
            onClick={() => navigate('/reports/builder')}
            className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-medium rounded-lg px-6 py-3 transition"
          >
            + New Report
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {reports.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-12 text-center backdrop-blur-xl">
            <p className="text-slate-400 mb-4">No reports created yet</p>
            <button
              onClick={() => navigate('/reports/builder')}
              className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-medium rounded-lg px-4 py-2 transition"
            >
              Create Your First Report
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map(report => (
              <div
                key={report._id}
                className="bg-slate-900/80 border border-slate-700 rounded-lg p-6 shadow-float backdrop-blur-xl hover:border-slate-600 transition"
              >
                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-cyan-300 mb-1">{report.title}</h3>
                  <p className="text-slate-400 text-sm">{report.description || 'No description'}</p>
                </div>

                {/* Meta Info */}
                <div className="space-y-2 mb-4 text-sm text-slate-400">
                  <p>📊 Type: <span className="text-slate-300 capitalize">{report.type}</span></p>
                  <p>📅 Frequency: <span className="text-slate-300 capitalize">{report.frequency}</span></p>
                  <p>📈 Chart: <span className="text-slate-300 capitalize">{report.chartType}</span></p>
                  <p>🔢 Metrics: <span className="text-slate-300">{report.metrics.length}</span></p>
                  <p>📆 Created: <span className="text-slate-300">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span></p>
                </div>

                {/* Last Generated */}
                {report.lastGeneratedAt && (
                  <div className="mb-4 p-2 bg-slate-800/50 rounded text-xs text-slate-400">
                    Last generated: {new Date(report.lastGeneratedAt).toLocaleString()}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewReport(report._id)}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-medium rounded-lg px-3 py-2 text-sm transition"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleExport(report._id)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium rounded-lg px-3 py-2 text-sm transition"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(report._id)}
                    className="flex-1 bg-red-900/50 hover:bg-red-900 text-red-300 font-medium rounded-lg px-3 py-2 text-sm transition"
                  >
                    Delete
                  </button>
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === report._id && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                    <p className="text-red-300 text-sm mb-2">Confirm deletion?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(report._id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-1 rounded transition"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm py-1 rounded transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportList;
