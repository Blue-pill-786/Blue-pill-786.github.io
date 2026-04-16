import PropTypes from 'prop-types';

const getInvoiceStatus = (invoice) => {
  const dueDate = new Date(invoice.dueDate);
  const isOverdue = invoice.status === 'overdue' || (new Date() > dueDate && invoice.status !== 'paid');
  
  if (invoice.status === 'paid') {
    return { label: '✓ Paid', color: 'bg-emerald-500/20 text-emerald-300' };
  }
  if (isOverdue) {
    return { label: '⚠ Overdue', color: 'bg-red-500/20 text-red-300' };
  }
  return { label: '⏳ Pending', color: 'bg-yellow-500/20 text-yellow-300' };
};

const InvoiceItem = ({ invoice, onPayRent }) => {
  const dueDate = new Date(invoice.dueDate);
  const status = getInvoiceStatus(invoice);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800/70 transition">
      <div className="flex-1">
        <p className="font-semibold text-white">{invoice.invoiceNumber}</p>
        <p className="text-sm text-slate-400 mt-1">
          Month: {invoice.billingMonth} • Base: ₹{invoice.baseAmount}
          {invoice.lateFee > 0 && ` • Late Fee: ₹${invoice.lateFee}`}
        </p>
        <p className="text-xs text-slate-500 mt-1">Due: {dueDate.toLocaleDateString('en-IN')}</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${status.color}`}>
          {status.label}
        </div>

        <div className="text-xl font-bold text-cyan-300">₹{invoice.totalAmount}</div>

        {invoice.status !== 'paid' && (
          <button
            onClick={() => onPayRent(invoice._id)}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg transition shadow-lg hover:shadow-cyan-500/25"
          >
            Pay Now
          </button>
        )}
      </div>
    </div>
  );
};

InvoiceItem.propTypes = {
  invoice: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    invoiceNumber: PropTypes.string.isRequired,
    billingMonth: PropTypes.string.isRequired,
    baseAmount: PropTypes.number.isRequired,
    lateFee: PropTypes.number,
    totalAmount: PropTypes.number.isRequired,
    dueDate: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
  }).isRequired,
  onPayRent: PropTypes.func.isRequired,
};

const InvoicesList = ({ invoices = [], onPayRent }) => {
  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-6 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-cyan-100 mb-6">📋 Invoices & Payments</h2>
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg">No invoices yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cyan-500/15 bg-slate-900/50 p-6 backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-cyan-100 mb-6">📋 Invoices & Payments</h2>
      <div className="space-y-3">
        {invoices.map((invoice) => (
          <InvoiceItem
            key={invoice._id}
            invoice={invoice}
            onPayRent={onPayRent}
          />
        ))}
      </div>
    </div>
  );
};

InvoicesList.propTypes = {
  invoices: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      invoiceNumber: PropTypes.string.isRequired,
      billingMonth: PropTypes.string.isRequired,
      baseAmount: PropTypes.number.isRequired,
      lateFee: PropTypes.number,
      totalAmount: PropTypes.number.isRequired,
      dueDate: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
    })
  ),
  onPayRent: PropTypes.func.isRequired,
};

export default InvoicesList;
