import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/landing/Navbar";
import apiService from "../services/api";
import { useURLFilters } from "../hooks/useURLFilters";
import { 
  EnhancedJudgmentSkeleton, 
  SkeletonGrid,
  SmoothTransitionWrapper 
} from "../components/EnhancedLoadingComponents";

// Add custom CSS animations
const customStyles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  
  @keyframes fadeInUp {
    from { 
      opacity: 0; 
      transform: translateY(30px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
  
  @keyframes slideInFromBottom {
    from { 
      opacity: 0; 
      transform: translateY(50px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
  
  @keyframes scaleIn {
    from { 
      opacity: 0; 
      transform: scale(0.9); 
    }
    to { 
      opacity: 1; 
      transform: scale(1); 
    }
  }
  
  @keyframes slideInFromRight {
    from { 
      opacity: 0; 
      transform: translateX(30px); 
    }
    to { 
      opacity: 1; 
      transform: translateX(0); 
    }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }
  
  .animate-slide-in-bottom {
    animation: slideInFromBottom 0.8s ease-out forwards;
  }
  
  .animate-scale-in {
    animation: scaleIn 0.5s ease-out forwards;
  }
  
  .animate-slide-in-right {
    animation: slideInFromRight 0.6s ease-out forwards;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = customStyles;
  document.head.appendChild(styleSheet);
}

export default function LegalJudgments() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMountedRef = useRef(true);

  // Court type state - defaults to highcourt
  const [courtType, setCourtType] = useState("highcourt");

  // Filter visibility state
  const [showFilters, setShowFilters] = useState(false);

  // Data states
  const [judgments, setJudgments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const nextCursorRef = useRef(null);
  const fetchJudgmentsRef = useRef(null);
  const isInitialMountRef = useRef(true);
  const isFetchingRef = useRef(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollTimeoutRef = useRef(null);

  const pageSize = 10; // Increased to show more judgments per load

  // Get filter fields based on court type
  const getFilterFields = () => {
    if (courtType === "supremecourt") {
      return {
        search: '',
        title: '',
        cnr: '',
        judge: '',
        petitioner: '',
        respondent: '',
        decisionDateFrom: ''
      };
    } else {
      return {
        search: '',
        title: '',
        cnr: '',
        highCourt: '',
        judge: '',
        decisionDateFrom: ''
      };
    }
  };

  // Use URL-persisted filters hook
  const [filters, setFilters, clearFilters] = useURLFilters(
    getFilterFields(),
    { replace: false, syncOnMount: true }
  );

  // Update filters when court type changes (preserve common filters)
  useEffect(() => {
    const newFilterFields = getFilterFields();
    // Merge existing filters with new defaults, preserving common filters
    const mergedFilters = { ...newFilterFields };
    Object.keys(filters).forEach(key => {
      if (newFilterFields.hasOwnProperty(key) && filters[key]) {
        mergedFilters[key] = filters[key];
      }
    });
    setFilters(mergedFilters);
    
    setJudgments([]);
    setNextCursor(null);
    setHasMore(true);
    setError(null);
    // Reset fetching state when court type changes
    isFetchingRef.current = false;
    setLoading(false);
    setIsSearching(false);
  }, [courtType]);

  // Store filters in ref to always get latest values
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Fetch judgments function with cursor-based pagination
  const fetchJudgments = useCallback(async (isLoadMore = false, customFilters = null) => {
    if (!isMountedRef.current) return;
    
    // Prevent duplicate simultaneous requests for initial load only
    if (isFetchingRef.current && !isLoadMore) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Already fetching, skipping duplicate request');
      }
      return;
    }
    
    try {
      if (isLoadMore) {
        setIsSearching(true);
      } else {
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
      }
      
      // Use custom filters if provided, otherwise use current filters from ref
      const activeFilters = customFilters !== null ? customFilters : filtersRef.current;
      const currentNextCursor = nextCursorRef.current;
      
      // Reduced logging for production - only log important info
      if (process.env.NODE_ENV === 'development') {
        console.log(`Fetching ${courtType} judgments with params:`, { isLoadMore, filters: activeFilters, currentNextCursor });
      }
      
      // Prepare params based on court type
      const params = {
        limit: pageSize,
      };

      // Add filters - remove empty ones and map to API format
      Object.keys(activeFilters).forEach(key => {
        const value = activeFilters[key];
        // Skip empty values
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return;
        }
        
        // Map filter keys to API parameter names
        if (key === 'highCourt') {
          params.court_name = value;
        } else if (key === 'decisionDateFrom') {
          params.decision_date_from = value;
        } else if (key === 'search') {
          // Search parameter
          params.search = value;
        } else {
          // Direct mapping for: title, cnr, judge, petitioner, respondent
          params[key] = value;
        }
      });

      // Add cursor for pagination if loading more
      // According to API docs:
      // - High Court uses dual cursor: cursor_decision_date (YYYY-MM-DD) + cursor_id
      // - Supreme Court uses single cursor: cursor_id only
      if (isLoadMore && currentNextCursor) {
        if (courtType === "supremecourt") {
          // Supreme Court: Only cursor_id needed
          if (currentNextCursor.id) {
            params.cursor_id = currentNextCursor.id;
          }
        } else {
          // High Court: Both cursor_decision_date and cursor_id needed
          if (currentNextCursor.decision_date) {
            params.cursor_decision_date = currentNextCursor.decision_date;
          }
          if (currentNextCursor.id) {
            params.cursor_id = currentNextCursor.id;
          }
        }
      }

      // Remove empty params
      Object.keys(params).forEach(key => {
        if (params[key] === "" || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      // Log params for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`${courtType} - Calling API with params:`, params);
      }

      // Call appropriate API based on court type
      let data;
      if (courtType === "supremecourt") {
        data = await apiService.getSupremeCourtJudgements(params);
      } else {
        // Use getJudgements for High Court (it uses /api/judgements endpoint as per API docs)
        data = await apiService.getJudgements(params);
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`${courtType} - API Response:`, { 
          fullResponse: data,
          dataCount: data?.data?.length, 
          hasMore: data?.pagination_info?.has_more,
          nextCursor: data?.next_cursor,
          dataType: Array.isArray(data?.data) ? 'array' : typeof data?.data
        });
      }
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid API response: Expected object but got ' + typeof data);
      }
      
      // Handle different response structures
      let judgmentsArray = [];
      if (Array.isArray(data.data)) {
        judgmentsArray = data.data;
      } else if (Array.isArray(data)) {
        // If API returns array directly
        judgmentsArray = data;
      } else if (data.data) {
        // If data.data exists but isn't an array, try to convert
        console.warn(`${courtType}: API response data is not an array:`, data.data);
        judgmentsArray = [];
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`${courtType} - Processed judgments:`, judgmentsArray.length, 'items');
      }
      
      if (!isMountedRef.current) return;
      
      const paginationInfo = data.pagination_info || {};
      
      if (isLoadMore) {
        setJudgments(prev => {
          const combined = [...prev, ...judgmentsArray];
          if (process.env.NODE_ENV === 'development') {
            console.log(`${courtType} - Total judgments after load more:`, combined.length);
          }
          return combined;
        });
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`${courtType} - Setting judgments:`, judgmentsArray.length, 'items');
        }
        setJudgments(judgmentsArray);
      }
      
      // Update cursor and hasMore based on API response
      const newCursor = data.next_cursor || null;
      setNextCursor(newCursor);
      nextCursorRef.current = newCursor;
      setHasMore(paginationInfo.has_more !== false);
      
      if (!isLoadMore) {
        setTotalCount(judgmentsArray.length + (paginationInfo.has_more ? 1 : 0));
      }
      
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error(`${courtType} Error fetching judgments:`, error);
      
      // Enhanced error handling with specific messages
      const currentCourtLabel = courtType === "supremecourt" ? "Supreme Court" : "High Court";
      let errorMessage = `Failed to fetch ${currentCourtLabel.toLowerCase()} judgments. Please try again.`;
      
      if (error.message.includes('401') || error.message.includes('Authentication')) {
        errorMessage = "Authentication required. Please log in to access judgments.";
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = "Access denied. Please check your permissions.";
      } else if (error.message.includes('500') || error.message.includes('Internal Server')) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.message.includes('Network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      // Clear judgments on error (except when loading more)
      if (!isLoadMore) {
        setJudgments([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setIsSearching(false);
        if (!isLoadMore) {
          isFetchingRef.current = false;
        }
      }
    }
  }, [courtType, pageSize]);

  // Store fetchJudgments in ref
  useEffect(() => {
    fetchJudgmentsRef.current = fetchJudgments;
  }, [fetchJudgments]);

  // Filter handling functions
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleClearFilters = () => {
    const emptyFilters = getFilterFields();
    setFilters(emptyFilters);
    setJudgments([]);
    setHasMore(true);
    setNextCursor(null);
    setTimeout(() => {
      if (fetchJudgmentsRef.current) {
        fetchJudgmentsRef.current(false);
      }
    }, 100);
  };

  const applyFilters = () => {
    if (isFetchingRef.current) return;
    
    // Get current filters directly from state to ensure we use the latest values
    setJudgments([]);
    setHasMore(true);
    setNextCursor(null);
    setError(null);
    
    // Use setTimeout to ensure filters state is updated, then fetch with explicit filters
    setTimeout(() => {
      if (fetchJudgmentsRef.current) {
        // Pass current filters explicitly to avoid closure issues
        const currentFilters = filtersRef.current;
        if (process.env.NODE_ENV === 'development') {
          console.log('Applying filters:', currentFilters);
        }
        fetchJudgmentsRef.current(false, currentFilters);
      }
    }, 100);
  };

  // Sync nextCursor ref with state
  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  // Auto-apply filters when they change (with debounce) - Skip on initial mount
  useEffect(() => {
    // Skip auto-apply on initial mount
    if (isInitialMountRef.current) {
      return;
    }
    
    // Don't auto-apply if already fetching
    if (isFetchingRef.current) {
      return;
    }
    
    const timeoutId = setTimeout(() => {
      // Check if any filters have values (excluding search for auto-apply)
      const hasActiveFilters = Object.entries(filters).some(([key, val]) => {
        if (key === 'search') return false; // Search should be applied manually
        return val && (typeof val === 'string' ? val.trim() !== '' : val !== '');
      });
      
      if (hasActiveFilters && !isFetchingRef.current && fetchJudgmentsRef.current) {
        const currentFilters = filtersRef.current;
        if (process.env.NODE_ENV === 'development') {
          console.log('Auto-applying filters:', currentFilters);
        }
        setJudgments([]);
        setHasMore(true);
        setNextCursor(null);
        setError(null);
        fetchJudgmentsRef.current(false, currentFilters);
      }
    }, 800); // Increased debounce for better UX

    return () => clearTimeout(timeoutId);
  }, [filters.title, filters.cnr, filters.highCourt, filters.judge, filters.petitioner, filters.respondent, filters.decisionDateFrom]);

  // Load initial data when court type changes - Only fetch once
  useEffect(() => {
    if (isInitialMountRef.current) {
      // On initial mount, fetch after a short delay to ensure everything is set up
      const timer = setTimeout(() => {
        if (!isFetchingRef.current && fetchJudgmentsRef.current) {
          fetchJudgmentsRef.current(false);
        }
      }, 100);
      isInitialMountRef.current = false;
      return () => clearTimeout(timer);
    } else {
      // On court type change, reset fetching state and fetch immediately
      isFetchingRef.current = false;
      setLoading(true);
      setError(null);
      // Use setTimeout to ensure state updates are processed
      const timer = setTimeout(() => {
        if (fetchJudgmentsRef.current) {
          fetchJudgmentsRef.current(false);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [courtType]);

  // Custom infinite scroll using window scroll events
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingRef = useRef(null);
  const infiniteScrollTimeoutRef = useRef(null);

  const loadMoreData = useCallback(() => {
    if (fetchJudgmentsRef.current && hasMore && !loading && !isSearching && !isLoadingMore) {
      setIsLoadingMore(true);
      fetchJudgmentsRef.current(true).finally(() => {
        setIsLoadingMore(false);
      });
    }
  }, [hasMore, loading, isSearching, isLoadingMore]);

  // Window scroll event handler for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (infiniteScrollTimeoutRef.current) {
        clearTimeout(infiniteScrollTimeoutRef.current);
      }

      infiniteScrollTimeoutRef.current = setTimeout(() => {
        if (!hasMore || loading || isSearching || isLoadingMore) return;

        // Calculate if user is near bottom (within 500px)
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        // Check if user is within 500px of bottom
        if (scrollTop + windowHeight >= documentHeight - 500) {
          loadMoreData();
        }
      }, 200); // Throttle scroll events
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (infiniteScrollTimeoutRef.current) {
        clearTimeout(infiniteScrollTimeoutRef.current);
      }
    };
  }, [hasMore, loading, isSearching, isLoadingMore, loadMoreData]);

  const viewJudgment = (judgment) => {
    const judgmentId = judgment.id || judgment.cnr;
    const url = judgmentId ? `/judgment/${judgmentId}` : '/judgment';
    navigate(url, { state: { judgment } });
  };

  // Scroll to top button - always visible
  useEffect(() => {
    // Always show the button
    setShowScrollToTop(true);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const courtTypeLabel = courtType === "supremecourt" ? "Supreme Court" : "High Court";
  const highCourts = [
    "All High Courts",
    "Allahabad High Court",
    "Bombay High Court",
    "Calcutta High Court",
    "Gauhati High Court",
    "High Court for State of Telangana",
    "High Court of Andhra Pradesh",
    "High Court of Chhattisgarh",
    "High Court of Delhi",
    "High Court of Gujarat",
    "High Court of Himachal Pradesh",
    "High Court of Jammu and Kashmir",
    "High Court of Jharkhand",
    "High Court of Karnataka",
    "High Court of Kerala",
    "High Court of Madhya Pradesh",
    "High Court of Manipur",
    "High Court of Meghalaya",
    "High Court of Orissa",
    "High Court of Punjab and Haryana",
    "High Court of Rajasthan",
    "High Court of Sikkim",
    "High Court of Tripura",
    "High Court of Uttarakhand",
    "Madras High Court",
    "Patna High Court",
  ];

  return (
    <div className="min-h-screen animate-fade-in-up overflow-x-hidden" style={{ backgroundColor: '#F9FAFC' }}>
      <Navbar />
      
      {/* Enhanced Header Section */}
      <div className="bg-white border-b border-gray-200 pt-14 sm:pt-16 md:pt-20 animate-slide-in-bottom w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 lg:py-12 w-full">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 animate-fade-in-up" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
              Legal Judgments
            </h1>
            <div className="w-12 sm:w-16 md:w-20 h-0.5 sm:h-1 mx-auto mb-3 sm:mb-4 md:mb-6 animate-fade-in-up" style={{ backgroundColor: '#CF9B63', animationDelay: '0.2s' }}></div>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg max-w-3xl mx-auto px-2 sm:px-4 animate-fade-in-up" style={{ color: '#8C969F', fontFamily: 'Roboto, sans-serif', animationDelay: '0.4s' }}>
              Search and access legal judgments from High Courts and Supreme Court of India
            </p>
          </div>
        </div>
      </div>

      <div className="px-2 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 w-full max-w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full">

          {/* Enhanced Search and Filter Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 lg:p-8 mb-4 sm:mb-6 md:mb-8 w-full max-w-full overflow-x-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold animate-fade-in-up" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                Search {courtTypeLabel} Judgments
              </h2>
              
              {/* Toggle Button */}
              <div className="relative inline-flex items-center bg-gray-100 rounded-xl p-0.5 sm:p-1 shadow-inner w-full sm:w-auto">
                {/* Sliding background indicator */}
                <motion.div
                  className="absolute top-0.5 sm:top-1 bottom-0.5 sm:bottom-1 rounded-lg z-0"
                  initial={false}
                  animate={{
                    left: courtType === 'highcourt' ? '2px' : 'calc(50% + 1px)',
                    backgroundColor: courtType === 'highcourt' ? '#1E65AD' : '#CF9B63',
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30 
                  }}
                  style={{
                    width: 'calc(50% - 2px)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  }}
                />
                
                <motion.button
                  onClick={() => setCourtType('highcourt')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 sm:flex-none px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 rounded-lg font-semibold transition-all duration-300 relative z-10 text-xs sm:text-sm md:text-base ${
                    courtType === 'highcourt'
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  style={{
                    fontFamily: 'Roboto, sans-serif',
                  }}
                >
                  High Court
                </motion.button>
                <motion.button
                  onClick={() => setCourtType('supremecourt')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 sm:flex-none px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 rounded-lg font-semibold transition-all duration-300 relative z-10 text-xs sm:text-sm md:text-base ${
                    courtType === 'supremecourt'
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  style={{
                    fontFamily: 'Roboto, sans-serif',
                  }}
                >
                  Supreme Court
                </motion.button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Search Judgments
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Search by case title, parties, judges..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !loading && !isFetchingRef.current) {
                        e.preventDefault();
                        applyFilters();
                      }
                    }}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-9 sm:pl-10 md:pl-12 pr-9 sm:pr-10 md:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm sm:text-base"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  />
                  <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <button
                    className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                    title="Voice Search"
                  >
                    <svg 
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>
                <motion.button
                  onClick={() => setShowFilters(!showFilters)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors font-medium text-sm sm:text-base whitespace-nowrap w-full sm:w-auto"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  <svg 
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>Filters</span>
                </motion.button>
              </div>
            </div>

            {/* Dynamic Filters Based on Court Type - Hidden by default, shown when showFilters is true */}
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="border-t border-gray-200 pt-4 sm:pt-6 mt-4 sm:mt-6 overflow-hidden"
                >
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                  Filter Options
                </h3>
            {courtType === "supremecourt" ? (
              /* Supreme Court Filters */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    Case Title
                  </label>
                  <input
                    type="text"
                    value={filters.title}
                    onChange={(e) => handleFilterChange('title', e.target.value)}
                    placeholder="e.g., State vs John Doe"
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    Judge Name
                  </label>
                  <input
                    type="text"
                    value={filters.judge}
                    onChange={(e) => handleFilterChange('judge', e.target.value)}
                    placeholder="e.g., Justice Singh"
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    Petitioner
                  </label>
                  <input
                    type="text"
                    value={filters.petitioner}
                    onChange={(e) => handleFilterChange('petitioner', e.target.value)}
                    placeholder="e.g., State of Maharashtra"
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    Respondent
                  </label>
                  <input
                    type="text"
                    value={filters.respondent}
                    onChange={(e) => handleFilterChange('respondent', e.target.value)}
                    placeholder="e.g., Union of India"
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  />
                </div>
              </div>
            ) : (
              /* High Court Filters */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    Case Title
                  </label>
                  <input
                    type="text"
                    value={filters.title}
                    onChange={(e) => handleFilterChange('title', e.target.value)}
                    placeholder="e.g., State vs John Doe"
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    Judge Name
                  </label>
                  <input
                    type="text"
                    value={filters.judge}
                    onChange={(e) => handleFilterChange('judge', e.target.value)}
                    placeholder="e.g., Justice Singh"
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
              {/* CNR Filter */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  CNR Number
                </label>
                <input
                  type="text"
                  value={filters.cnr}
                  onChange={(e) => handleFilterChange('cnr', e.target.value)}
                  placeholder={courtType === "supremecourt" ? "e.g., SC-123456-2023" : "e.g., HPHC010019512005"}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                />
              </div>

              {/* High Court Filter - Only for High Court */}
              {courtType === "highcourt" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    High Court
                  </label>
                  <select
                    value={filters.highCourt}
                    onChange={(e) => handleFilterChange('highCourt', e.target.value)}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    {highCourts.map((court) => (
                      <option key={court} value={court === "All High Courts" ? "" : court}>
                        {court}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Decision Date From */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Decision Date From
                </label>
                <input
                  type="date"
                  value={filters.decisionDateFrom}
                  onChange={(e) => handleFilterChange('decisionDateFrom', e.target.value)}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-4 border-t border-gray-200">
              <motion.button
                onClick={() => {
                  console.log('Apply Filters clicked. Current filters:', filters);
                  applyFilters();
                }}
                disabled={loading || isFetchingRef.current}
                whileHover={{ scale: loading || isFetchingRef.current ? 1 : 1.02 }}
                whileTap={{ scale: loading || isFetchingRef.current ? 1 : 0.98 }}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Apply Filters
                  </>
                )}
              </motion.button>
              
              <motion.button
                onClick={() => {
                  console.log('Clear Filters clicked');
                  handleClearFilters();
                }}
                disabled={loading || isFetchingRef.current}
                whileHover={{ scale: loading || isFetchingRef.current ? 1 : 1.02 }}
                whileTap={{ scale: loading || isFetchingRef.current ? 1 : 0.98 }}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 active:bg-gray-700 transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </motion.button>
            </div>

                {/* Active Filters Display */}
                {Object.values(filters).some(val => val && val.trim() !== '') && (
                  <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-xs sm:text-sm font-medium text-blue-800 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      Active Filters:
                    </h3>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {Object.entries(filters).map(([key, value]) => {
                        if (value && value.trim() !== '') {
                          return (
                            <span key={key} className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm bg-blue-100 text-blue-800 break-words">
                              {key === 'highCourt' ? 'Court' : key.charAt(0).toUpperCase() + key.slice(1)}: "{value}"
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Enhanced Results Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden"
          >
            <div className="flex flex-col gap-3 sm:gap-0 mb-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold animate-fade-in-up" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                  {Object.values(filters).some(val => val && val.trim() !== '') 
                    ? `Search Results - ${courtTypeLabel} Judgments` 
                    : `Latest ${courtTypeLabel} Judgments`}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {Object.values(filters).some(val => val && val.trim() !== '') 
                    ? `Showing ${courtTypeLabel.toLowerCase()} judgments matching your search criteria` 
                    : `Showing the most recent ${courtTypeLabel.toLowerCase()} judgments first`}
                </p>
              </div>
              <div className="text-left">
                <div className="flex flex-col items-start gap-1">
                  <span className="text-xs sm:text-sm font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    {judgments.length} {judgments.length === 1 ? 'Judgment' : 'Judgments'}
                  </span>
                  {hasMore && !loading && (
                    <span className="text-xs text-blue-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      More available
                    </span>
                  )}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="mb-3 sm:mb-4 md:mb-6 p-3 sm:p-4 md:p-5 bg-red-50 border-l-4 border-red-400 rounded-lg shadow-sm"
                >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start flex-1">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-red-800 font-semibold mb-1 text-sm sm:text-base" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Error Loading Judgments
                      </h4>
                      <p className="text-red-700 text-xs sm:text-sm break-words" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {error}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setError(null);
                      fetchJudgments(false);
                    }}
                    disabled={loading}
                    className="px-4 sm:px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-shrink-0 w-full sm:w-auto self-start sm:self-auto"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry
                  </button>
                </div>
              </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {loading && judgments.length === 0 ? (
                <motion.div
                  key="loading-skeletons"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <SkeletonGrid count={3} />
                </motion.div>
              ) : judgments.length === 0 && !error ? (
                <motion.div 
                  key="empty-state"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="text-center py-6 sm:py-8 md:py-12 lg:py-16 px-3 sm:px-4"
                >
                <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-3 sm:mb-4 md:mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-2 sm:mb-3 px-2" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                  No {courtTypeLabel.toLowerCase()} judgments found
                </h3>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto px-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {Object.values(filters).some(val => val && val.trim() !== '')
                    ? 'No judgments match your current search criteria. Try adjusting your filters or search terms.'
                    : `No ${courtTypeLabel.toLowerCase()} judgments are currently available. Please check back later.`}
                </p>
                {Object.values(filters).some(val => val && val.trim() !== '') && (
                  <button
                    onClick={clearFilters}
                    className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm md:text-base"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    Clear All Filters
                  </button>
                )}
                </motion.div>
              ) : (
                <div 
                  key="judgments-list-container"
                  className="relative"
                >
                  <motion.div 
                    className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                  <AnimatePresence mode="popLayout">
                    {judgments.map((judgment, index) => (
                    <div
                      key={judgment.cnr || judgment.id || `${courtType}-${index}`}
                    >
                      <div 
                        onClick={() => viewJudgment(judgment)}
                        className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer w-full max-w-full"
                      >
                        {/* Simple Card Header */}
                        <div className="px-3 sm:px-4 md:px-5 lg:px-6 py-3 sm:py-4 md:py-5 border-b border-gray-100">
                          <div className="flex items-start justify-between gap-2 sm:gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 
                                className="text-sm sm:text-base md:text-lg lg:text-xl font-bold mb-2 line-clamp-2" 
                                style={{ 
                                  color: '#1E65AD', 
                                  fontFamily: 'Helvetica Hebrew Bold, sans-serif',
                                  lineHeight: '1.4'
                                }}
                              >
                                {judgment.title || judgment.case_info || judgment.case_title || judgment.case_number || 'Untitled Judgment'}
                              </h3>
                              {index === 0 && judgments.length > 0 && !loading && (
                                <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 bg-green-100 text-green-700 rounded-md text-xs font-semibold">
                                  Latest
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Simple Card Body */}
                        <div className="px-3 sm:px-4 md:px-5 lg:px-6 py-3 sm:py-4 md:py-5">
                          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:gap-6">
                            {/* Left side - Details */}
                            <div className="flex-1 min-w-0">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
                                {(judgment.court_name || judgment.court) && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#1E65AD' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-500 mb-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>Court</p>
                                      <p className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Roboto, sans-serif' }}>{judgment.court_name || judgment.court}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {judgment.decision_date && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#CF9B63' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-500 mb-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>Decision Date</p>
                                      <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Roboto, sans-serif' }}>{judgment.decision_date}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {judgment.cnr && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#1E65AD' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-500 mb-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>CNR</p>
                                      <p className="text-sm font-medium text-gray-900 font-mono truncate" style={{ fontFamily: 'Roboto Mono, monospace' }}>{judgment.cnr}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {judgment.judge && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#CF9B63' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-500 mb-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>Judge</p>
                                      <p className="text-sm font-medium text-gray-900 line-clamp-1" style={{ fontFamily: 'Roboto, sans-serif' }}>{judgment.judge}</p>
                                    </div>
                                  </div>
                                )}

                                {judgment.petitioner && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#1E65AD' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-500 mb-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>Petitioner</p>
                                      <p className="text-sm font-medium text-gray-900 line-clamp-1" style={{ fontFamily: 'Roboto, sans-serif' }}>{judgment.petitioner}</p>
                                    </div>
                                  </div>
                                )}

                                {judgment.respondent && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#CF9B63' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-500 mb-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>Respondent</p>
                                      <p className="text-sm font-medium text-gray-900 line-clamp-1" style={{ fontFamily: 'Roboto, sans-serif' }}>{judgment.respondent}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right side - Button */}
                            <div className="flex-shrink-0 flex items-center justify-start sm:justify-end lg:items-start lg:pt-0 pt-2 sm:pt-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewJudgment(judgment);
                                }}
                                className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-colors duration-200 flex items-center justify-center gap-2 whitespace-nowrap hover:bg-blue-700"
                                style={{ 
                                  backgroundColor: '#1E65AD',
                                  color: '#FFFFFF',
                                  fontFamily: 'Roboto, sans-serif'
                                }}
                              >
                                <span>View Details</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </AnimatePresence>
                
                  {/* Custom Infinite Scroll Loader */}
                  {judgments.length > 0 && hasMore && (
                    <div 
                      ref={loadingRef} 
                      className="mt-8 py-8 flex items-center justify-center"
                      style={{ minHeight: '100px' }}
                    >
                      {isLoadingMore ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <p className="text-sm text-gray-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
                            Loading more judgments...
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
                          Scroll down to load more
                        </p>
                      )}
                    </div>
                  )}
                  {judgments.length > 0 && !hasMore && (
                    <div className="mt-8 py-8 text-center">
                      <p className="text-sm text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        No more judgments to load
                      </p>
                    </div>
                  )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={scrollToTop}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-2.5 sm:p-3 md:p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
            style={{ 
              fontFamily: 'Roboto, sans-serif',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Scroll to top"
          >
            <svg 
              className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 transform group-hover:-translate-y-1 transition-transform duration-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 10l7-7m0 0l7 7m-7-7v18" 
              />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

