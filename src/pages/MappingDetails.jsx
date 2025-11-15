import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/landing/Navbar";
import apiService from "../services/api";
import BookmarkButton from "../components/BookmarkButton";
import SummaryPopup from "../components/SummaryPopup";
import { useAuth } from "../contexts/AuthContext";
import { FileText, StickyNote, Share2, X } from "lucide-react";

export default function MappingDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Additional check to ensure token exists - memoized to update when token changes
  const isUserAuthenticated = useMemo(() => {
    const token = localStorage.getItem('access_token') || 
                  localStorage.getItem('accessToken') || 
                  localStorage.getItem('token');
    const hasValidToken = !!token && token !== 'null' && token !== 'undefined';
    return isAuthenticated && hasValidToken;
  }, [isAuthenticated]);
  
  const [mapping, setMapping] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotesPopup, setShowNotesPopup] = useState(false);
  const [notesContent, setNotesContent] = useState("");
  const [notesFolders, setNotesFolders] = useState([{ id: 'default', name: 'Default', content: '' }]);
  const [activeFolderId, setActiveFolderId] = useState('default');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [popupPosition, setPopupPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [popupSize, setPopupSize] = useState({ width: 500, height: 400 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [saveButtonText, setSaveButtonText] = useState('Save Notes');
  const [saveButtonColor, setSaveButtonColor] = useState('');
  
  // Summary popup state
  const [summaryPopupOpen, setSummaryPopupOpen] = useState(false);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Get mapping data from location state
    if (location.state?.mapping) {
      setMapping(location.state.mapping);
      setLoading(false);
    } else {
      // If no mapping data, redirect back to law-mapping page
      navigate('/law-mapping');
    }
  }, [location.state, navigate]);

  // Load saved notes from localStorage when mapping changes
  useEffect(() => {
    if (mapping && mapping.id) {
      const notesKey = `notes_mapping_${mapping.id}`;
      const savedNotes = localStorage.getItem(notesKey);
      if (savedNotes) {
        try {
          const parsedFolders = JSON.parse(savedNotes);
          if (parsedFolders && Array.isArray(parsedFolders) && parsedFolders.length > 0) {
            setNotesFolders(parsedFolders);
            setActiveFolderId(parsedFolders[0].id);
            setNotesContent(parsedFolders[0].content || '');
          }
        } catch (error) {
          console.error('Error loading saved notes:', error);
        }
      }
    }
  }, [mapping?.id]);

  // Handle window resize to keep popup within bounds
  useEffect(() => {
    const handleResize = () => {
      if (showNotesPopup) {
        const maxX = window.innerWidth - popupSize.width;
        const maxY = window.innerHeight - popupSize.height;
        
        // Adjust popup size if it exceeds viewport
        setPopupSize(prev => ({
          width: Math.min(prev.width, window.innerWidth * 0.9),
          height: Math.min(prev.height, window.innerHeight * 0.9)
        }));
        
        setPopupPosition(prev => ({
          x: Math.max(0, Math.min(prev.x, maxX)),
          y: Math.max(0, Math.min(prev.y, maxY))
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showNotesPopup, popupSize]);

  // Determine mapping type from the mapping data
  const getMappingType = () => {
    if (!mapping) return 'bns_ipc'; // default if mapping not loaded yet
    if (mapping.mapping_type) {
      return mapping.mapping_type;
    }
    // Try to determine from section fields
    if (mapping.ipc_section || mapping.bns_section) return 'bns_ipc';
    if (mapping.iea_section || mapping.bsa_section) return 'bsa_iea';
    if (mapping.crpc_section || mapping.bnss_section) return 'bnss_crpc';
    return 'bns_ipc'; // default
  };

  const goBack = () => {
    // Navigate back to law-mapping page with the correct mapping type
    if (mapping) {
      const mappingType = getMappingType();
      navigate(`/law-mapping?type=${mappingType}`);
    } else {
      navigate('/law-mapping');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F9FAFC' }}>
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">Loading mapping details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F9FAFC' }}>
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-500 text-lg">{error}</p>
            <button
              onClick={goBack}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!mapping) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F9FAFC' }}>
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-500 text-lg">No mapping data available</p>
            <button
              onClick={goBack}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use the getMappingType function defined earlier, but only if mapping exists
  const mappingType = mapping ? getMappingType() : 'bns_ipc';

  // Get section numbers based on mapping type
  const getSourceSection = () => {
    if (mappingType === 'bns_ipc') {
      return mapping.ipc_section || mapping.source_section;
    } else if (mappingType === 'bsa_iea') {
      return mapping.iea_section || mapping.source_section;
    } else {
      return mapping.crpc_section || mapping.source_section;
    }
  };
  
  const getTargetSection = () => {
    if (mappingType === 'bns_ipc') {
      return mapping.bns_section || mapping.target_section;
    } else if (mappingType === 'bsa_iea') {
      return mapping.bsa_section || mapping.target_section;
    } else {
      return mapping.bnss_section || mapping.target_section;
    }
  };

  const sourceSection = getSourceSection();
  const targetSection = getTargetSection();
  const subject = mapping.subject || mapping.title || 'Mapping';
  const summary = mapping.summary || mapping.description || mapping.source_description || '';

  // Get labels and colors based on mapping type
  const getMappingInfo = () => {
    if (mappingType === 'bns_ipc') {
      return {
        title: 'IPC ↔ BNS Mapping',
        sourceLabel: 'IPC Section',
        targetLabel: 'BNS Section',
        sourceAct: 'Indian Penal Code, 1860',
        targetAct: 'Bharatiya Nyaya Sanhita, 2023',
        sourceColor: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
        targetColor: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' }
      };
    } else if (mappingType === 'bsa_iea') {
      return {
        title: 'IEA ↔ BSA Mapping',
        sourceLabel: 'IEA Section',
        targetLabel: 'BSA Section',
        sourceAct: 'Indian Evidence Act, 1872',
        targetAct: 'Bharatiya Sakshya Adhiniyam, 2023',
        sourceColor: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
        targetColor: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' }
      };
    } else {
      return {
        title: 'CrPC ↔ BNSS Mapping',
        sourceLabel: 'CrPC Section',
        targetLabel: 'BNSS Section',
        sourceAct: 'Code of Criminal Procedure, 1973',
        targetAct: 'Bharatiya Nagarik Suraksha Sanhita, 2023',
        sourceColor: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
        targetColor: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' }
      };
    }
  };

  const mappingInfo = getMappingInfo();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFC' }}>
      <Navbar />
      <div className="pt-16 sm:pt-20">
        <div className="flex-1 p-2 sm:p-3 md:p-4 lg:p-6" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <div className="max-w-7xl mx-auto h-full">
            <div className="space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-6">
              
              {/* Header Section */}
              <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 p-2 sm:p-3 md:p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold break-words" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                        {mappingInfo.title}
                      </h1>
                      {mapping && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              const url = window.location.href;
                              navigator.clipboard.writeText(url).then(() => {
                                alert('Link copied to clipboard!');
                              }).catch(() => {
                                alert('Failed to copy link');
                              });
                            }}
                            className="p-1.5 sm:p-2 rounded-lg transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                            style={{ 
                              backgroundColor: '#1E65AD',
                              color: '#FFFFFF'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#1a5a9a';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#1E65AD';
                            }}
                            title="Share"
                          >
                            <Share2 className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#FFFFFF' }} />
                          </button>
                          <BookmarkButton
                            item={mapping}
                            type={
                              mappingType === 'bns_ipc' ? 'bns_ipc_mapping' : 
                              mappingType === 'bsa_iea' ? 'bsa_iea_mapping' : 
                              mappingType === 'bnss_crpc' ? 'bnss_crpc_mapping' : 
                              'bns_ipc_mapping'
                            }
                            size="small"
                            showText={false}
                          />
                        </div>
                      )}
                    </div>
                    <div className="w-12 sm:w-16 h-1 bg-gradient-to-r mt-2 sm:mt-3" style={{ background: 'linear-gradient(90deg, #1E65AD 0%, #CF9B63 100%)' }}></div>
                  </div>
                  <button
                    onClick={goBack}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium text-xs sm:text-sm md:text-base shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </button>
                </div>
              </div>

              {/* Toolbar - Search, Summary, Notes */}
              <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 p-2 sm:p-2.5 md:p-3 lg:p-4">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-1 min-w-[120px] sm:min-w-[200px]">
                    <img 
                      src="/uit3.GIF" 
                      alt="Search" 
                      className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 object-contain pointer-events-none z-10"
                    />
                    <input
                      type="text"
                      placeholder="Search With Kiki AI..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-xs sm:text-sm"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                          console.log('Searching for:', searchQuery);
                        }
                      }}
                    />
                  </div>
                  
                  {/* Action Buttons Container */}
                  <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2.5 flex-shrink-0 w-full sm:w-auto">
                    {/* Summary Button with Animation - Show in both Original and Translated views */}
                    <>
                      <style>{`
                          .summary-animated-button {
                            --h-button: 36px;
                            --w-button: 90px;
                            --round: 0.75rem;
                            cursor: pointer;
                            position: relative;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            overflow: hidden;
                            transition: all 0.25s ease;
                            background: radial-gradient(
                                65.28% 65.28% at 50% 100%,
                                rgba(207, 155, 99, 0.8) 0%,
                                rgba(207, 155, 99, 0) 100%
                              ),
                              linear-gradient(135deg, #1E65AD 0%, #CF9B63 100%);
                            border-radius: var(--round);
                            border: none;
                            outline: none;
                            padding: 6px 10px;
                            font-family: 'Roboto', sans-serif;
                            min-height: 32px;
                          }
                          @media (min-width: 640px) {
                            .summary-animated-button {
                              padding: 8px 14px;
                              min-height: 36px;
                            }
                          }
                          .summary-animated-button::before,
                          .summary-animated-button::after {
                            content: "";
                            position: absolute;
                            inset: var(--space);
                            transition: all 0.5s ease-in-out;
                            border-radius: calc(var(--round) - var(--space));
                            z-index: 0;
                          }
                          .summary-animated-button::before {
                            --space: 1px;
                            background: linear-gradient(
                              177.95deg,
                              rgba(255, 255, 255, 0.19) 0%,
                              rgba(255, 255, 255, 0) 100%
                            );
                          }
                          .summary-animated-button::after {
                            --space: 2px;
                            background: radial-gradient(
                                65.28% 65.28% at 50% 100%,
                                rgba(207, 155, 99, 0.8) 0%,
                                rgba(207, 155, 99, 0) 100%
                              ),
                              linear-gradient(135deg, #1E65AD 0%, #CF9B63 100%);
                          }
                          .summary-animated-button:active {
                            transform: scale(0.95);
                          }
                          .summary-points-wrapper {
                            overflow: hidden;
                            width: 100%;
                            height: 100%;
                            pointer-events: none;
                            position: absolute;
                            z-index: 1;
                          }
                          .summary-points-wrapper .summary-point {
                            bottom: -10px;
                            position: absolute;
                            animation: floating-points infinite ease-in-out;
                            pointer-events: none;
                            width: 2px;
                            height: 2px;
                            background-color: #fff;
                            border-radius: 9999px;
                          }
                          @keyframes floating-points {
                            0% {
                              transform: translateY(0);
                            }
                            85% {
                              opacity: 0;
                            }
                            100% {
                              transform: translateY(-55px);
                              opacity: 0;
                            }
                          }
                          .summary-points-wrapper .summary-point:nth-child(1) {
                            left: 10%;
                            opacity: 1;
                            animation-duration: 2.35s;
                            animation-delay: 0.2s;
                          }
                          .summary-points-wrapper .summary-point:nth-child(2) {
                            left: 30%;
                            opacity: 0.7;
                            animation-duration: 2.5s;
                            animation-delay: 0.5s;
                          }
                          .summary-points-wrapper .summary-point:nth-child(3) {
                            left: 25%;
                            opacity: 0.8;
                            animation-duration: 2.2s;
                            animation-delay: 0.1s;
                          }
                          .summary-points-wrapper .summary-point:nth-child(4) {
                            left: 44%;
                            opacity: 0.6;
                            animation-duration: 2.05s;
                          }
                          .summary-points-wrapper .summary-point:nth-child(5) {
                            left: 50%;
                            opacity: 1;
                            animation-duration: 1.9s;
                          }
                          .summary-points-wrapper .summary-point:nth-child(6) {
                            left: 75%;
                            opacity: 0.5;
                            animation-duration: 1.5s;
                            animation-delay: 1.5s;
                          }
                          .summary-points-wrapper .summary-point:nth-child(7) {
                            left: 88%;
                            opacity: 0.9;
                            animation-duration: 2.2s;
                            animation-delay: 0.2s;
                          }
                          .summary-points-wrapper .summary-point:nth-child(8) {
                            left: 58%;
                            opacity: 0.8;
                            animation-duration: 2.25s;
                            animation-delay: 0.2s;
                          }
                          .summary-points-wrapper .summary-point:nth-child(9) {
                            left: 98%;
                            opacity: 0.6;
                            animation-duration: 2.6s;
                            animation-delay: 0.1s;
                          }
                          .summary-points-wrapper .summary-point:nth-child(10) {
                            left: 65%;
                            opacity: 1;
                            animation-duration: 2.5s;
                            animation-delay: 0.2s;
                          }
                          .summary-inner {
                            z-index: 2;
                            gap: 6px;
                            position: relative;
                            width: 100%;
                            color: white;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 10px;
                            font-weight: 500;
                            line-height: 1.4;
                            transition: color 0.2s ease-in-out;
                            font-family: 'Roboto', sans-serif;
                          }
                          @media (min-width: 640px) {
                            .summary-inner {
                              font-size: 14px;
                            }
                          }
                          .summary-inner svg.summary-icon {
                            width: 12px;
                            height: 12px;
                            transition: fill 0.1s linear;
                          }
                          @media (min-width: 640px) {
                            .summary-inner svg.summary-icon {
                              width: 16px;
                              height: 16px;
                            }
                          }
                          .summary-animated-button:focus svg.summary-icon {
                            fill: white;
                          }
                          .summary-animated-button:hover svg.summary-icon {
                            fill: transparent;
                            animation:
                              dasharray 1s linear forwards,
                              filled 0.1s linear forwards 0.95s;
                          }
                          @keyframes dasharray {
                            from {
                              stroke-dasharray: 0 0 0 0;
                            }
                            to {
                              stroke-dasharray: 68 68 0 0;
                            }
                          }
                          @keyframes filled {
                            to {
                              fill: white;
                            }
                          }
                        `}</style>
                    <button
                          type="button"
                          className="summary-animated-button flex-1 sm:flex-none"
                      onClick={() => {
                            if (!isUserAuthenticated) {
                              navigate('/login');
                              return;
                            }
                            // Open summary popup
                        setSummaryPopupOpen(true);
                      }}
                      title="View Summary"
                    >
                          <div className="summary-points-wrapper">
                            <i className="summary-point"></i>
                            <i className="summary-point"></i>
                            <i className="summary-point"></i>
                            <i className="summary-point"></i>
                            <i className="summary-point"></i>
                            <i className="summary-point"></i>
                            <i className="summary-point"></i>
                            <i className="summary-point"></i>
                            <i className="summary-point"></i>
                            <i className="summary-point"></i>
                          </div>
                          <span className="summary-inner">
                            <svg
                              className="summary-icon"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.5"
                            >
                              <polyline points="13.18 1.37 13.18 9.64 21.45 9.64 10.82 22.63 10.82 14.36 2.55 14.36 13.18 1.37"></polyline>
                            </svg>
                            <span className="text-[10px] sm:text-xs md:text-base">Summary</span>
                          </span>
                    </button>
                    </>
                    
                    {/* Notes Button - Fake when not logged in, Real when logged in */}
                    <style>{`
                      .notes-animated-button {
                        --h-button: 36px;
                        --w-button: 90px;
                        --round: 0.75rem;
                        cursor: pointer;
                        position: relative;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        overflow: visible;
                        transition: all 0.25s ease;
                        background: radial-gradient(
                            65.28% 65.28% at 50% 100%,
                            rgba(207, 155, 99, 0.8) 0%,
                            rgba(207, 155, 99, 0) 100%
                          ),
                          linear-gradient(135deg, #1E65AD 0%, #CF9B63 100%);
                        border-radius: var(--round);
                        border: none;
                        outline: none;
                        padding: 6px 10px;
                        font-family: 'Roboto', sans-serif;
                        min-height: 32px;
                      }
                      @media (min-width: 640px) {
                        .notes-animated-button {
                          padding: 8px 14px;
                          min-height: 36px;
                        }
                      }
                      .notes-animated-button .notes-points-wrapper {
                        overflow: hidden;
                      }
                      .notes-animated-button::before,
                      .notes-animated-button::after {
                        content: "";
                        position: absolute;
                        inset: var(--space);
                        transition: all 0.5s ease-in-out;
                        border-radius: calc(var(--round) - var(--space));
                        z-index: 0;
                      }
                      .notes-animated-button::before {
                        --space: 1px;
                        background: linear-gradient(
                          177.95deg,
                          rgba(255, 255, 255, 0.19) 0%,
                          rgba(255, 255, 255, 0) 100%
                        );
                      }
                      .notes-animated-button::after {
                        --space: 2px;
                        background: radial-gradient(
                            65.28% 65.28% at 50% 100%,
                            rgba(207, 155, 99, 0.8) 0%,
                            rgba(207, 155, 99, 0) 100%
                          ),
                          linear-gradient(135deg, #1E65AD 0%, #CF9B63 100%);
                      }
                      .notes-animated-button:active {
                        transform: scale(0.95);
                      }
                      .notes-points-wrapper {
                        overflow: hidden;
                        width: 100%;
                        height: 100%;
                        pointer-events: none;
                        position: absolute;
                        z-index: 1;
                      }
                      .notes-points-wrapper .notes-point {
                        bottom: -10px;
                        position: absolute;
                        animation: floating-points-notes infinite ease-in-out;
                        pointer-events: none;
                        width: 2px;
                        height: 2px;
                        background-color: #fff;
                        border-radius: 9999px;
                      }
                      @keyframes floating-points-notes {
                        0% {
                          transform: translateY(0);
                        }
                        85% {
                          opacity: 0;
                        }
                        100% {
                          transform: translateY(-55px);
                          opacity: 0;
                        }
                      }
                      .notes-points-wrapper .notes-point:nth-child(1) {
                        left: 10%;
                        opacity: 1;
                        animation-duration: 2.35s;
                        animation-delay: 0.2s;
                      }
                      .notes-points-wrapper .notes-point:nth-child(2) {
                        left: 30%;
                        opacity: 0.7;
                        animation-duration: 2.5s;
                        animation-delay: 0.5s;
                      }
                      .notes-points-wrapper .notes-point:nth-child(3) {
                        left: 25%;
                        opacity: 0.8;
                        animation-duration: 2.2s;
                        animation-delay: 0.1s;
                      }
                      .notes-points-wrapper .notes-point:nth-child(4) {
                        left: 44%;
                        opacity: 0.6;
                        animation-duration: 2.05s;
                      }
                      .notes-points-wrapper .notes-point:nth-child(5) {
                        left: 50%;
                        opacity: 1;
                        animation-duration: 1.9s;
                      }
                      .notes-points-wrapper .notes-point:nth-child(6) {
                        left: 75%;
                        opacity: 0.5;
                        animation-duration: 1.5s;
                        animation-delay: 1.5s;
                      }
                      .notes-points-wrapper .notes-point:nth-child(7) {
                        left: 88%;
                        opacity: 0.9;
                        animation-duration: 2.2s;
                        animation-delay: 0.2s;
                      }
                      .notes-points-wrapper .notes-point:nth-child(8) {
                        left: 58%;
                        opacity: 0.8;
                        animation-duration: 2.25s;
                        animation-delay: 0.2s;
                      }
                      .notes-points-wrapper .notes-point:nth-child(9) {
                        left: 98%;
                        opacity: 0.6;
                        animation-duration: 2.6s;
                        animation-delay: 0.1s;
                      }
                      .notes-points-wrapper .notes-point:nth-child(10) {
                        left: 65%;
                        opacity: 1;
                        animation-duration: 2.5s;
                        animation-delay: 0.2s;
                      }
                      .notes-inner {
                        z-index: 2;
                        gap: 6px;
                        position: relative;
                        width: 100%;
                        color: white;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 10px;
                        font-weight: 500;
                        line-height: 1.4;
                        transition: color 0.2s ease-in-out;
                        font-family: 'Roboto', sans-serif;
                      }
                      @media (min-width: 640px) {
                        .notes-inner {
                          font-size: 14px;
                        }
                      }
                      .notes-inner svg.notes-icon {
                        width: 12px;
                        height: 12px;
                        transition: fill 0.1s linear;
                      }
                      @media (min-width: 640px) {
                        .notes-inner svg.notes-icon {
                          width: 16px;
                          height: 16px;
                        }
                      }
                      .notes-animated-button:focus svg.notes-icon {
                        fill: white;
                      }
                      .notes-animated-button:hover svg.notes-icon {
                        fill: transparent;
                        animation:
                          dasharray-notes 1s linear forwards,
                          filled-notes 0.1s linear forwards 0.95s;
                      }
                      @keyframes dasharray-notes {
                        from {
                          stroke-dasharray: 0 0 0 0;
                        }
                        to {
                          stroke-dasharray: 68 68 0 0;
                        }
                      }
                      @keyframes filled-notes {
                        to {
                          fill: white;
                        }
                      }
                    `}</style>
                    {isUserAuthenticated ? (
                      // Real Notes Button (when logged in)
                    <button
                        type="button"
                        className="notes-animated-button flex-1 sm:flex-none"
                      onClick={() => {
                        // Check if we have saved notes, if not initialize with default content
                        const notesKey = `notes_mapping_${mapping?.id || 'default'}`;
                        const savedNotes = localStorage.getItem(notesKey);
                        
                        if (!savedNotes) {
                          // Initialize notes content with mapping data for default folder
                          const initialContent = `# ${mapping?.subject || mapping?.title || 'Untitled Mapping Note'}\n\n${mapping?.summary || mapping?.description || 'No summary available.'}\n\n## Mapping Details\n\nSource: ${sourceSection || 'N/A'}\nTarget: ${targetSection || 'N/A'}\nType: ${mappingInfo.title}`;
                          
                          // Initialize folders if empty
                          if (notesFolders.length === 0 || (notesFolders.length === 1 && notesFolders[0].content === '')) {
                            setNotesFolders([{ id: 'default', name: 'Default', content: initialContent }]);
                            setActiveFolderId('default');
                            setNotesContent(initialContent);
                          }
                        } else {
                          // Load existing content
                          const currentFolder = notesFolders.find(f => f.id === activeFolderId);
                          setNotesContent(currentFolder?.content || '');
                        }
                        
                        setShowNotesPopup(true);
                      }}
                      title="Add Notes"
                    >
                        <div className="notes-points-wrapper">
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                        </div>
                        <span className="notes-inner">
                          <StickyNote className="notes-icon" style={{ width: '12px', height: '12px' }} />
                          <span className="text-[10px] sm:text-xs md:text-base">Notes</span>
                        </span>
                    </button>
                    ) : (
                      // Fake Notes Button (when not logged in - navigates to login)
                      <button
                        type="button"
                        className="notes-animated-button flex-1 sm:flex-none"
                        onClick={() => {
                          navigate('/login');
                        }}
                        title="Login to Add Notes"
                      >
                        <div className="notes-points-wrapper">
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                          <i className="notes-point"></i>
                        </div>
                        <span className="notes-inner">
                          <StickyNote className="notes-icon" style={{ width: '12px', height: '12px' }} />
                          <span className="text-[10px] sm:text-xs md:text-base">Notes</span>
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content - Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
                
                {/* Source Section Card */}
                <div className={`${mappingInfo.sourceColor.bg} rounded-lg sm:rounded-xl shadow-lg border-2 ${mappingInfo.sourceColor.border} p-3 sm:p-4 md:p-5 lg:p-6`}>
                  <div className="text-center mb-4 sm:mb-5 md:mb-6">
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                      {mappingInfo.sourceLabel}
                    </h3>
                    {sourceSection && (
                      <div className={`text-3xl sm:text-4xl md:text-5xl font-bold ${mappingInfo.sourceColor.text} mb-3 sm:mb-4`}>
                        {sourceSection}
                      </div>
                    )}
                    <div className="text-xs sm:text-sm text-gray-700 font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {mappingInfo.sourceAct}
                    </div>
                  </div>
                  
                  {/* Source Section Details */}
                  {mapping.ipc_description && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-300">
                      <h4 className="text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-gray-800">Section Description</h4>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {mapping.ipc_description}
                      </p>
                    </div>
                  )}
                  {mapping.iea_description && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-300">
                      <h4 className="text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-gray-800">Section Description</h4>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {mapping.iea_description}
                      </p>
                    </div>
                  )}
                  {mapping.crpc_description && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-300">
                      <h4 className="text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-gray-800">Section Description</h4>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {mapping.crpc_description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Target Section Card */}
                <div className={`${mappingInfo.targetColor.bg} rounded-lg sm:rounded-xl shadow-lg border-2 ${mappingInfo.targetColor.border} p-3 sm:p-4 md:p-5 lg:p-6`}>
                  <div className="text-center mb-4 sm:mb-5 md:mb-6">
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                      {mappingInfo.targetLabel}
                    </h3>
                    {targetSection && (
                      <div className={`text-3xl sm:text-4xl md:text-5xl font-bold ${mappingInfo.targetColor.text} mb-3 sm:mb-4`}>
                        {targetSection}
                      </div>
                    )}
                    <div className="text-xs sm:text-sm text-gray-700 font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {mappingInfo.targetAct}
                    </div>
                  </div>
                  
                  {/* Target Section Details */}
                  {mapping.bns_description && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-300">
                      <h4 className="text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-gray-800">Section Description</h4>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {mapping.bns_description}
                      </p>
                    </div>
                  )}
                  {mapping.bsa_description && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-300">
                      <h4 className="text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-gray-800">Section Description</h4>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {mapping.bsa_description}
                      </p>
                    </div>
                  )}
                  {mapping.bnss_description && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-300">
                      <h4 className="text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-gray-800">Section Description</h4>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {mapping.bnss_description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject and Summary Section */}
              <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6">
                <h3 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 break-words" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                  Subject: {subject}
                </h3>
                {summary && (
                  <div className="mt-3 sm:mt-4">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      Description
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {summary}
                    </p>
                  </div>
                )}
              </div>

              {/* All Mapping Data Section - Shows all fields from API */}
              <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6">
                <h3 className="text-base sm:text-lg md:text-xl font-bold mb-4 sm:mb-5 md:mb-6" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                  Complete Mapping Information
                </h3>
                
                {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> */}
                  {/* Left Column - Source Details */}
                  {/* <div className="space-y-4"> */}
                    {/* <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                      Source Section Details
                    </h4> */}
                    
                    {/* IPC Section Fields */}
                    {/* {mapping.ipc_section && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">IPC Section Number</h5>
                        <p className="text-sm text-gray-900 font-medium">{mapping.ipc_section}</p>
                      </div>
                    )}
                    {mapping.ipc_description && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">IPC Description</h5>
                        <p className="text-sm text-gray-600 leading-relaxed">{mapping.ipc_description}</p>
                      </div>
                    )} */}
                    
                    {/* IEA Section Fields */}
                    {/* {mapping.iea_section && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">IEA Section Number</h5>
                        <p className="text-sm text-gray-900 font-medium">{mapping.iea_section}</p>
                      </div>
                    )}
                    {mapping.iea_description && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">IEA Description</h5>
                        <p className="text-sm text-gray-600 leading-relaxed">{mapping.iea_description}</p>
                      </div>
                    )} */}
                    
                    {/* CrPC Section Fields */}
                    {/* {mapping.crpc_section && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">CrPC Section Number</h5>
                        <p className="text-sm text-gray-900 font-medium">{mapping.crpc_section}</p>
                      </div>
                    )}
                    {mapping.crpc_description && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">CrPC Description</h5>
                        <p className="text-sm text-gray-600 leading-relaxed">{mapping.crpc_description}</p>
                      </div>
                    )} */}
                    
                    {/* Generic Source Fields */}
                    {/* {mapping.source_section && !mapping.ipc_section && !mapping.iea_section && !mapping.crpc_section && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">Source Section</h5>
                        <p className="text-sm text-gray-900 font-medium">{mapping.source_section}</p>
                      </div>
                    )}
                    {mapping.source_description && !mapping.ipc_description && !mapping.iea_description && !mapping.crpc_description && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">Source Description</h5>
                        <p className="text-sm text-gray-600 leading-relaxed">{mapping.source_description}</p>
                      </div>
                    )} */}
                  {/* </div> */}

                  {/* Right Column - Target Details */}
                  {/* <div className="space-y-4"> */}
                    {/* <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                      Target Section Details
                    </h4> */}
                    
                    {/* BNS Section Fields */}
                    {/* {mapping.bns_section && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">BNS Section Number</h5>
                        <p className="text-sm text-gray-900 font-medium">{mapping.bns_section}</p>
                      </div>
                    )}
                    {mapping.bns_description && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">BNS Description</h5>
                        <p className="text-sm text-gray-600 leading-relaxed">{mapping.bns_description}</p>
                      </div>
                    )} */}
                    
                    {/* BSA Section Fields */}
                    {/* {mapping.bsa_section && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">BSA Section Number</h5>
                        <p className="text-sm text-gray-900 font-medium">{mapping.bsa_section}</p>
                      </div>
                    )}
                    {mapping.bsa_description && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">BSA Description</h5>
                        <p className="text-sm text-gray-600 leading-relaxed">{mapping.bsa_description}</p>
                      </div>
                    )} */}
                    
                    {/* BNSS Section Fields */}
                    {/* {mapping.bnss_section && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">BNSS Section Number</h5>
                        <p className="text-sm text-gray-900 font-medium">{mapping.bnss_section}</p>
                      </div>
                    )}
                    {mapping.bnss_description && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">BNSS Description</h5>
                        <p className="text-sm text-gray-600 leading-relaxed">{mapping.bnss_description}</p>
                      </div>
                    )} */}
                    
                    {/* Generic Target Fields */}
                    {/* {mapping.target_section && !mapping.bns_section && !mapping.bsa_section && !mapping.bnss_section && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">Target Section</h5>
                        <p className="text-sm text-gray-900 font-medium">{mapping.target_section}</p>
                      </div>
                    )}
                    {mapping.target_description && !mapping.bns_description && !mapping.bsa_description && !mapping.bnss_description && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">Target Description</h5>
                        <p className="text-sm text-gray-600 leading-relaxed">{mapping.target_description}</p>
                      </div>
                    )} */}
                  {/* </div> */}
                {/* </div> */}

                {/* Additional Fields Section */}
                <div>
                  {/* <h4 className="text-lg font-semibold text-gray-800 mb-4" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                    Additional Information
                  </h4> */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* {mapping.id && (
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-1">Mapping ID</h5>
                        <p className="text-sm text-gray-600">{mapping.id}</p>
                      </div>
                    )} */}
                    {mapping.mapping_type && (
                      <div>
                        <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Mapping Type</h5>
                        <p className="text-xs sm:text-sm text-gray-600">{mapping.mapping_type}</p>
                      </div>
                    )}
                    {mapping.title && mapping.title !== subject && (
                      <div>
                        <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Title</h5>
                        <p className="text-xs sm:text-sm text-gray-600 break-words">{mapping.title}</p>
                      </div>
                    )}
                    {mapping.description && mapping.description !== summary && (
                      <div>
                        <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Description</h5>
                        <p className="text-xs sm:text-sm text-gray-600 break-words">{mapping.description}</p>
                      </div>
                    )}
                    {mapping.notes && (
                      <div className="sm:col-span-2">
                        <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Notes</h5>
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed break-words">{mapping.notes}</p>
                      </div>
                    )}
                    {mapping.comments && (
                      <div className="sm:col-span-2">
                        <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Comments</h5>
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed break-words">{mapping.comments}</p>
                      </div>
                    )}
                    {mapping.remarks && (
                      <div className="sm:col-span-2">
                        <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Remarks</h5>
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed break-words">{mapping.remarks}</p>
                      </div>
                    )}
                    {mapping.created_at && (
                      <div>
                        <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Created At</h5>
                        <p className="text-xs sm:text-sm text-gray-600">{new Date(mapping.created_at).toLocaleString()}</p>
                      </div>
                    )}
                    {mapping.updated_at && (
                      <div>
                        <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">Updated At</h5>
                        <p className="text-xs sm:text-sm text-gray-600">{new Date(mapping.updated_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Display any other fields that might exist in the API response */}
                  {Object.keys(mapping).filter(key => 
                    !['id', 'subject', 'summary', 'title', 'description', 'mapping_type',
                      'ipc_section', 'bns_section', 'iea_section', 'bsa_section', 'crpc_section', 'bnss_section',
                      'ipc_description', 'bns_description', 'iea_description', 'bsa_description', 'crpc_description', 'bnss_description',
                      'source_section', 'target_section', 'source_description', 'target_description',
                      'notes', 'comments', 'remarks', 'created_at', 'updated_at'].includes(key)
                    && mapping[key] !== null && mapping[key] !== undefined && mapping[key] !== ''
                  ).length > 0 && (
                    <div >
                      <h4 className="text-lg font-semibold text-gray-800 mb-4" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                        Acts Details 
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        {Object.keys(mapping)
                          .filter(key => 
                            !['id', 'subject', 'summary', 'title', 'description', 'mapping_type',
                              'ipc_section', 'bns_section', 'iea_section', 'bsa_section', 'crpc_section', 'bnss_section',
                              'ipc_description', 'bns_description', 'iea_description', 'bsa_description', 'crpc_description', 'bnss_description',
                              'source_section', 'target_section', 'source_description', 'target_description',
                              'notes', 'comments', 'remarks', 'created_at', 'updated_at'].includes(key)
                            && mapping[key] !== null && mapping[key] !== undefined && mapping[key] !== ''
                          )
                          .map(key => (
                            <div key={key}>
                              <h5 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 capitalize">
                                {key.replace(/_/g, ' ')}
                              </h5>
                              <p className="text-xs sm:text-sm text-gray-600 break-words">
                                {typeof mapping[key] === 'object' ? JSON.stringify(mapping[key], null, 2) : String(mapping[key])}
                              </p>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={goBack}
                    className="flex-1 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium text-xs sm:text-sm md:text-base shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 sm:gap-2"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Mappings
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Notes Popup - Mobile Optimized */}
      {showNotesPopup && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
            onClick={() => setShowNotesPopup(false)}
          />
          
          {/* Popup - Mobile: Bottom Sheet, Desktop: Draggable */}
          <div
            className={`fixed bg-white shadow-2xl z-50 flex flex-col ${
              isMobile ? 'rounded-t-2xl sm:rounded-lg' : 'rounded-lg'
            }`}
            style={isMobile ? {
              left: '0',
              right: '0',
              bottom: '0',
              top: '10%',
              maxHeight: '90vh',
              minHeight: '400px',
              fontFamily: 'Roboto, sans-serif',
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)'
            } : {
              left: `${popupPosition.x}px`,
              top: `${popupPosition.y}px`,
              width: `${popupSize.width}px`,
              height: `${popupSize.height}px`,
              minWidth: '400px',
              minHeight: '300px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              fontFamily: 'Roboto, sans-serif',
              userSelect: isDragging || isResizing ? 'none' : 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={!isMobile ? (e) => {
              // Only start dragging if clicking on the header
              if (e.target.closest('.notes-popup-header')) {
                setIsDragging(true);
                const rect = e.currentTarget.getBoundingClientRect();
                setDragOffset({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top
                });
              }
            } : undefined}
            onMouseMove={!isMobile ? (e) => {
              if (isDragging) {
                const newX = e.clientX - dragOffset.x;
                const newY = e.clientY - dragOffset.y;
                
                // Constrain to viewport
                const maxX = window.innerWidth - popupSize.width;
                const maxY = window.innerHeight - popupSize.height;
                
                setPopupPosition({
                  x: Math.max(0, Math.min(newX, maxX)),
                  y: Math.max(0, Math.min(newY, maxY))
                });
              } else if (isResizing) {
                const deltaX = e.clientX - resizeStart.x;
                const deltaY = e.clientY - resizeStart.y;
                
                const newWidth = Math.max(400, Math.min(window.innerWidth * 0.9, resizeStart.width + deltaX));
                const newHeight = Math.max(300, Math.min(window.innerHeight * 0.9, resizeStart.height + deltaY));
                
                setPopupSize({
                  width: newWidth,
                  height: newHeight
                });
                
                // Adjust position if popup goes out of bounds
                const maxX = window.innerWidth - newWidth;
                const maxY = window.innerHeight - newHeight;
                setPopupPosition(prev => ({
                  x: Math.min(prev.x, maxX),
                  y: Math.min(prev.y, maxY)
                }));
              }
            } : undefined}
            onMouseUp={!isMobile ? () => {
              setIsDragging(false);
              setIsResizing(false);
            } : undefined}
            onMouseLeave={!isMobile ? () => {
              setIsDragging(false);
              setIsResizing(false);
            } : undefined}
          >
            {/* Header */}
            <div 
              className={`notes-popup-header flex items-center justify-between p-3 sm:p-4 border-b ${
                isMobile ? 'border-white border-opacity-20' : 'border-gray-200'
              }`}
              style={{ 
                borderTopLeftRadius: isMobile ? '1rem' : '0.5rem', 
                borderTopRightRadius: isMobile ? '1rem' : '0.5rem',
                cursor: !isMobile && (isDragging ? 'grabbing' : 'move'),
                userSelect: 'none',
                background: 'linear-gradient(90deg, #1E65AD 0%, #CF9B63 100%)'
              }}
              onMouseEnter={!isMobile ? (e) => {
                if (!isDragging) {
                  e.currentTarget.style.cursor = 'move';
                }
              } : undefined}
            >
              <div className="flex items-center gap-2 sm:gap-2.5">
                <StickyNote className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-white" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                  Notes
                </h3>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Size Control Buttons - Desktop Only */}
                {!isMobile && (
                  <div className="flex items-center gap-1 border-r border-white border-opacity-30 pr-2 mr-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPopupSize(prev => ({
                          width: Math.max(400, prev.width - 50),
                          height: Math.max(300, prev.height - 50)
                        }));
                      }}
                      className="text-white hover:text-gray-200 transition-colors p-1 rounded hover:bg-opacity-20"
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '0.25rem',
                        cursor: 'pointer'
                      }}
                      title="Make Smaller"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPopupSize(prev => ({
                          width: Math.min(window.innerWidth * 0.9, prev.width + 50),
                          height: Math.min(window.innerHeight * 0.9, prev.height + 50)
                        }));
                      }}
                      className="text-white hover:text-gray-200 transition-colors p-1 rounded hover:bg-opacity-20"
                      style={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '0.25rem',
                        cursor: 'pointer'
                      }}
                      title="Make Bigger"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                )}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotesPopup(false);
                  }}
                  className={`text-white hover:text-gray-200 active:text-gray-300 transition-colors flex-shrink-0 ${
                    isMobile ? 'p-1.5 rounded-full hover:bg-white hover:bg-opacity-20 active:bg-opacity-30' : 'p-1 rounded hover:bg-opacity-20'
                  }`}
                  style={{ 
                    backgroundColor: isMobile ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
                    borderRadius: isMobile ? '50%' : '0.25rem',
                    cursor: 'pointer'
                  }}
                  title="Close"
                  aria-label="Close"
                >
                  <X className={isMobile ? 'h-5 w-5 sm:h-6 sm:w-6' : 'w-5 h-5'} />
                </button>
              </div>
            </div>
            
            {/* Resize Handle - Desktop Only */}
            {!isMobile && (
              <div
                className="absolute bottom-0 right-0 w-6 h-6"
                style={{
                  background: 'linear-gradient(135deg, transparent 0%, transparent 50%, rgba(30, 101, 173, 0.3) 50%, rgba(30, 101, 173, 0.3) 100%)',
                  borderBottomRightRadius: '0.5rem',
                  cursor: 'nwse-resize'
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsResizing(true);
                  setResizeStart({
                    x: e.clientX,
                    y: e.clientY,
                    width: popupSize.width,
                    height: popupSize.height
                  });
                }}
                onMouseEnter={(e) => {
                  if (!isResizing) {
                    e.currentTarget.style.cursor = 'nwse-resize';
                  }
                }}
                title="Drag to resize"
              />
            )}

            {/* Folder Tabs */}
            <div className="border-b border-gray-200 bg-gray-50" style={{ position: 'relative', zIndex: 1 }}>
              <div className="flex items-center gap-2 p-3 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                {/* Folder Tabs */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {notesFolders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Save current folder content before switching
                        setNotesFolders(prev => prev.map(f => 
                          f.id === activeFolderId ? { ...f, content: notesContent } : f
                        ));
                        // Switch to new folder
                        setActiveFolderId(folder.id);
                        setNotesContent(folder.content || '');
                      }}
                      className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                        activeFolderId === folder.id
                          ? 'bg-blue-600 text-white shadow-md scale-105'
                          : 'bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200 border border-gray-200'
                      }`}
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                    >
                      {folder.name}
                    </button>
                  ))}
                </div>
                
                {/* Action Buttons Container */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {showNewFolderInput ? (
                    <div className="flex items-center gap-1.5 bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Folder name"
                        className="px-2.5 py-1.5 border-2 border-blue-500 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                        style={{ 
                          fontFamily: 'Roboto, sans-serif',
                          minWidth: '120px',
                          maxWidth: '150px'
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newFolderName.trim()) {
                            const newFolder = {
                              id: Date.now().toString(),
                              name: newFolderName.trim(),
                              content: ''
                            };
                            setNotesFolders([...notesFolders, newFolder]);
                            setActiveFolderId(newFolder.id);
                            setNotesContent('');
                            setNewFolderName('');
                            setShowNewFolderInput(false);
                          }
                        }}
                        onBlur={() => {
                          // Don't close on blur, let user click Add or Cancel
                        }}
                        autoFocus
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (newFolderName.trim()) {
                            const newFolder = {
                              id: Date.now().toString(),
                              name: newFolderName.trim(),
                              content: ''
                            };
                            setNotesFolders([...notesFolders, newFolder]);
                            setActiveFolderId(newFolder.id);
                            setNotesContent('');
                            setNewFolderName('');
                          }
                          setShowNewFolderInput(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm whitespace-nowrap ${
                          newFolderName.trim()
                            ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                        disabled={!newFolderName.trim()}
                      >
                        Add
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNewFolderInput(false);
                          setNewFolderName('');
                        }}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-300 active:bg-gray-400 transition-colors whitespace-nowrap"
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNewFolderInput(true);
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                      >
                        + New
                      </button>
                      {notesFolders.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (notesFolders.length > 1 && window.confirm('Delete this folder?')) {
                              const newFolders = notesFolders.filter(f => f.id !== activeFolderId);
                              setNotesFolders(newFolders);
                              setActiveFolderId(newFolders[0].id);
                              setNotesContent(newFolders[0].content || '');
                            }
                          }}
                          className="px-3 py-2 bg-red-500 text-white rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap hover:bg-red-600 active:bg-red-700 transition-colors shadow-sm"
                          style={{ fontFamily: 'Roboto, sans-serif' }}
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col p-3 sm:p-4 bg-gray-50" style={{ cursor: 'text' }}>
              <textarea
                value={notesContent}
                onChange={(e) => {
                  setNotesContent(e.target.value);
                  // Update folder content in real-time
                  setNotesFolders(prev => prev.map(f => 
                    f.id === activeFolderId ? { ...f, content: e.target.value } : f
                  ));
                }}
                className="flex-1 w-full p-3 sm:p-4 border-2 border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm md:text-base bg-white shadow-inner"
                style={{ 
                  fontFamily: 'Roboto, sans-serif',
                  lineHeight: '1.6',
                  minHeight: '200px',
                  color: '#1E65AD',
                  cursor: 'text'
                }}
                placeholder="Write your notes here...&#10;&#10;You can use markdown formatting:&#10;# Heading&#10;## Subheading&#10;**Bold text**&#10;*Italic text*"
              />

              {/* Save Button */}
              <button
                onClick={() => {
                  // Save notes logic here - save all folders
                  setNotesFolders(prev => prev.map(f => 
                    f.id === activeFolderId ? { ...f, content: notesContent } : f
                  ));
                  // Save to localStorage for persistence
                  const notesKey = `notes_mapping_${mapping?.id || 'default'}`;
                  const updatedFolders = notesFolders.map(f => 
                    f.id === activeFolderId ? { ...f, content: notesContent } : f
                  );
                  localStorage.setItem(notesKey, JSON.stringify(updatedFolders));
                  
                  // Visual feedback
                  setSaveButtonText('✓ Saved!');
                  setSaveButtonColor('#10b981');
                  setTimeout(() => {
                    setSaveButtonText('Save Notes');
                    setSaveButtonColor('');
                  }, 2000);
                }}
                className="mt-3 w-full px-4 py-3 text-white rounded-xl hover:bg-opacity-90 active:bg-opacity-80 transition-all duration-200 font-semibold text-xs sm:text-sm md:text-base shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  fontFamily: 'Roboto, sans-serif',
                  backgroundColor: saveButtonColor || '#2563eb'
                }}
              >
                {saveButtonText}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Summary Popup */}
      <SummaryPopup
        isOpen={summaryPopupOpen}
        onClose={() => {
          setSummaryPopupOpen(false);
        }}
        item={mapping}
        itemType="mapping"
      />

    </div>
  );
}

