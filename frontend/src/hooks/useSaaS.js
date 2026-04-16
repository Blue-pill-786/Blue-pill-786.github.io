/**
 * Production-Ready SaaS Hook
 * Manages organization, billing, tier upgrades, and subscription
 */

import { useMemo, useCallback, useReducer } from 'react';
import { api } from '../lib/endpoints';

/**
 * Initial state for SaaS management
 */
const initialState = {
  organization: null,
  pricing: [],
  usage: null,
  billingHistory: [],
  loading: false,
  upgrading: false,
  error: null,
  success: null,
};

/**
 * Reducer for state management
 */
function saasReducer(state, action) {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'UPGRADING':
      return { ...state, upgrading: true, error: null };
    case 'SET_ORGANIZATION':
      return { ...state, organization: action.payload, loading: false };
    case 'SET_PRICING':
      return { ...state, pricing: action.payload, loading: false };
    case 'SET_USAGE':
      return { ...state, usage: action.payload, loading: false };
    case 'SET_BILLING_HISTORY':
      return { ...state, billingHistory: action.payload, loading: false };
    case 'UPGRADE_SUCCESS':
      return {
        ...state,
        organization: action.payload,
        upgrading: false,
        success: 'Tier upgraded successfully',
      };
    case 'ERROR':
      return { ...state, error: action.payload, loading: false, upgrading: false };
    case 'CLEAR_SUCCESS':
      return { ...state, success: null };
    default:
      return state;
  }
}

/**
 * SaaS Hook
 */
export const useSaaS = () => {
  const [state, dispatch] = useReducer(saasReducer, initialState);

  /**
   * Load organization details
   */
  const loadOrganization = useCallback(async () => {
    try {
      dispatch({ type: 'LOADING' });
      const response = await api.saas.getOrganization();
      dispatch({ type: 'SET_ORGANIZATION', payload: response.data.data });
    } catch (err) {
      dispatch({
        type: 'ERROR',
        payload: err.response?.data?.message || 'Failed to load organization',
      });
    }
  }, []);

  /**
   * Load pricing information
   */
  const loadPricing = useCallback(async () => {
    try {
      dispatch({ type: 'LOADING' });
      const response = await api.saas.getPricing();
      dispatch({ type: 'SET_PRICING', payload: response.data.data });
    } catch (err) {
      dispatch({
        type: 'ERROR',
        payload: err.response?.data?.message || 'Failed to load pricing',
      });
    }
  }, []);

  /**
   * Load usage information
   */
  const loadUsage = useCallback(async () => {
    try {
      dispatch({ type: 'LOADING' });
      const response = await api.saas.getUsage();
      dispatch({ type: 'SET_USAGE', payload: response.data.data });
    } catch (err) {
      dispatch({
        type: 'ERROR',
        payload: err.response?.data?.message || 'Failed to load usage',
      });
    }
  }, []);

  /**
   * Load billing history
   */
  const loadBillingHistory = useCallback(async (page = 1) => {
    try {
      dispatch({ type: 'LOADING' });
      const response = await api.saas.getBillingHistory({ page });
      dispatch({ type: 'SET_BILLING_HISTORY', payload: response.data.data });
    } catch (err) {
      dispatch({
        type: 'ERROR',
        payload: err.response?.data?.message || 'Failed to load billing history',
      });
    }
  }, []);

  /**
   * Upgrade tier
   */
  const upgradeTier = useCallback(async (tier, billingCycle = 'monthly') => {
    try {
      dispatch({ type: 'UPGRADING' });
      const response = await api.saas.upgradeTier({ tier, billingCycle });
      dispatch({ type: 'UPGRADE_SUCCESS', payload: response.data.data });
      return response.data.data;
    } catch (err) {
      dispatch({
        type: 'ERROR',
        payload: err.response?.data?.message || 'Failed to upgrade tier',
      });
      throw err;
    }
  }, []);

  /**
   * Downgrade tier
   */
  const downgradeTier = useCallback(async (tier, reason = '') => {
    try {
      dispatch({ type: 'UPGRADING' });
      const response = await api.saas.downgradeTier({ tier, reason });
      dispatch({ type: 'UPGRADE_SUCCESS', payload: response.data.data });
      return response.data.data;
    } catch (err) {
      dispatch({
        type: 'ERROR',
        payload: err.response?.data?.message || 'Failed to downgrade tier',
      });
      throw err;
    }
  }, []);

  /**
   * Update organization
   */
  const updateOrganization = useCallback(async (data) => {
    try {
      dispatch({ type: 'LOADING' });
      const response = await api.saas.updateOrganization(data);
      dispatch({ type: 'SET_ORGANIZATION', payload: response.data.data });
      return response.data.data;
    } catch (err) {
      dispatch({
        type: 'ERROR',
        payload: err.response?.data?.message || 'Failed to update organization',
      });
      throw err;
    }
  }, []);

  /**
   * Cancel subscription
   */
  const cancelSubscription = useCallback(async (reason = '') => {
    try {
      dispatch({ type: 'UPGRADING' });
      const response = await api.saas.cancelSubscription({ reason });
      dispatch({ type: 'UPGRADE_SUCCESS', payload: response.data.data });
      return response.data.data;
    } catch (err) {
      dispatch({
        type: 'ERROR',
        payload: err.response?.data?.message || 'Failed to cancel subscription',
      });
      throw err;
    }
  }, []);

  /**
   * Check if trial is expired
   */
  const isTrialExpired = useMemo(() => {
    if (!state.organization || !state.organization.trialEndDate) return false;
    return new Date() > new Date(state.organization.trialEndDate);
  }, [state.organization]);

  /**
   * Get usage percentage
   */
  const getUsagePercentage = useCallback(
    (resource) => {
      if (!state.usage) return 0;
      const limit = state.usage.limits[resource];
      const current = state.usage.current[resource];
      if (limit === 'unlimited' || !limit) return 0;
      return Math.round((current / limit) * 100);
    },
    [state.usage]
  );

  /**
   * Check if organization is approaching limits
   */
  const isApproachingLimit = useCallback(
    (resource, threshold = 80) => {
      return getUsagePercentage(resource) >= threshold;
    },
    [getUsagePercentage]
  );

  /**
   * Clear success message
   */
  const clearSuccess = useCallback(() => {
    dispatch({ type: 'CLEAR_SUCCESS' });
  }, []);

  return {
    ...state,
    loadOrganization,
    loadPricing,
    loadUsage,
    loadBillingHistory,
    upgradeTier,
    downgradeTier,
    updateOrganization,
    cancelSubscription,
    isTrialExpired,
    getUsagePercentage,
    isApproachingLimit,
    clearSuccess,
  };
};

export default useSaaS;
