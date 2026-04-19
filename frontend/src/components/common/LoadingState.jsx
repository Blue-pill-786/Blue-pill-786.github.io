const LoadingState = ({ message = 'Loading...' }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4">
    <div className="max-w-6xl mx-auto text-center text-slate-400 py-20">
      <div className="animate-spin inline-block text-4xl">⚙️</div>
      <p className="mt-4 text-lg">{message}</p>
    </div>
  </div>
);

export default LoadingState;
