const ErrorState = ({ message = 'An error occurred' }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
    <div className="max-w-6xl mx-auto text-center text-red-400 py-20">
      <div className="text-5xl mb-4">⚠️</div>
      <p className="text-lg font-semibold">{message}</p>
    </div>
  </div>
);

export default ErrorState;
