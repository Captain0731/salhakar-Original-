import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/landing/Navbar";
import apiService from "../services/api";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { SkeletonGrid, SmoothTransitionWrapper } from "../components/EnhancedLoadingComponents";
import { InfiniteScrollLoader } from "../components/LoadingComponents";
import { useAuth } from "../contexts/AuthContext";

// Add custom CSS animations
const customStyles = `
  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slide-in-bottom {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in-up {
    animation: fade-in-up 0.6s ease-out forwards;
  }
  
  .animate-slide-in-bottom {
    animation: slide-in-bottom 0.6s ease-out forwards;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = customStyles;
  if (!document.getElementById('law-library-styles')) {
    styleSheet.id = 'law-library-styles';
    document.head.appendChild(styleSheet);
  }
}

export default function LawLibrary() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Check if user is authenticated
  const isUserAuthenticated = useMemo(() => {
    const token = localStorage.getItem('access_token') || 
                  localStorage.getItem('accessToken') || 
                  localStorage.getItem('token');
    const hasValidToken = !!token && token !== 'null' && token !== 'undefined';
    return isAuthenticated && hasValidToken;
  }, [isAuthenticated]);
  
  // Initialize activeSection from URL search params or default to "central"
  const getInitialSection = () => {
    const searchParams = new URLSearchParams(location.search);
    const section = searchParams.get('section');
    return (section === 'state' || section === 'central') ? section : 'central';
  };
  
  const [activeSection, setActiveSection] = useState(getInitialSection);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Initialize filters based on active section
  const getInitialFilters = (section) => {
    if (section === "central") {
      return {
        search: '',
        act_id: '',
        ministry: '',
        department: '',
        year: '',
        type: ''
      };
    } else {
      return {
        search: '',
        state: '',
        act_number: '',
        year: '',
        department: ''
      };
    }
  };

  const [filters, setFilters] = useState(getInitialFilters(getInitialSection()));
  const [acts, setActs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  // Highlights are now enabled by default when searching
  // Removed enableHighlights state - highlights are always on for searches
  const [searchInfo, setSearchInfo] = useState(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollTimeoutRef = useRef(null);
  
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const librarySections = [
    {
      id: "central",
      title: "Central Acts",
      path: "/central-acts",
      description: "Browse acts passed by the Parliament of India. Search through central legislation, regulations, and constitutional documents.",
      color: "#1E65AD",
    },
    {
      id: "state",
      title: "State Acts",
      path: "/state-acts",
      description: "Access acts and legislation from various state governments across India. Find state-specific laws and regulations.",
      color: "#CF9B63",
    }
  ];

  const activeSectionData = librarySections.find(s => s.id === activeSection) || librarySections[0];
  const sectionLabel = activeSectionData.title;

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (key === 'search') {
      setSearchQuery(value);
    }
  };

  const fetchActs = useCallback(async (loadMore = false, customFilters = null) => {
    if (isSearching && !loadMore) {
      return;
    }
    
    setIsSearching(true);
    setLoading(true);
    setError(null);
    
    try {
      const activeFilters = customFilters !== null ? customFilters : filtersRef.current;
      const currentOffset = loadMore ? (pagination?.offset || 0) + (pagination?.current_page_size || 0) : 0;
      
      // Build API parameters
      const params = {
        limit: 20,
        offset: currentOffset
      };

      // Central Acts specific filters
      if (activeSection === "central") {
        // For Central Acts: Use 'search' parameter for Elasticsearch full-text search
        // This searches PDF content, not just metadata
        if (activeFilters.search && typeof activeFilters.search === 'string' && activeFilters.search.trim()) {
          params.search = activeFilters.search.trim();
          // Always enable highlights when searching
          params.highlight = true;
        }
        
        if (activeFilters.act_id && typeof activeFilters.act_id === 'string' && activeFilters.act_id.trim()) {
          params.act_id = activeFilters.act_id.trim();
        }
        if (activeFilters.ministry && typeof activeFilters.ministry === 'string' && activeFilters.ministry.trim()) {
          params.ministry = activeFilters.ministry.trim();
        }
      } else {
        // State Acts: Use short_title for traditional search
        if (activeFilters.search && typeof activeFilters.search === 'string' && activeFilters.search.trim()) {
          params.short_title = activeFilters.search.trim();
        }
        
        // State Acts specific filters
        if (activeFilters.act_number && typeof activeFilters.act_number === 'string' && activeFilters.act_number.trim()) {
          params.act_number = activeFilters.act_number.trim();
        }
        if (activeFilters.state && typeof activeFilters.state === 'string' && activeFilters.state.trim()) {
          params.state = activeFilters.state.trim();
        }
      }
      
      // Common filters
      if (activeFilters.department && typeof activeFilters.department === 'string' && activeFilters.department.trim()) {
        params.department = activeFilters.department.trim();
      }
      
      if (activeFilters.year) {
        const yearValue = typeof activeFilters.year === 'string' ? activeFilters.year.trim() : String(activeFilters.year);
        if (yearValue) {
          const yearInt = parseInt(yearValue);
          if (!isNaN(yearInt) && yearInt > 0) {
            params.year = yearInt;
          }
        }
      }

      // Fetch data based on active section
      let data;
      if (activeSection === "central") {
        data = await apiService.getCentralActs(params);
      } else {
        data = await apiService.getStateActs(params);
      }

      if (!data || !data.data) {
        setActs([]);
        setError("No data received from the server");
        setPagination(null);
        setSearchInfo(null);
        return;
      }

      // Store search info if available (from Elasticsearch)
      if (data.search_info) {
        setSearchInfo(data.search_info);
      } else {
        setSearchInfo(null);
      }

      // For Elasticsearch results, don't sort by year (they're already sorted by relevance)
      // Only sort by year if not using Elasticsearch
      if (data.data && data.data.length > 0 && !data.search_info) {
        data.data = data.data.sort((a, b) => {
          const yearA = parseInt(a.year) || 0;
          const yearB = parseInt(b.year) || 0;
          return yearB - yearA;
        });
      }

      if (loadMore) {
        setActs(prev => [...prev, ...(data.data || [])]);
      } else {
        setActs(data.data || []);
      }

      setPagination(data.pagination_info || null);
      setTotalCount(data.pagination_info?.total_count || data.data?.length || 0);
      
    } catch (err) {
      console.error('Error fetching acts:', err);
      setError(err.message || "Failed to fetch acts. Please try again.");
      if (!loadMore) {
        setActs([]);
      }
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [activeSection, pagination, isSearching]);

  const fetchActsRef = useRef(fetchActs);
  useEffect(() => {
    fetchActsRef.current = fetchActs;
  }, [fetchActs]);

  const loadMoreData = useCallback(() => {
    if (fetchActsRef.current && pagination?.has_more && !loading && !isSearching) {
      fetchActsRef.current(true);
    }
  }, [pagination, loading, isSearching]);

  const { loadingRef, isLoadingMore, error: scrollError, retry } = useInfiniteScroll({
    fetchMore: loadMoreData,
    hasMore: pagination?.has_more || false,
    isLoading: loading || isSearching
  });

  const applyFilters = () => {
    setActs([]);
    setPagination(null);
    setError(null);
    setSearchInfo(null);
    // Reset offset when applying new filters
    const currentFilters = filtersRef.current;
    setTimeout(() => {
      fetchActs(false, currentFilters);
    }, 100);
  };
  
  // Highlights are now always enabled for searches, so no need for this effect
  
  // Auto-apply filters when they change (with debounce) - but only for non-search filters
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only auto-apply if filters panel is visible and filters have values
      const hasActiveFilters = Object.entries(filtersRef.current).some(([key, value]) => {
        if (key === 'search') return false; // Don't auto-apply search
        if (!value) return false;
        if (typeof value === 'string') return value.trim() !== '';
        if (typeof value === 'number') return value !== 0;
        return value !== '';
      });
      
      if (hasActiveFilters && showFilters) {
        applyFilters();
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timeoutId);
  }, [filters, showFilters]);

  const clearFilters = () => {
    const emptyFilters = getInitialFilters(activeSection);
    setFilters(emptyFilters);
    setSearchQuery('');
    setActs([]);
    setPagination(null);
    setError(null);
    setSearchInfo(null);
    setTimeout(() => {
      fetchActs(false, emptyFilters);
    }, 100);
  };

  const viewActDetails = (act) => {
    navigate('/act-details', { state: { act } });
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

  const ministries = [
    "Ministry of Home Affairs",
    "Ministry of Law and Justice",
    "Ministry of Corporate Affairs",
    "Ministry of Consumer Affairs",
    "Ministry of Personnel, Public Grievances and Pensions",
    "Ministry of Road Transport and Highways",
    "Ministry of Finance",
    "Ministry of Health and Family Welfare"
  ];

  const states = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Delhi"
  ];

  const types = ["Central Act", "State Act", "Constitutional Document", "Ordinance", "Rule", "Regulation"];
  const years = Array.from({ length: 225 }, (_, i) => new Date().getFullYear() - i);

  // Initial load - ensure URL has section parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (!searchParams.get('section')) {
      // If no section in URL, add it based on current activeSection
      navigate(`${location.pathname}?section=${activeSection}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Initial load
  useEffect(() => {
    if (!loading && acts.length === 0 && !isSearching) {
      fetchActs(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Sync activeSection with URL on mount and when URL changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sectionFromUrl = searchParams.get('section');
    const newSection = (sectionFromUrl === 'state' || sectionFromUrl === 'central') ? sectionFromUrl : 'central';
    
    if (newSection !== activeSection) {
      setActiveSection(newSection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Reload data when section changes
  useEffect(() => {
    setActs([]);
    setPagination(null);
    setError(null);
    setSearchInfo(null);
    // Highlights are always enabled for searches, no reset needed
    const emptyFilters = getInitialFilters(activeSection);
    setFilters(emptyFilters);
    setSearchQuery('');
    if (fetchActsRef.current) {
      setTimeout(() => {
        fetchActsRef.current(false, emptyFilters);
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]); // Reload when section changes

  return (
    <div className="min-h-screen animate-fade-in-up overflow-x-hidden" style={{ backgroundColor: '#F9FAFC' }}>
      <Navbar />
      
      {/* Enhanced Header Section */}
      <div className="bg-white border-b border-gray-200 pt-14 sm:pt-16 md:pt-20 animate-slide-in-bottom w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 lg:py-12 w-full">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 animate-fade-in-up" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
              Law Library
            </h1>
            <div className="w-12 sm:w-16 md:w-20 h-0.5 sm:h-1 mx-auto mb-3 sm:mb-4 md:mb-6 animate-fade-in-up" style={{ backgroundColor: '#CF9B63', animationDelay: '0.2s' }}></div>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg max-w-3xl mx-auto px-2 sm:px-4 animate-fade-in-up" style={{ color: '#8C969F', fontFamily: 'Roboto, sans-serif', animationDelay: '0.4s' }}>
              Your comprehensive resource for accessing legal acts, regulations, and legislative documents from across India
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
                Search {sectionLabel}
              </h2>
              
              {/* Toggle Button */}
              <div className="relative inline-flex items-center bg-gray-100 rounded-xl p-0.5 sm:p-1 shadow-inner w-full sm:w-auto">
                {/* Sliding background indicator */}
                <motion.div
                  className="absolute top-1 bottom-1 rounded-lg z-0"
                  initial={false}
                  animate={{
                    left: activeSection === 'central' ? '4px' : 'calc(50% + 2px)',
                    backgroundColor: activeSection === 'central' ? '#1E65AD' : '#CF9B63',
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30 
                  }}
                  style={{
                    width: 'calc(50% - 4px)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  }}
                />
                
                <motion.button
                  onClick={() => {
                    setActiveSection('central');
                    // Update URL without page reload
                    navigate(`${location.pathname}?section=central`, { replace: true });
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 sm:flex-none px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 rounded-lg font-semibold transition-all duration-300 relative z-10 text-xs sm:text-sm md:text-base ${
                    activeSection === 'central'
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  style={{
                    fontFamily: 'Roboto, sans-serif',
                  }}
                >
                  Central Acts
                </motion.button>
                <motion.button
                  onClick={() => {
                    setActiveSection('state');
                    // Update URL without page reload
                    navigate(`${location.pathname}?section=state`, { replace: true });
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 sm:flex-none px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 rounded-lg font-semibold transition-all duration-300 relative z-10 text-xs sm:text-sm md:text-base ${
                    activeSection === 'state'
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  style={{
                    fontFamily: 'Roboto, sans-serif',
                  }}
                >
                  State Acts
                </motion.button>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Search {sectionLabel}
                {activeSection === "central" && (
                  <span className="block sm:inline sm:ml-2 text-xs text-blue-600 font-normal mt-1 sm:mt-0">
                    (Full-text search in PDF content)
                  </span>
                )}
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder={activeSection === "central" 
                    ? "Search in PDF content (e.g., 'Section 302', 'murder', 'penalty')..." 
                    : `Search ${sectionLabel.toLowerCase()}...`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) {
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
              
              {/* Highlights are now enabled by default for all searches - no checkbox needed */}
            </div>

            {/* Dynamic Filters - Hidden by default, shown when showFilters is true */}
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
                
                {activeSection === "central" ? (
                  /* Central Acts Filters */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                    {/* Act ID Filter */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Act ID
                      </label>
                      <input
                        type="text"
                        value={filters.act_id || ''}
                        onChange={(e) => handleFilterChange('act_id', e.target.value)}
                        placeholder="e.g., 186901"
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                      />
                    </div>

                    {/* Ministry Filter */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Ministry
                      </label>
                      <select
                        value={filters.ministry || ''}
                        onChange={(e) => handleFilterChange('ministry', e.target.value)}
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                      >
                        <option value="">All Ministries</option>
                        {ministries.map((ministry) => (
                          <option key={ministry} value={ministry}>
                            {ministry}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Department Filter */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Department
                      </label>
                      <input
                        type="text"
                        value={filters.department || ''}
                        onChange={(e) => handleFilterChange('department', e.target.value)}
                        placeholder="e.g., Legislative Department"
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                      />
                    </div>

                    {/* Year Filter */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Year
                      </label>
                      <select
                        value={filters.year || ''}
                        onChange={(e) => handleFilterChange('year', e.target.value)}
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                      >
                        <option value="">All Years</option>
                        {years.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    {/* Type Filter */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Type
                      </label>
                      <select
                        value={filters.type || ''}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                      >
                        <option value="">All Types</option>
                        {types.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  /* State Acts Filters */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                    {/* State Filter */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        State
                      </label>
                      <select
                        value={filters.state || ''}
                        onChange={(e) => handleFilterChange('state', e.target.value)}
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                      >
                        <option value="">All States</option>
                        {states.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Act Number Filter */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Act Number
                      </label>
                      <input
                        type="text"
                        value={filters.act_number || ''}
                        onChange={(e) => handleFilterChange('act_number', e.target.value)}
                        placeholder="e.g., Act 12 of 2023"
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                      />
                    </div>

                    {/* Department Filter */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Department
                      </label>
                      <input
                        type="text"
                        value={filters.department || ''}
                        onChange={(e) => handleFilterChange('department', e.target.value)}
                        placeholder="e.g., Legislative Department"
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                      />
                    </div>

                    {/* Year Filter */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Year
                      </label>
                      <select
                        value={filters.year || ''}
                        onChange={(e) => handleFilterChange('year', e.target.value)}
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                      >
                        <option value="">All Years</option>
                        {years.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Filter Actions */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                  <motion.button
                    onClick={applyFilters}
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
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
                    onClick={clearFilters}
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 active:bg-gray-700 transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Filters
                  </motion.button>
                </div>

                {/* Active Filters Display */}
                {Object.values(filters).some(val => {
                  if (!val) return false;
                  if (typeof val === 'string') return val.trim() !== '';
                  if (typeof val === 'number') return val !== 0;
                  return val !== '';
                }) && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <h3 className="text-sm font-medium text-blue-800 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      Active Filters:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(filters).map(([key, value]) => {
                        const hasValue = value && (
                          typeof value === 'string' ? value.trim() !== '' :
                          typeof value === 'number' ? value !== 0 :
                          value !== ''
                        );
                        if (!hasValue) return null;
                        
                        let label = key;
                        if (key === 'act_id') label = 'Act ID';
                        else if (key === 'act_number') label = 'Act Number';
                        else label = key.charAt(0).toUpperCase() + key.slice(1);
                        
                        return (
                          <span key={key} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                            {label}: "{value}"
                          </span>
                        );
                      })}
                    </div>
                  </motion.div>
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
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex-1">
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold animate-fade-in-up" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                  {Object.values(filters).some(val => {
                    if (!val) return false;
                    if (typeof val === 'string') return val.trim() !== '';
                    if (typeof val === 'number') return val !== 0;
                    return val !== '';
                  }) 
                    ? `Search Results - ${sectionLabel}` 
                    : `Latest ${sectionLabel}`}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {searchInfo ? (
                    <>
                      Found {searchInfo.total_matches} {searchInfo.total_matches === 1 ? 'match' : 'matches'} using {searchInfo.search_engine}
                      {searchInfo.took_ms && ` (${searchInfo.took_ms}ms)`}
                    </>
                  ) : Object.values(filters).some(val => {
                    if (!val) return false;
                    if (typeof val === 'string') return val.trim() !== '';
                    if (typeof val === 'number') return val !== 0;
                    return val !== '';
                  }) 
                    ? `Showing ${sectionLabel.toLowerCase()} matching your search criteria` 
                    : `Showing the most recent ${sectionLabel.toLowerCase()} first`}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="flex flex-col items-start sm:items-end gap-1">
                  <span className="text-xs sm:text-sm font-medium text-gray-700" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    {acts.length} {acts.length === 1 ? 'Act' : 'Acts'}
                  </span>
                  {pagination?.has_more && !loading && (
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
                  className="mb-6 p-5 bg-red-50 border-l-4 border-red-400 rounded-lg shadow-sm"
                >
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <svg className="w-6 h-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h4 className="text-red-800 font-semibold mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Error Loading {sectionLabel}
                      </h4>
                      <p className="text-red-700 text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {error}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setError(null);
                      fetchActs(false);
                    }}
                    disabled={loading}
                    className="ml-4 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
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

            {loading && acts.length === 0 ? (
              <SkeletonGrid count={3} />
            ) : acts.length === 0 && !error ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center py-16"
              >
                <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                  No {sectionLabel.toLowerCase()} found
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {Object.values(filters).some(val => {
                    if (!val) return false;
                    if (typeof val === 'string') return val.trim() !== '';
                    if (typeof val === 'number') return val !== 0;
                    return val !== '';
                  })
                    ? 'No acts match your current search criteria. Try adjusting your filters or search terms.'
                    : `No ${sectionLabel.toLowerCase()} are currently available. Please check back later.`}
                </p>
                {Object.values(filters).some(val => {
                  if (!val) return false;
                  if (typeof val === 'string') return val.trim() !== '';
                  if (typeof val === 'number') return val !== 0;
                  return val !== '';
                }) && (
                  <button
                    onClick={clearFilters}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    Clear All Filters
                  </button>
                )}
              </motion.div>
            ) : (
              <div 
                key="acts-list-container"
                className="relative"
              >
                <div className="space-y-5 sm:space-y-6">
                  <AnimatePresence mode="wait">
                    {acts.map((act, index) => (
                    <motion.div
                      key={act.id || act.act_id || `act-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ 
                        duration: 0.3, 
                        delay: index * 0.03,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                    >
                      <div 
                        onClick={() => viewActDetails(act)}
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
                                {/* Display highlighted title if available */}
                                {act.highlights && act.highlights.short_title ? (
                                  <span dangerouslySetInnerHTML={{ __html: act.highlights.short_title[0] }} />
                                ) : (
                                  act.short_title || act.long_title || 'Untitled Act'
                                )}
                              </h3>
                              {index === 0 && !loading && !searchInfo && (
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
                                {act.year && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#CF9B63' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-500 mb-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>Year</p>
                                      <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Roboto, sans-serif' }}>{act.year}</p>
                                    </div>
                                  </div>
                                )}

                                {act.ministry && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#1E65AD' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-500 mb-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>Ministry</p>
                                      <p className="text-sm font-medium text-gray-900 line-clamp-1" style={{ fontFamily: 'Roboto, sans-serif' }}>{act.ministry}</p>
                                    </div>
                                  </div>
                                )}

                                {act.department && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#1E65AD' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-500 mb-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>Department</p>
                                      <p className="text-sm font-medium text-gray-900 line-clamp-1" style={{ fontFamily: 'Roboto, sans-serif' }}>{act.department}</p>
                                    </div>
                                  </div>
                                )}

                                {act.act_id && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#1E65AD' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-500 mb-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>Act ID</p>
                                      <p className="text-sm font-medium text-gray-900 font-mono truncate" style={{ fontFamily: 'Roboto Mono, monospace' }}>{act.act_id}</p>
                                    </div>
                                  </div>
                                )}

                                {act.act_number && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#CF9B63' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-500 mb-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>Act Number</p>
                                      <p className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Roboto, sans-serif' }}>{act.act_number}</p>
                                    </div>
                                  </div>
                                )}

                                {act.state && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#CF9B63' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-gray-500 mb-0.5" style={{ fontFamily: 'Roboto, sans-serif' }}>State</p>
                                      <p className="text-sm font-medium text-gray-900 line-clamp-1" style={{ fontFamily: 'Roboto, sans-serif' }}>{act.state}</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Long Title / Description */}
                              {act.long_title && act.long_title !== act.short_title && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1.5" style={{ fontFamily: 'Roboto, sans-serif' }}>Description</p>
                                  <p className="text-sm text-gray-700 line-clamp-2" style={{ fontFamily: 'Roboto, sans-serif' }}>{act.long_title}</p>
                                </div>
                              )}

                              {/* Display search highlights if available */}
                              {act.highlights && act.highlights.content && act.highlights.content.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                  <p className="text-xs text-gray-500 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>Search Matches</p>
                                  <div className="space-y-2">
                                    {act.highlights.content.map((fragment, idx) => (
                                      <p 
                                        key={idx} 
                                        className="text-sm text-gray-700 line-clamp-2" 
                                        style={{ fontFamily: 'Roboto, sans-serif' }}
                                        dangerouslySetInnerHTML={{ __html: fragment }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Right side - Button */}
                            <div className="flex-shrink-0 flex items-center justify-start sm:justify-end lg:items-start lg:pt-0 pt-2 sm:pt-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  viewActDetails(act);
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
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
            
            {/* Infinite Scroll Loader */}
            {acts.length > 0 && (
              <div ref={loadingRef} className="mt-6">
                <InfiniteScrollLoader 
                  isLoading={isLoadingMore} 
                  hasMore={pagination?.has_more || false} 
                  error={scrollError} 
                  onRetry={retry} 
                />
              </div>
            )}
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
