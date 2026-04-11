import { api } from "../lib/api";

export const getProperties = () => api.get("/admin/properties");

export const getProperty = (id) => api.get(`/admin/properties/${id}`);

export const getTenants = () => api.get("/admin/tenants");

export const addTenant = (data) => api.post("/admin/tenants", data);

export const removeTenant = (id) => api.delete(`/admin/tenants/${id}`);

export const updateRent = (data) => api.put("/admin/beds/rent", data);