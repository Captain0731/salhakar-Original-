import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Custom hook to manage filters with URL persistence
 * Filters are stored in URL query parameters and automatically restored on back navigation
 * 
 * @param {Object} defaultFilters - Default filter values
 * @param {Object} options - Configuration options
 * @param {boolean} options.replace - Use replaceState instead of pushState (default: false)
 * @param {boolean} options.syncOnMount - Sync filters from URL on mount (default: true)
 * @returns {[Object, Function, Function]} - [filters, setFilters, clearFilters]
 */
export function useURLFilters(defaultFilters = {}, options = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { replace = false, syncOnMount = true } = options;

  // Initialize filters from URL or defaults
  const getFiltersFromURL = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlFilters = { ...defaultFilters };

    // Read all filter keys from URL
    Object.keys(defaultFilters).forEach(key => {
      const value = searchParams.get(key);
      if (value !== null && value !== '') {
        // Try to parse as number if default is a number
        if (typeof defaultFilters[key] === 'number') {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            urlFilters[key] = numValue;
          } else {
            urlFilters[key] = value;
          }
        } else {
          urlFilters[key] = value;
        }
      }
    });

    return urlFilters;
  }, [location.search, defaultFilters]);

  // Initialize state from URL or defaults
  const [filters, setFiltersState] = useState(() => {
    if (syncOnMount) {
      return getFiltersFromURL();
    }
    return { ...defaultFilters };
  });

  // Update URL when filters change
  const updateURL = useCallback((newFilters) => {
    const searchParams = new URLSearchParams(location.search);
    
    // Remove all existing filter params
    Object.keys(defaultFilters).forEach(key => {
      searchParams.delete(key);
    });

    // Add new filter params (only non-empty values)
    Object.keys(newFilters).forEach(key => {
      const value = newFilters[key];
      if (value !== null && value !== undefined && value !== '') {
        searchParams.set(key, String(value));
      }
    });

    // Update URL without causing a page reload
    const newSearch = searchParams.toString();
    const newPath = newSearch 
      ? `${location.pathname}?${newSearch}`
      : location.pathname;

    if (replace) {
      navigate(newPath, { replace: true });
    } else {
      navigate(newPath, { replace: false });
    }
  }, [location.pathname, location.search, navigate, defaultFilters, replace]);

  // Sync filters from URL when location changes (e.g., back button)
  useEffect(() => {
    if (syncOnMount) {
      const urlFilters = getFiltersFromURL();
      // Only update if filters actually changed to avoid infinite loops
      setFiltersState(prevFilters => {
        const hasChanged = Object.keys(urlFilters).some(
          key => prevFilters[key] !== urlFilters[key]
        ) || Object.keys(prevFilters).some(
          key => !urlFilters.hasOwnProperty(key) || prevFilters[key] !== urlFilters[key]
        );
        
        return hasChanged ? urlFilters : prevFilters;
      });
    }
  }, [location.search, getFiltersFromURL, syncOnMount]);

  // Wrapper for setFilters that also updates URL
  const setFilters = useCallback((newFiltersOrUpdater) => {
    setFiltersState(prevFilters => {
      const newFilters = typeof newFiltersOrUpdater === 'function'
        ? newFiltersOrUpdater(prevFilters)
        : newFiltersOrUpdater;
      
      // Update URL asynchronously to avoid blocking
      setTimeout(() => {
        updateURL(newFilters);
      }, 0);
      
      return newFilters;
    });
  }, [updateURL]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedFilters = { ...defaultFilters };
    setFiltersState(clearedFilters);
    updateURL(clearedFilters);
  }, [defaultFilters, updateURL]);

  return [filters, setFilters, clearFilters];
}

