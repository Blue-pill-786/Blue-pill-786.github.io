import { useEffect, useState } from "react";
import { createInvoice, getInvoices, cancelInvoice } from "../services/adminApi";
import { getTenants } from "../services/adminApi";

const InvoiceManagement = () => {
  const [invoices, setInvoices] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    tenantId: "",
    billingMonth: "",
    baseAmount: "",
    dueDate: "",
    lateFee: ""
  });

  const loadInvoices = async () => {
    try {
      const data = await getInvoices();
      setInvoices(data || []);
    } catch (err) {
      console.error("INVOICE LOAD ERROR:", err);
      setError("Failed to load invoices");
    }
  };

  const loadTenants = async () => {
    try {
      const tenantData = await getTenants();
      setTenants(tenantData || []);
    } catch (err) {
      console.error("TENANT LOAD ERROR:", err);
      setError("Failed to load tenants");
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadInvoices(), loadTenants()]);
      setLoading(false);
    };

    load();
  }, []);

  const refresh = async () => {
    setError("");
    setMessage("");
    await loadInvoices();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.tenantId || !form.billingMonth || form.baseAmount === "") {
      setError("Tenant, billing month and base amount are required.");
      return;
    }

    setSubmitting(true);

    try {
      await createInvoice({
        tenantId: form.tenantId,
        billingMonth: form.billingMonth,
        baseAmount: Number(form.baseAmount),
        dueDate: form.dueDate || undefined,
        lateFee: form.lateFee ? Number(form.lateFee) : undefined
      });

      setMessage("Invoice created successfully.");
      setForm({ tenantId: "", billingMonth: "", baseAmount: "", dueDate: "", lateFee: "" });
      await refresh();
    } catch (err) {
      console.error("CREATE INVOICE ERROR:", err);
      setError(err.response?.data?.message || "Unable to create invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (invoiceId) => {
    setError("");
    setMessage("");

    try {
      await cancelInvoice(invoiceId, "Cancelled by admin");
      setMessage("Invoice cancelled successfully.");
      await refresh();
    } catch (err) {
      console.error("CANCEL INVOICE ERROR:", err);
      setError(err.response?.data?.message || "Failed to cancel invoice.");
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-slate-400">Loading invoices...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-cyan-500/10 bg-slate-950/90 p-6 shadow-float card-glow">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-cyan-100">Invoice Management</h2>
            <p className="text-sm text-slate-400">View, create, and cancel invoices for tenants.</p>
          </div>
          <div className="rounded-full bg-slate-900/80 px-4 py-2 text-sm text-slate-300">{invoices.length} invoices loaded</div>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-red-200">{error}</div>
      )}

      {message && (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-200">{message}</div>
      )}

      <section className="rounded-[2rem] border border-cyan-500/10 bg-slate-950/90 p-6 shadow-float card-glow">
        <h3 className="font-semibold text-white mb-4">Create New Invoice</h3>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-slate-300">Tenant</span>
            <select
              name="tenantId"
              value={form.tenantId}
              onChange={handleChange}
              className="mt-1 w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 focus:border-cyan-400"
            >
              <option value="">Select tenant</option>
              {tenants.filter((tenant) => tenant.user).map((tenant) => (
                <option key={tenant._id} value={tenant._id}>
                  {tenant.user.name} ({tenant.user.email}) • {tenant.bedLabel}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-slate-300">Billing Month</span>
            <input
              type="month"
              name="billingMonth"
              value={form.billingMonth}
              onChange={handleChange}
              className="mt-1 w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 focus:border-cyan-400"
            />
          </label>

          <label className="block">
            <span className="text-slate-300">Base Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="baseAmount"
              value={form.baseAmount}
              onChange={handleChange}
              className="mt-1 w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 focus:border-cyan-400"
            />
          </label>

          <label className="block">
            <span className="text-slate-300">Late Fee</span>
            <input
              type="number"
              min="0"
              step="0.01"
              name="lateFee"
              value={form.lateFee}
              onChange={handleChange}
              className="mt-1 w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 focus:border-cyan-400"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-slate-300">Due Date</span>
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              className="mt-1 w-full rounded-3xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-slate-100 focus:border-cyan-400"
            />
          </label>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-3xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(56,189,248,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="font-semibold mb-4">Invoice List</h3>

        {invoices.length === 0 ? (
          <div className="text-slate-400">No invoices found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-slate-300">
                  <th className="border-b border-slate-800 px-3 py-2">Invoice</th>
                  <th className="border-b border-slate-800 px-3 py-2">Tenant</th>
                  <th className="border-b border-slate-800 px-3 py-2">Month</th>
                  <th className="border-b border-slate-800 px-3 py-2">Due</th>
                  <th className="border-b border-slate-800 px-3 py-2">Total</th>
                  <th className="border-b border-slate-800 px-3 py-2">Status</th>
                  <th className="border-b border-slate-800 px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice._id} className="border-b border-slate-800 bg-slate-950/70 transition hover:bg-slate-900">
                    <td className="px-3 py-3">{invoice.invoiceNumber}</td>
                    <td className="px-3 py-3">{invoice.tenant?.user?.name || invoice.tenant?.user?.email || "Unknown"}</td>
                    <td className="px-3 py-3">{invoice.billingMonth}</td>
                    <td className="px-3 py-3">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td className="px-3 py-3">₹{invoice.totalAmount?.toLocaleString() || 0}</td>
                    <td className="px-3 py-3 capitalize">{invoice.status}</td>
                    <td className="px-3 py-3">
                      {invoice.status !== "cancelled" && invoice.status !== "paid" ? (
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm("Cancel this invoice?")) {
                              await handleCancel(invoice._id);
                            }
                          }}
                          className="rounded-3xl bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-rose-500"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-slate-500">No action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default InvoiceManagement;
