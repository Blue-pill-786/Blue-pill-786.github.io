import PropTypes from 'prop-types';

const ComplaintForm = ({ complaint, onComplaintChange, onSubmit, isLoading }) => {
  const handleTitleChange = (e) => {
    onComplaintChange((prev) => ({ ...prev, title: e.target.value }));
  };

  const handleDescriptionChange = (e) => {
    onComplaintChange((prev) => ({ ...prev, description: e.target.value }));
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-purple-500/15 bg-gradient-to-br from-purple-900/20 to-slate-900/50 p-6 backdrop-blur-sm"
    >
      <h2 className="text-2xl font-bold text-purple-200 mb-5">📝 Raise a Complaint</h2>
      <p className="text-sm text-slate-400 mb-6">Report any issues to the management team</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Issue Title *
          </label>
          <input
            type="text"
            placeholder="e.g., Water leakage, Noise complaint, etc."
            value={complaint.title}
            onChange={handleTitleChange}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Description *
          </label>
          <textarea
            placeholder="Describe the issue in detail..."
            rows="4"
            value={complaint.description}
            onChange={handleDescriptionChange}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-lg transition shadow-lg hover:shadow-purple-500/25 disabled:shadow-none disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {isLoading ? '📤 Submitting...' : '📤 Submit Complaint'}
        </button>
      </div>
    </form>
  );
};

ComplaintForm.propTypes = {
  complaint: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
  onComplaintChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

ComplaintForm.defaultProps = {
  isLoading: false,
};

export default ComplaintForm;
