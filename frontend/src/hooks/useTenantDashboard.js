import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/endpoints';

const TOAST_MESSAGES = {
  PAYMENT_SUCCESS: 'Payment processed successfully!',
  PAYMENT_ERROR: 'Payment failed',
  COMPLAINT_SUCCESS: 'Complaint submitted successfully',
  COMPLAINT_ERROR: 'Unable to submit complaint',
  DASHBOARD_ERROR: 'Unable to load dashboard',
  VALIDATION_ERROR: 'Please fill in all fields',
};

export const useTenantDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [complaint, setComplaint] = useState({ title: '', description: '' });
  const [complaintLoading, setComplaintLoading] = useState(false);

  // Load dashboard data
  const loadTenantData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.tenant.getDashboard();
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load tenant dashboard', err);
      const errorMessage = err.response?.data?.message || TOAST_MESSAGES.DASHBOARD_ERROR;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize dashboard on mount
  useEffect(() => {
    loadTenantData();
  }, [loadTenantData]);

  // Handle rent payment
  const payRent = useCallback(async (invoiceId) => {
    try {
      await api.payments.markAsPaid({ invoiceId, amount: 0, method: 'razorpay' });
      alert(TOAST_MESSAGES.PAYMENT_SUCCESS);
      await loadTenantData();
    } catch (err) {
      console.error('Payment failed', err);
      const errorMessage = err.response?.data?.message || TOAST_MESSAGES.PAYMENT_ERROR;
      alert(errorMessage);
    }
  }, [loadTenantData]);

  // Validate complaint form
  const validateComplaint = (complaintData) => {
    if (!complaintData.title.trim() || !complaintData.description.trim()) {
      alert(TOAST_MESSAGES.VALIDATION_ERROR);
      return false;
    }
    return true;
  };

  // Handle complaint submission
  const submitComplaint = useCallback(async (onSuccess) => {
    if (!validateComplaint(complaint)) {
      return;
    }

    try {
      setComplaintLoading(true);
      await api.tenant.submitComplaint(complaint);
      alert(TOAST_MESSAGES.COMPLAINT_SUCCESS);
      if (onSuccess) {
        onSuccess();
      }
      await loadTenantData();
    } catch (err) {
      console.error('Complaint submit failed', err);
      const errorMessage = err.response?.data?.message || TOAST_MESSAGES.COMPLAINT_ERROR;
      alert(errorMessage);
    } finally {
      setComplaintLoading(false);
    }
  }, [complaint, loadTenantData]);

  return {
    data,
    loading,
    error,
    complaintLoading,
    complaint,
    setComplaint,
    payRent,
    submitComplaint,
    refreshData: loadTenantData,
  };
};
