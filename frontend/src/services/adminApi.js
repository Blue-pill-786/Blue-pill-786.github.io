import { api } from "../lib/api";

/* ================= HELPER ================= */

const unwrap = (res) => res.data?.data || res.data;

/* ================= PROPERTIES ================= */

export const getProperties = async () => {
  const res = await api.get("/admin/properties");
  return unwrap(res);
};

export const getProperty = async (id) => {
  const res = await api.get(`/admin/properties/${id}`);
  return unwrap(res);
};

export const createProperty = async (data) => {
  const res = await api.post("/admin/properties", data);
  return unwrap(res);
};

export const updateProperty = async (id, data) => {
  const res = await api.put(`/admin/properties/${id}`, data);
  return unwrap(res);
};

/* ================= TENANTS ================= */

export const getTenants = async () => {
  const res = await api.get("/admin/tenants");
  return unwrap(res);
};

export const getTenant = async (id) => {
  const res = await api.get(`/admin/tenants/${id}`);
  return unwrap(res);
};

export const addTenant = async (data) => {
  const res = await api.post("/admin/tenants", data);
  return unwrap(res);
};

export const updateTenant = async (id, data) => {
  const res = await api.put(`/admin/tenants/${id}`, data);
  return unwrap(res);
};

export const removeTenant = async (id) => {
  const res = await api.delete(`/admin/tenants/${id}`);
  return unwrap(res);
};

/* ================= BED ================= */

export const updateRent = async (data) => {
  const res = await api.put("/admin/tenants/beds/rent", data);
  return unwrap(res);
};

/* ================= INVOICES ================= */

export const getInvoices = async () => {
  const res = await api.get("/payments/all");
  return unwrap(res);
};

export const createInvoice = async (data) => {
  const res = await api.post("/payments/admin", data);
  return unwrap(res);
};

export const cancelInvoice = async (invoiceId, reason) => {
  const res = await api.delete(`/payments/admin/${invoiceId}`, {
    data: { reason },
  });
  return unwrap(res);
};