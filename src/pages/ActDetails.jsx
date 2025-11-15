import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import Navbar from "../components/landing/Navbar";
import apiService from "../services/api";
import BookmarkButton from "../components/BookmarkButton";
import SummaryPopup from "../components/SummaryPopup";
import { useAuth } from "../contexts/AuthContext";
import { marked } from "marked";
import jsPDF from "jspdf";
import { FileText, StickyNote, Share2, Download } from "lucide-react";

export default function ActDetails() {
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
  
  const [act, setAct] = useState(null);
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
  
  // Summary popup state
  const [summaryPopupOpen, setSummaryPopupOpen] = useState(false);
  
  // Download dropdown state
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);

  // Markdown and translation state
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [markdownContent, setMarkdownContent] = useState("");
  const [translatedMarkdown, setTranslatedMarkdown] = useState("");
  const [loadingMarkdown, setLoadingMarkdown] = useState(false);
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [markdownError, setMarkdownError] = useState("");

  // Language functions (similar to ViewPDF.jsx)
  const getCurrentLanguage = () => {
    if (typeof window === 'undefined') return 'en';
    
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('selectedLanguage='));
    
    if (cookie) {
      return cookie.split('=')[1] || 'en';
    }
    
    return localStorage.getItem('selectedLanguage') || 'en';
  };

  const getLanguageName = (langCode) => {
    const langNames = {
      'en': 'English',
      'hi': 'Hindi',
      'gu': 'Gujarati',
      'mr': 'Marathi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'bn': 'Bengali',
      'pa': 'Punjabi',
      'ur': 'Urdu',
      'or': 'Odia',
      'as': 'Assamese'
    };
    return langNames[langCode] || langCode.toUpperCase();
  };

  // Translation function
  const translateText = async (text, targetLang) => {
    if (!text || !text.trim() || targetLang === 'en') {
      return text;
    }

    try {
      const response = await fetch('https://api.mymemory.translated.net/get', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const maxLength = 500;
      const chunks = [];
      for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.slice(i, i + maxLength));
      }

      const translatedChunks = await Promise.all(
        chunks.map(async (chunk) => {
          try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|${targetLang}`;
            const chunkResponse = await fetch(url);
            const chunkData = await chunkResponse.json();
            
            if (chunkData.responseData && chunkData.responseData.translatedText) {
              return chunkData.responseData.translatedText;
            }
            return chunk;
          } catch (error) {
            console.warn('Translation chunk failed:', error);
            return chunk; // Return original chunk on error
          }
        })
      );

      return translatedChunks.join(" ");
    } catch (error) {
      console.error('Translation failed:', error);
      return text; // Fallback to original text
    }
  };

  // Default to Translated (Markdown) view if user is not logged in
  useEffect(() => {
    if (!isUserAuthenticated) {
      setShowMarkdown(true);
    }
  }, [isUserAuthenticated]);

  // Detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Re-translate when language cookie changes
  useEffect(() => {
    if (showMarkdown && markdownContent) {
      const currentLang = getCurrentLanguage();
      if (currentLang !== 'en' && !loadingTranslation) {
        setLoadingTranslation(true);
        translateText(markdownContent, currentLang)
          .then(setTranslatedMarkdown)
          .catch(err => {
            console.error("Translation failed:", err);
            setTranslatedMarkdown(markdownContent);
          })
          .finally(() => setLoadingTranslation(false));
      } else if (currentLang === 'en') {
        setTranslatedMarkdown(markdownContent);
      }
    }
  }, [markdownContent, showMarkdown]);

  useEffect(() => {
    // Get act data from location state or fetch from API
    try {
      if (location.state?.act) {
        const actData = location.state.act;
        // Ensure act has numeric id field - backend requires numeric item.id
        if (actData && !actData.id && actData.act_id) {
          // If id is missing but act_id exists, use act_id as id (shouldn't happen, but just in case)
          console.warn('⚠️ ActDetails: act.id missing, using act_id fallback:', actData);
          actData.id = parseInt(actData.act_id);
        }
        // Ensure id is numeric
        if (actData && actData.id) {
          actData.id = parseInt(actData.id);
        }
        console.log('📄 ActDetails: Received act data:', actData);
        setAct(actData);
        setLoading(false);
        setError(""); // Clear any previous errors
      } else {
        // If no act data, redirect back
        setError("No act data provided");
        setTimeout(() => {
          navigate(-1);
        }, 2000);
      }
    } catch (err) {
      console.error('Error in ActDetails useEffect:', err);
      setError(err.message || 'Failed to load act details');
      setLoading(false);
    }
  }, [location.state, navigate]);

  // Load saved notes from localStorage when act changes
  useEffect(() => {
    if (act && act.id) {
      const notesKey = `notes_act_${act.id}`;
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
  }, [act?.id]);

  // Fetch markdown content when markdown view is selected
  useEffect(() => {
    if (showMarkdown && act && !markdownContent && !loadingMarkdown) {
      const fetchMarkdown = async () => {
        setLoadingMarkdown(true);
        setMarkdownError("");
        try {
          const actId = act.id || act.act_id;
          if (actId) {
            let markdown;
            
            // Determine if central or state act
            const isStateAct = act.location || act.state || 
                               (act.source && act.source.toLowerCase().includes('state'));
            
            if (isStateAct) {
              markdown = await apiService.getStateActByIdMarkdown(actId);
            } else {
              markdown = await apiService.getCentralActByIdMarkdown(actId);
            }
            
            setMarkdownContent(markdown);
            setTranslatedMarkdown(""); // Reset translated content
          } else {
            setMarkdownError("No act ID available");
          }
        } catch (error) {
          console.error("Error fetching markdown:", error);
          setMarkdownError(error.message || "Failed to load Translated content");
        } finally {
          setLoadingMarkdown(false);
        }
      };
      
      fetchMarkdown();
    }
  }, [showMarkdown, act, markdownContent, loadingMarkdown]);


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

  const goBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F9FAFC' }}>
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">Loading act details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F9FAFC' }}>
        <Navbar />
        <div className="flex items-center justify-center h-96 px-4">
          <div className="text-center max-w-md w-full">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
              Error Loading Act
            </h3>
            <p className="text-red-600 text-sm mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>
              {error.includes('404') ? 'Act not found. The requested act may not exist or has been removed.' : error}
            </p>
            <button
              onClick={goBack}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!act) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F9FAFC' }}>
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-500 text-lg">No act data available</p>
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFC' }}>
      <Navbar />
      <div className="pt-16 sm:pt-20">

      {/* Responsive Layout: Stacked on mobile, side-by-side on desktop */}
      <div className="flex-1 p-2 sm:p-3 md:p-4 lg:p-6" style={{ minHeight: 'calc(100vh - 80px)', height: isMobile ? 'auto' : 'calc(100vh - 80px)', overflow: isMobile ? 'visible' : 'hidden' }}>
        <div className="max-w-7xl mx-auto" style={{ height: isMobile ? 'auto' : '100%' }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6" style={{ height: isMobile ? 'auto' : '100%' }}>
            {/* Details - Left Side - Static */}
            <div className="lg:col-span-1 order-1 lg:order-1 pt-3" style={{ height: isMobile ? 'auto' : '100%', overflow: 'hidden' }}>
              <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 p-2 sm:p-2 md:p-6 overflow-y-auto" style={{ height: isMobile ? 'auto' : '100%', position: isMobile ? 'relative' : 'sticky', top: 0 }}>
                <div className="mb-3 sm:mb-4 md:mb-6">
                  <div className="flex flex-col grid grid-cols-2  sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
                    <h3 className="text-base sm:text-lg md:text-xl font-bold" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                      Act Details
                    </h3>
                    {act && act.id && (
                      <div className="flex items-center gap-2 justify-end self-start sm:self-auto relative">
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
                        
                        {/* Download Button with Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => {
                              if (!isUserAuthenticated) {
                                navigate('/login');
                                return;
                              }
                              setShowDownloadDropdown(!showDownloadDropdown);
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
                            title="Download"
                          >
                            <Download className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#FFFFFF' }} />
                          </button>
                          
                          {/* Download Dropdown Menu */}
                          {showDownloadDropdown && (
                            <>
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setShowDownloadDropdown(false)}
                              ></div>
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                                <button
                                  onClick={() => {
                                    if (!isUserAuthenticated) {
                                      navigate('/login');
                                      setShowDownloadDropdown(false);
                                      return;
                                    }
                                    if (act.pdf_url) {
                                      const link = document.createElement('a');
                                      link.href = act.pdf_url;
                                      link.download = `${act?.short_title || act?.long_title || 'act'}_original.pdf`.replace(/[^a-z0-9]/gi, '_');
                                      link.target = '_blank';
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    } else {
                                      alert('Original PDF not available');
                                    }
                                    setShowDownloadDropdown(false);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                                  style={{ fontFamily: 'Roboto, sans-serif', color: '#1a1a1a' }}
                                >
                                  <FileText className="h-4 w-4" style={{ color: '#1E65AD' }} />
                                  <span>Original PDF</span>
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      if (!isUserAuthenticated) {
                                        navigate('/login');
                                        setShowDownloadDropdown(false);
                                        return;
                                      }
                                      
                                      // Get current selected language
                                      const currentLang = getCurrentLanguage();
                                      const langName = getLanguageName(currentLang);
                                      
                                      // Get act ID
                                      const actId = act?.id || act?.act_id;
                                      
                                      if (!actId) {
                                        alert('Act ID not available');
                                        setShowDownloadDropdown(false);
                                        return;
                                      }

                                      // Show loading message
                                      const loadingMsg = document.createElement('div');
                                      loadingMsg.id = 'pdf-translation-loading';
                                      loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1E65AD;color:white;padding:20px 30px;border-radius:8px;z-index:10000;font-family:Roboto,sans-serif;box-shadow:0 4px 6px rgba(0,0,0,0.3);';
                                      loadingMsg.textContent = currentLang !== 'en' 
                                        ? `Generating PDF in ${langName}... Please wait.`
                                        : 'Generating PDF... Please wait.';
                                      document.body.appendChild(loadingMsg);

                                      // Fetch markdown content from backend
                                      let markdownContent = '';
                                      try {
                                        // Determine if central or state act
                                        const isStateAct = act.location || act.state || 
                                                           (act.source && act.source.toLowerCase().includes('state'));
                                        
                                        if (isStateAct) {
                                          markdownContent = await apiService.getStateActByIdMarkdown(actId);
                                        } else {
                                          markdownContent = await apiService.getCentralActByIdMarkdown(actId);
                                        }
                                        
                                        if (!markdownContent || markdownContent.trim() === '') {
                                          throw new Error('Markdown content is empty');
                                        }
                                      } catch (markdownError) {
                                        if (loadingMsg && loadingMsg.parentNode) {
                                          document.body.removeChild(loadingMsg);
                                        }
                                        throw new Error('Failed to fetch markdown content: ' + markdownError.message);
                                      }

                                      // Translate markdown if needed
                                      let finalMarkdown = markdownContent;
                                      if (currentLang !== 'en') {
                                        try {
                                          const cleanMarkdown = markdownContent
                                            .replace(/#{1,6}\s+/g, '')
                                            .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
                                            .replace(/\*\*(.*?)\*\*/g, '$1')
                                            .replace(/\*(.*?)\*/g, '$1')
                                            .replace(/`(.*?)`/g, '$1')
                                            .replace(/```[\s\S]*?```/g, '')
                                            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
                                            .trim();
                                          
                                          finalMarkdown = await translateText(cleanMarkdown, currentLang);
                                        } catch (translateError) {
                                          console.warn('Translation failed, using original markdown:', translateError);
                                          finalMarkdown = markdownContent;
                                        }
                                      }

                                      // Convert markdown to plain text
                                      let plainText = finalMarkdown
                                        .replace(/#{1,6}\s+/g, '')
                                        .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
                                        .replace(/\*\*(.*?)\*\*/g, '$1')
                                        .replace(/\*(.*?)\*/g, '$1')
                                        .replace(/`(.*?)`/g, '$1')
                                        .replace(/```[\s\S]*?```/g, '')
                                        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
                                        .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
                                        .replace(/\n{3,}/g, '\n\n')
                                        .trim();

                                      // Create PDF using jsPDF
                                      const pdf = new jsPDF('p', 'mm', 'a4');
                                      const pageWidth = pdf.internal.pageSize.getWidth();
                                      const pageHeight = pdf.internal.pageSize.getHeight();
                                      const margin = 10;
                                      const lineHeight = 5;
                                      const fontSize = 9;
                                      
                                      pdf.setFontSize(fontSize);
                                      pdf.setFont('helvetica', 'normal');
                                      
                                      const maxWidth = pageWidth - (margin * 2);
                                      let y = margin;
                                      const lines = plainText.split('\n');
                                      
                                      lines.forEach((line) => {
                                        if (!line.trim()) {
                                          y += lineHeight * 0.5;
                                          return;
                                        }
                                        
                                        const words = line.split(' ');
                                        let currentLine = '';
                                        
                                        words.forEach((word) => {
                                          const testLine = currentLine ? `${currentLine} ${word}` : word;
                                          const textWidth = pdf.getTextWidth(testLine);
                                          
                                          if (textWidth > maxWidth && currentLine) {
                                            if (y > pageHeight - margin - lineHeight) {
                                              pdf.addPage();
                                              y = margin;
                                            }
                                            pdf.text(currentLine, margin, y);
                                            y += lineHeight;
                                            currentLine = word;
                                          } else {
                                            currentLine = testLine;
                                          }
                                        });
                                        
                                        if (currentLine) {
                                          if (y > pageHeight - margin - lineHeight) {
                                            pdf.addPage();
                                            y = margin;
                                          }
                                          pdf.text(currentLine, margin, y);
                                          y += lineHeight;
                                        }
                                      });

                                      if (loadingMsg && loadingMsg.parentNode) {
                                        document.body.removeChild(loadingMsg);
                                      }

                                      const baseFileName = (act?.short_title || act?.long_title || 'act').replace(/[^a-z0-9]/gi, '_');
                                      const fileName = currentLang !== 'en' 
                                        ? `${baseFileName}_${langName}.pdf`
                                        : `${baseFileName}_translated.pdf`;
                                      
                                      pdf.save(fileName);
                                      console.log('PDF downloaded successfully:', fileName);
                                      
                                    } catch (error) {
                                      console.error('Error generating PDF:', error);
                                      
                                      const loadingMsg = document.getElementById('pdf-translation-loading');
                                      if (loadingMsg && loadingMsg.parentNode) {
                                        document.body.removeChild(loadingMsg);
                                      }
                                      
                                      alert(error.message || 'Failed to generate PDF. Please try again.');
                                    }
                                    setShowDownloadDropdown(false);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm border-t border-gray-200"
                                  style={{ fontFamily: 'Roboto, sans-serif', color: '#1a1a1a' }}
                                >
                                  <FileText className="h-4 w-4" style={{ color: '#CF9B63' }} />
                                  <span>
                                    {(() => {
                                      const currentLang = getCurrentLanguage();
                                      const langName = getLanguageName(currentLang);
                                      return currentLang !== 'en' 
                                        ? `Download PDF (${langName})`
                                        : 'Translated PDF';
                                    })()}
                                  </span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <BookmarkButton
                          item={act}
                          type={act.location ? "state_act" : "central_act"}
                          size="small"
                          showText={false}
                          autoCheckStatus={true}
                          showNotifications={true}
                        />
                      </div>
                    )}
                  </div>
                  <div className="w-10 sm:w-12 h-0.5 sm:h-1 bg-gradient-to-r" style={{ background: 'linear-gradient(90deg, #1E65AD 0%, #CF9B63 100%)' }}></div>
                </div>

                <div className="space-y-2.5 sm:space-y-3 md:space-y-4 lg:space-y-6">
                  {/* Title */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      Act Title
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed break-words" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {act.short_title || act.long_title}
                    </p>
                  </div>

                  {/* Long Title/Description */}
                  {act.long_title && act.long_title !== act.short_title && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Description
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {act.long_title}
                      </p>
                    </div>
                  )}
                  
                  {/* Ministry */}
                  {act.ministry && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Ministry
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {act.ministry}
                      </p>
                    </div>
                  )}
                  
                  {/* Department */}
                  {act.department && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Department
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {act.department}
                      </p>
                    </div>
                  )}

                  {/* Location for State Acts */}
                  {act.location && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Location
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {act.location}
                      </p>
                    </div>
                  )}
                  
                  {/* Year */}
                  {act.year && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Year
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {act.year}
                      </p>
                    </div>
                  )}
                  
                  {/* Enactment Date */}
                  {act.enactment_date && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Enactment Date
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {new Date(act.enactment_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  {/* Enforcement Date */}
                  {act.enforcement_date && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Enforcement Date
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {new Date(act.enforcement_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  {/* Act ID */}
                  {act.act_id && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Act ID
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 font-mono" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {act.act_id}
                      </p>
                    </div>
                  )}

                  {/* Source */}
                  {act.source && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Source
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-600 font-mono" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {act.source}
                      </p>
                    </div>
                  )}

                  {/* Type */}
                  {act.type && (
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Type
                      </h4>
                      <div className="inline-flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium" 
                           style={{ backgroundColor: '#E3F2FD', color: '#1E65AD', fontFamily: 'Roboto, sans-serif' }}>
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: '#1E65AD' }}></div>
                        {act.type}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-3 sm:mt-4 md:mt-6 lg:mt-8 pt-2.5 sm:pt-3 md:pt-4 lg:pt-6 border-t border-gray-200">
                  <div className="space-y-2">
                    <button
                      onClick={goBack}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to Results
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* PDF Viewer - Right Side - Scrollable */}
            <div className="lg:col-span-2 order-2 lg:order-2" style={{ height: isMobile ? 'auto' : '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* PDF Viewer - Show on all screen sizes */}
              <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col" style={{ height: isMobile ? 'auto' : '100%' }}>
                {/* PDF Toolbar - Search, Summary, Notes */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-1.5 md:gap-3 p-1.5 sm:p-2 md:p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                  {/* Search Bar - First Row on Mobile */}
                  <div className="relative w-full sm:flex-1 sm:min-w-[150px] md:min-w-0">
                    <img 
                      src="/uit3.GIF" 
                      alt="Search" 
                      className="absolute left-1.5 sm:left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 h-6 w-10 sm:h-4 sm:w-4 md:h-5 md:w-5 object-contain pointer-events-none z-10"
                    />
                    
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-6 sm:pl-9 md:pl-10 pr-1.5 sm:pr-3 py-1 sm:py-1.5 md:py-2.5 border border-gray-300 rounded-md sm:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-[10px] sm:text-xs md:text-base"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                          // Trigger PDF search functionality
                          console.log('Searching for:', searchQuery);
                          // You can implement PDF search logic here
                        }
                      }}
                    />
                  </div>
                  
                  {/* Action Buttons Container - Second Row on Mobile */}
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
                        const notesKey = `notes_act_${act?.id || 'default'}`;
                        const savedNotes = localStorage.getItem(notesKey);
                        
                        if (!savedNotes) {
                          // Initialize notes content with act data for default folder
                          const initialContent = `# ${act?.short_title || act?.long_title || 'Untitled Note'}\n\n${act?.description || 'No description available.'}\n\n## Details\n\nMinistry: ${act?.ministry || 'N/A'}\nYear: ${act?.year || 'N/A'}`;
                          
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
                  
                  {/* PDF/Markdown Toggle Button */}
                  <div className="relative flex items-center bg-gray-100 rounded-lg sm:rounded-xl p-0.5 sm:p-1 shadow-inner flex-shrink-0 w-full sm:w-auto sm:inline-flex">
                    {/* Sliding background indicator */}
                    <motion.div
                      className="absolute top-0.5 bottom-0.5 sm:top-1 sm:bottom-1 rounded-md sm:rounded-lg z-0"
                      initial={false}
                      animate={{
                        left: !showMarkdown ? '2px' : 'calc(50% + 1px)',
                        backgroundColor: !showMarkdown ? '#1E65AD' : '#CF9B63',
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
                      onClick={() => {
                        if (!isUserAuthenticated) {
                          navigate('/login');
                          return;
                        }
                        setShowMarkdown(false);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex-1 sm:flex-none px-2.5 sm:px-4 md:px-5 lg:px-6 py-1 sm:py-1.5 md:py-2.5 rounded-md sm:rounded-lg font-semibold transition-all duration-300 relative z-10 text-[10px] sm:text-xs md:text-base ${
                        !showMarkdown
                          ? 'text-white'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                      style={{ 
                        fontFamily: 'Roboto, sans-serif',
                      }}
                    >
                      Original
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        if (!isUserAuthenticated) {
                          navigate('/login');
                          return;
                        }
                        setShowMarkdown(true);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex-1 sm:flex-none px-2.5 sm:px-4 md:px-5 lg:px-6 py-1 sm:py-1.5 md:py-2.5 rounded-md sm:rounded-lg font-semibold transition-all duration-300 relative z-10 text-[10px] sm:text-xs md:text-base ${
                        showMarkdown
                          ? 'text-white'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                      style={{
                        fontFamily: 'Roboto, sans-serif',
                      }}
                    >
                      Translated
                    </motion.button>
                  </div>
                </div>
                
                {/* PDF/Markdown Content */}
                <div className="flex-1 overflow-hidden relative" style={{ minHeight: 0, height: '100%' }}>
                  {showMarkdown ? (
                    /* Markdown View */
                    <div 
                      className="w-full h-full bg-white rounded-lg overflow-y-auto"
                      style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative'
                      }}
                    >
                      {loadingMarkdown || loadingTranslation ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-4 text-gray-500 text-sm">
                              {loadingMarkdown ? 'Loading content...' : 'Translating content...'}
                            </p>
                          </div>
                        </div>
                      ) : markdownError ? (
                        <div className="flex items-center justify-center h-full p-4">
                          <div className="text-center">
                            <p className="text-red-500 text-sm mb-2">{markdownError}</p>
                          <button
                              onClick={() => {
                                setMarkdownError("");
                                setMarkdownContent("");
                                if (act && act.id) {
                                  const actId = act.id || act.act_id;
                                  const isStateAct = act.location || act.state || 
                                                     (act.source && act.source.toLowerCase().includes('state'));
                                  if (isStateAct) {
                                    apiService.getStateActByIdMarkdown(actId).then(setMarkdownContent).catch(err => setMarkdownError(err.message));
                                  } else {
                                    apiService.getCentralActByIdMarkdown(actId).then(setMarkdownContent).catch(err => setMarkdownError(err.message));
                                  }
                                }
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              Retry
                          </button>
                        </div>
                      </div>
                      ) : markdownContent ? (
                        <div 
                          className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 markdown-scroll-container"
                          style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#CF9B63 #f4f4f4',
                            height: '100%',
                            overflowY: 'scroll',
                            position: 'relative',
                            zIndex: 1
                          }}
                        >
                          <style>
                            {`
                              .markdown-scroll-container::-webkit-scrollbar {
                                width: 12px;
                              }
                              .markdown-scroll-container::-webkit-scrollbar-track {
                                background: #f4f4f4;
                                border-radius: 6px;
                              }
                              .markdown-scroll-container::-webkit-scrollbar-thumb {
                                background: #CF9B63;
                                border-radius: 6px;
                              }
                              .markdown-scroll-container::-webkit-scrollbar-thumb:hover {
                                background: #b88a56;
                              }
                              .markdown-content {
                                text-rendering: optimizeLegibility;
                                -webkit-font-smoothing: antialiased;
                                -moz-osx-font-smoothing: grayscale;
                                font-feature-settings: "kern" 1;
                                text-size-adjust: 100%;
                              }
                            `}
                          </style>
                          <div className="markdown-content" style={{ 
                            fontFamily: 'Roboto, sans-serif',
                            lineHeight: '1.9',
                            color: '#1a1a1a',
                            fontSize: '17px',
                            maxWidth: '100%',
                            padding: '0',
                            letterSpacing: '0.01em'
                          }}>
                            <ReactMarkdown
                              components={{
                                h1: ({node, ...props}) => <h1 style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif', marginBottom: '1rem', marginTop: '1.5rem' }} {...props} />,
                                h2: ({node, ...props}) => <h2 style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif', marginBottom: '0.75rem', marginTop: '1.25rem' }} {...props} />,
                                h3: ({node, ...props}) => <h3 style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif', marginBottom: '0.5rem', marginTop: '1rem' }} {...props} />,
                                p: ({node, ...props}) => <p style={{ marginBottom: '1rem', lineHeight: '1.6', color: '#1a1a1a' }} {...props} />,
                                strong: ({node, ...props}) => <strong style={{ color: '#1E65AD', fontWeight: 'bold' }} {...props} />,
                                ul: ({node, ...props}) => <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }} {...props} />,
                                ol: ({node, ...props}) => <ol style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }} {...props} />,
                                li: ({node, ...props}) => <li style={{ marginBottom: '0.5rem', lineHeight: '1.6' }} {...props} />,
                                code: ({node, ...props}) => <code style={{ backgroundColor: '#f4f4f4', padding: '0.2rem 0.4rem', borderRadius: '0.25rem', fontSize: '0.9em' }} {...props} />,
                                blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: '4px solid #1E65AD', paddingLeft: '1rem', marginLeft: 0, fontStyle: 'italic', color: '#666' }} {...props} />,
                              }}
                            >
                              {(() => {
                                const currentLang = getCurrentLanguage();
                                if (currentLang !== 'en' && translatedMarkdown) {
                                  return translatedMarkdown;
                                }
                                return markdownContent;
                              })()}
                            </ReactMarkdown>
                    </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-500 text-sm">No content available</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* PDF View */
                    act.pdf_url && act.pdf_url.trim() !== "" ? (
                      <div className="relative h-full w-full" style={{ minHeight: 'calc(100vh - 200px)' }}>
                        {/* PDF Viewer - Embedded */}
                        <iframe
                          src={`${act.pdf_url}#toolbar=0&navpanes=0&scrollbar=1`}
                          className="w-full h-full border-0"
                          title="Act PDF Document"
                          style={{ minHeight: '100%' }}
                        />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center p-4 sm:p-8">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-gradient-to-br flex items-center justify-center" 
                           style={{ background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)' }}>
                        <svg className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: '#1E65AD' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold mb-2" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                        PDF Not Available
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        This act does not have a PDF document available.
                      </p>
                    </div>
                  </div>
                    )
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Draggable Notes Popup */}
      {showNotesPopup && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setShowNotesPopup(false)}
          />
          
          {/* Draggable Popup */}
          <div
            className="fixed bg-white rounded-lg shadow-2xl z-50 flex flex-col"
            style={{
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
            onMouseDown={(e) => {
              // Only start dragging if clicking on the header
              if (e.target.closest('.notes-popup-header')) {
                setIsDragging(true);
                const rect = e.currentTarget.getBoundingClientRect();
                setDragOffset({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top
                });
              }
            }}
            onMouseMove={(e) => {
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
            }}
            onMouseUp={() => {
              setIsDragging(false);
              setIsResizing(false);
            }}
            onMouseLeave={() => {
              setIsDragging(false);
              setIsResizing(false);
            }}
          >
            {/* Header - Draggable Area */}
            <div 
              className="notes-popup-header flex items-center justify-between p-4 border-b border-gray-200"
              style={{ 
                borderTopLeftRadius: '0.5rem', 
                borderTopRightRadius: '0.5rem',
                cursor: isDragging ? 'grabbing' : 'move',
                userSelect: 'none',
                background: 'linear-gradient(90deg, #1E65AD 0%, #CF9B63 100%)'
              }}
              onMouseEnter={(e) => {
                if (!isDragging) {
                  e.currentTarget.style.cursor = 'move';
                }
              }}
            >
              <div className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-white" />
                <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                  Notes
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Size Control Buttons */}
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
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotesPopup(false);
                  }}
                  className="text-white hover:text-gray-200 transition-colors p-1 rounded hover:bg-opacity-20 flex-shrink-0"
                  style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Resize Handle - Bottom Right Corner */}
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

            {/* Folder Tabs */}
            <div className="border-b border-gray-200 bg-gray-50 flex items-center gap-1 px-2 py-1 overflow-x-auto">
              <div className="flex items-center gap-1 flex-1 min-w-0">
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
                    className={`px-3 py-2 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                      activeFolderId === folder.id
                        ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span>{folder.name}</span>
                    {notesFolders.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notesFolders.length > 1) {
                            const newFolders = notesFolders.filter(f => f.id !== folder.id);
                            setNotesFolders(newFolders);
                            if (activeFolderId === folder.id) {
                              const newActiveId = newFolders[0]?.id || 'default';
                              setActiveFolderId(newActiveId);
                              setNotesContent(newFolders.find(f => f.id === newActiveId)?.content || '');
                            }
                          }
                        }}
                        className="ml-1 hover:bg-gray-200 rounded p-0.5 transition-colors"
                        title="Delete folder"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </button>
                ))}
                
                {/* Add New Folder Button */}
                {showNewFolderInput ? (
                  <div className="flex items-center gap-1 px-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newFolderName.trim()) {
                          const newFolder = {
                            id: `folder-${Date.now()}`,
                            name: newFolderName.trim(),
                            content: ''
                          };
                          setNotesFolders([...notesFolders, newFolder]);
                          setActiveFolderId(newFolder.id);
                          setNotesContent('');
                          setNewFolderName('');
                          setShowNewFolderInput(false);
                        } else if (e.key === 'Escape') {
                          setShowNewFolderInput(false);
                          setNewFolderName('');
                        }
                      }}
                      placeholder="Folder name..."
                      className="px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      style={{ fontFamily: 'Roboto, sans-serif', minWidth: '120px' }}
                      autoFocus
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNewFolderInput(false);
                        setNewFolderName('');
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNewFolderInput(true);
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-t-lg transition-all flex items-center gap-1"
                    title="Add new folder"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">New Folder</span>
                  </button>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col" style={{ cursor: 'text' }}>
              <textarea
                value={notesContent}
                onChange={(e) => {
                  setNotesContent(e.target.value);
                  // Update folder content in real-time
                  setNotesFolders(prev => prev.map(f => 
                    f.id === activeFolderId ? { ...f, content: e.target.value } : f
                  ));
                }}
                placeholder="Write your notes here..."
                className="flex-1 w-full p-4 border-0 resize-none focus:outline-none focus:ring-0"
                style={{ 
                  fontFamily: 'Roboto, sans-serif',
                  minHeight: '300px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: '#1E65AD',
                  cursor: 'text'
                }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  // Save current folder content before closing
                  setNotesFolders(prev => prev.map(f => 
                    f.id === activeFolderId ? { ...f, content: notesContent } : f
                  ));
                  setShowNotesPopup(false);
                }}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
                style={{ fontFamily: 'Roboto, sans-serif', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save notes logic here - save all folders
                  setNotesFolders(prev => prev.map(f => 
                    f.id === activeFolderId ? { ...f, content: notesContent } : f
                  ));
                  console.log('Saving notes folders:', notesFolders);
                  // You can implement save functionality here (localStorage, API, etc.)
                  // Save to localStorage for persistence
                  const notesKey = `notes_act_${act?.id || 'default'}`;
                  const updatedFolders = notesFolders.map(f => 
                    f.id === activeFolderId ? { ...f, content: notesContent } : f
                  );
                  localStorage.setItem(notesKey, JSON.stringify(updatedFolders));
                  setShowNotesPopup(false);
                }}
                className="px-4 py-2 text-white rounded-lg transition-all font-medium text-sm shadow-sm hover:shadow-md"
                style={{ 
                  fontFamily: 'Roboto, sans-serif',
                  background: 'linear-gradient(90deg, #1E65AD 0%, #CF9B63 100%)',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(90deg, #1a5a9a 0%, #b88a56 100%)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(90deg, #1E65AD 0%, #CF9B63 100%)';
                }}
              >
                Save Notes
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
        item={act}
        itemType="act"
      />

    </div>
  );
}
