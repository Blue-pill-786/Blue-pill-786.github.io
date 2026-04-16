import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationContext';

/**
 * Advanced Hook for API Data Fetching with Caching
 */
export const useFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showError } = useNotification();
  const cacheRef = useRef(new Map());

  const fetchData = useCallback(async () => {
    // Check cache
    if (cacheRef.current.has(url) && !options.skipCache) {
      const cachedData = cacheRef.current.get(url);
      if (Date.now() - cachedData.timestamp < (options.cacheDuration || 5 * 60 * 1000)) {
        setData(cachedData.data);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(url);
      const result = response.data.data || response.data;

      // Cache the data
      cacheRef.current.set(url, { data: result, timestamp: Date.now() });
      setData(result);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch data';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [url, options, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    cacheRef.current.delete(url);
    fetchData();
  }, [url, fetchData]);

  return { data, loading, error, refetch };
};

/**
 * Advanced Hook for Form Validation and State Management
 */
export const useForm = (initialValues, onSubmit, validate) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showError } = useNotification();

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setValues((prev) => ({ ...prev, [name]: newValue }));

    // Real-time validation
    if (touched[name]) {
      const fieldError = validate?.[name]?.(newValue);
      setErrors((prev) => ({
        ...prev,
        [name]: fieldError || '',
      }));
    }
  }, [validate, touched]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const fieldError = validate?.[name]?.(value);
    setErrors((prev) => ({
      ...prev,
      [name]: fieldError || '',
    }));
  }, [validate]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      
      // Validate all fields
      const newErrors = {};
      Object.entries(validate || {}).forEach(([field, validator]) => {
        const error = validator(values[field]);
        if (error) newErrors[field] = error;
      });

      setErrors(newErrors);
      setTouched(
        Object.keys(validate || {}).reduce((acc, field) => {
          acc[field] = true;
          return acc;
        }, {})
      );

      if (Object.keys(newErrors).length === 0) {
        try {
          setIsSubmitting(true);
          await onSubmit(values);
        } catch (err) {
          showError(err.message || 'Failed to submit form');
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [values, validate, onSubmit, showError]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFieldValue = useCallback((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
  };
};

/**
 * Advanced Hook for API Mutations (POST, PUT, DELETE)
 */
export const useMutation = (fn) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const { showSuccess, showError } = useNotification();

  const mutate = useCallback(
    async (payload) => {
      try {
        setLoading(true);
        setError(null);
        const result = await fn(payload);
        setData(result);
        return result;
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || 'Operation failed';
        setError(errorMsg);
        showError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fn, showError]
  );

  return { mutate, loading, error, data };
};

/**
 * Advanced Hook for Pagination
 */
export const usePagination = (items, itemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);

  const goToPage = useCallback((page) => {
    const pageNum = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNum);
  }, [totalPages]);

  return {
    currentPage,
    totalPages,
    currentItems,
    goToPage,
    goToNext: () => goToPage(currentPage + 1),
    goToPrev: () => goToPage(currentPage - 1),
  };
};

/**
 * Advanced Hook for Local Storage Persistence
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
};

/**
 * Advanced Hook for Debounced Values
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Advanced Hook for Async State
 */
export const useAsync = (asyncFunction, immediate = true) => {
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setStatus('pending');
    setData(null);
    setError(null);
    try {
      const response = await asyncFunction();
      setData(response);
      setStatus('success');
      return response;
    } catch (error) {
      setError(error);
      setStatus('error');
      throw error;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, status, data, error };
};
