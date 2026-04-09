import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const TenantDashboard = () => {
  const [data, setData] = useState(null);
  const [complaint, setComplaint] = useState({ title: '', description: '' });

  useEffect(() => {
    api.get('/tenant/dashboard').then((res) => setData(res.data));
  }, []);

  const payRent = async (invoiceId) => {
    await api.post('/payments/pay', { invoiceId, method: 'razorpay' });
    const refreshed = await api.get('/tenant/dashboard');
    setData(refreshed.data);
  };

  const submitComplaint = async (e) => {
    e.preventDefault();
    await api.post('/tenant/complaints', complaint);
    setComplaint({ title: '', description: '' });
  };

  if (!data) return <p>Loading tenant details...</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-xl font-semibold">Welcome, {data.tenant?.user?.name || 'Tenant'}</h2>
        <p className="text-sm text-slate-400">Monthly Rent: ₹{data.rentDetails.monthlyRent} | Due day: {data.rentDetails.dueDayOfMonth}</p>
        <p className="mt-2 text-sm">Pending Amount: <span className="font-semibold text-amber-300">₹{data.pendingAmount}</span></p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-3 font-semibold">Invoices & Payments</h3>
        <div className="space-y-3">
          {data.paymentHistory.map((invoice) => (
            <div key={invoice._id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-800 p-3 text-sm">
              <div>
                <p>{invoice.invoiceNumber} • {invoice.month}</p>
                <p className="text-slate-400">Due: {new Date(invoice.dueDate).toLocaleDateString()} • Total: ₹{invoice.totalAmount}</p>
              </div>
              {invoice.status === 'paid' ? (
                <span className="rounded bg-emerald-900/40 px-2 py-1 text-emerald-300">Paid</span>
              ) : (
                <button className="rounded bg-cyan-600 px-3 py-1 hover:bg-cyan-500" onClick={() => payRent(invoice._id)}>Pay Now</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={submitComplaint} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="font-semibold">Raise Complaint</h3>
        <div className="mt-3 space-y-2">
          <input className="w-full rounded border border-slate-700 bg-slate-800 p-2" placeholder="Issue title" value={complaint.title} onChange={(e) => setComplaint((c) => ({ ...c, title: e.target.value }))} />
          <textarea className="w-full rounded border border-slate-700 bg-slate-800 p-2" placeholder="Describe issue" rows="3" value={complaint.description} onChange={(e) => setComplaint((c) => ({ ...c, description: e.target.value }))} />
          <button className="rounded bg-violet-600 px-3 py-2 hover:bg-violet-500" type="submit">Submit</button>
        </div>
      </form>
    </div>
  );
};

export default TenantDashboard;
