import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bookmark, 
  Folder, 
  FolderPlus, 
  FileText, 
  MoreVertical, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Eye, 
  Trash2, 
  Edit3,
  Share2,
  Download,
  Tag,
  Calendar,
  Clock,
  Star,
  StarOff,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const Bookmarks = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'name', 'date', 'type'
  const [filterType, setFilterType] = useState('all'); // 'all', 'judgement', 'central_act', 'state_act', 'bsa_iea_mapping', 'bns_ipc_mapping'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    hasMore: false
  });

  // Helper function to extract title based on bookmark type
  const getBookmarkTitle = (bookmark) => {
    const item = bookmark.item || bookmark;
    const bookmarkType = bookmark.type;

    // For judgments, use title field
    if (bookmarkType === 'judgement') {
      return item.title || item.case_title || 'Untitled';
    }

    // For acts (central and state), use short_title or long_title
    if (bookmarkType === 'central_act' || bookmarkType === 'state_act') {
      return item.short_title || item.long_title || item.title || 'Untitled';
    }

    // For mappings, use subject or construct from sections
    if (bookmarkType === 'bns_ipc_mapping') {
      if (item.subject) return item.subject;
      if (item.title) return item.title;
      // Construct title from sections
      const ipcSection = item.ipc_section || item.source_section;
      const bnsSection = item.bns_section || item.target_section;
      if (ipcSection && bnsSection) {
        return `IPC ${ipcSection} → BNS ${bnsSection}`;
      }
      if (ipcSection) return `IPC ${ipcSection}`;
      if (bnsSection) return `BNS ${bnsSection}`;
      return 'Untitled';
    }

    if (bookmarkType === 'bsa_iea_mapping') {
      if (item.subject) return item.subject;
      if (item.title) return item.title;
      const ieaSection = item.iea_section || item.source_section;
      const bsaSection = item.bsa_section || item.target_section;
      if (ieaSection && bsaSection) {
        return `IEA ${ieaSection} → BSA ${bsaSection}`;
      }
      if (ieaSection) return `IEA ${ieaSection}`;
      if (bsaSection) return `BSA ${bsaSection}`;
      return 'Untitled';
    }

    if (bookmarkType === 'bnss_crpc_mapping') {
      if (item.subject) return item.subject;
      if (item.title) return item.title;
      const crpcSection = item.crpc_section || item.source_section;
      const bnssSection = item.bnss_section || item.target_section;
      if (crpcSection && bnssSection) {
        return `CrPC ${crpcSection} → BNSS ${bnssSection}`;
      }
      if (crpcSection) return `CrPC ${crpcSection}`;
      if (bnssSection) return `BNSS ${bnssSection}`;
      return 'Untitled';
    }

    // Fallback for unknown types
    return item.title || item.subject || item.short_title || item.long_title || 'Untitled';
  };
  
  // Advanced filtering states
  const [advancedFilters, setAdvancedFilters] = useState({
    dateRange: {
      from: '',
      to: ''
    },
    court: '',
    ministry: '',
    year: '',
    tags: [],
    isFavorite: null // null, true, false
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('bookmarks'); // 'bookmarks'

  // Function to navigate to the appropriate page based on bookmark type
  const handleViewBookmark = async (bookmark) => {
    const item = bookmark.item || bookmark;
    const bookmarkType = bookmark.type;
    
    // Extract item ID - handle various possible structures
    let itemId = item.id || item.judgement_id || item.act_id || item.mapping_id || bookmark.item_id;
    
    // If itemId is still not found, try to extract from bookmark structure
    if (!itemId && bookmark.item_id) {
      itemId = bookmark.item_id;
    }
    
    // If still no ID, log warning and try to proceed with what we have
    if (!itemId) {
      console.warn('⚠️ No item ID found in bookmark:', bookmark);
      // Try to use the bookmark ID itself as a fallback
      itemId = bookmark.id;
    }

    try {
      setLoading(true);
      setError(null);

      switch (bookmarkType) {
        case 'judgement':
          // Navigate to judgment view - fetch full details and ensure proper structure
          try {
            console.log('🔍 Fetching judgment details for ID:', itemId);
            console.log('🔍 Current item data:', item);
            
            // Fetch full judgment details from API
            const response = await apiService.getJudgementById(itemId);
            console.log('📥 API Response:', response);
            
            // Handle various response structures:
            // 1. Direct judgment object: { id, title, pdf_url, ... }
            // 2. Wrapped in data: { data: { id, title, pdf_url, ... } }
            // 3. Wrapped in judgment: { judgment: { id, title, pdf_url, ... } }
            // 4. Array: [{ id, title, pdf_url, ... }]
            let judgmentData = null;
            
            if (response) {
              if (Array.isArray(response)) {
                judgmentData = response[0]; // Take first item if array
              } else if (response.data) {
                judgmentData = response.data;
              } else if (response.judgment) {
                judgmentData = response.judgment;
              } else if (response.id || response.title || response.pdf_url || response.pdf_link) {
                judgmentData = response; // Direct judgment object
              }
            }
            
            // If still no data, use item as fallback
            if (!judgmentData) {
              console.warn('⚠️ No judgment data from API, using item data');
              judgmentData = item;
            }
            
            console.log('✅ Extracted judgment data:', judgmentData);
            
            // Merge with item data to ensure all fields are present
            // Priority: API data > item data > empty defaults
            const completeJudgment = {
              // Start with item data (has bookmark context)
              ...item,
              // Override with fresh API data (has complete details)
              ...judgmentData,
              // Ensure critical fields are set with fallbacks
              id: judgmentData.id || item.id || itemId,
              title: judgmentData.title || judgmentData.case_title || item.title || item.case_title || 'Untitled Judgment',
              // Ensure pdf_link/pdf_url is set (ViewPDF expects pdf_link, but API may use pdf_url)
              pdf_link: judgmentData.pdf_link || judgmentData.pdf_url || item.pdf_link || item.pdf_url || "",
              pdf_url: judgmentData.pdf_url || judgmentData.pdf_link || item.pdf_url || item.pdf_link || "",
              // Preserve other important fields
              case_title: judgmentData.case_title || item.case_title || judgmentData.title || item.title,
              court: judgmentData.court || item.court || '',
              decision_date: judgmentData.decision_date || item.decision_date || '',
              judges: judgmentData.judges || item.judges || [],
              summary: judgmentData.summary || item.summary || '',
              citation: judgmentData.citation || item.citation || ''
            };
            
            console.log('✅ Complete judgment data to navigate:', completeJudgment);
            
            // Navigate to PDF view with complete judgment data
            const judgmentId = completeJudgment.id || completeJudgment.cnr;
            const url = judgmentId ? `/judgment/${judgmentId}` : '/judgment';
            navigate(url, { state: { judgment: completeJudgment } });
          } catch (err) {
            console.error('❌ Error fetching judgment:', err);
            // Fallback: use item data if available
            if (item.title || item.case_title || item.pdf_link || item.pdf_url) {
              console.log('⚠️ Using fallback item data');
              // Ensure pdf_link is set for ViewPDF
              const fallbackJudgment = {
                ...item,
                pdf_link: item.pdf_link || item.pdf_url || "",
                pdf_url: item.pdf_url || item.pdf_link || ""
              };
              const judgmentId = fallbackJudgment.id || fallbackJudgment.cnr;
              const url = judgmentId ? `/judgment/${judgmentId}` : '/judgment';
              navigate(url, { state: { judgment: fallbackJudgment } });
            } else {
              setError(`Failed to load judgment: ${err.message || 'Unknown error'}`);
              throw err;
            }
          }
          break;
        
        case 'central_act':
          // Fetch full central act details and navigate to act details page
          try {
            const actData = await apiService.getCentralActById(itemId);
            navigate('/act-details', { state: { act: actData } });
          } catch (err) {
            console.error('Error fetching central act:', err);
            // Fallback: use item data if available
            if (item.short_title || item.long_title) {
              navigate('/act-details', { state: { act: item } });
            } else {
              throw new Error('Failed to load central act details');
            }
          }
          break;
        
        case 'state_act':
          // Fetch full state act details and navigate to act details page
          try {
            console.log('🔍 Navigating to state act:', itemId, 'Item data:', item);
            const actData = await apiService.getStateActById(itemId);
            console.log('✅ State act fetched successfully:', actData);
            // Ensure the act has location field to identify it as state act
            const actWithLocation = { ...actData, location: actData.location || item.location || 'state' };
            navigate('/act-details', { state: { act: actWithLocation } });
          } catch (err) {
            console.error('❌ Error fetching state act:', err);
            console.error('❌ Error details:', err.message, err.stack);
            // Fallback: use item data if available
            if (item.short_title || item.long_title || item.title) {
              console.log('⚠️ Using fallback item data for state act');
              const fallbackAct = { ...item, location: item.location || 'state' };
              navigate('/act-details', { state: { act: fallbackAct } });
            } else {
              throw new Error(`Failed to load state act details: ${err.message}`);
            }
          }
          break;
        
        case 'bsa_iea_mapping':
          // Fetch full mapping details and navigate to mapping details page
          try {
            const mappingData = await apiService.getLawMappingById(itemId, 'bsa_iea');
            navigate('/mapping-details', { state: { mapping: mappingData } });
          } catch (err) {
            console.error('Error fetching BSA-IEA mapping:', err);
            // Fallback: use item data if available
            if (item.bsa_section || item.iea_section || item.subject) {
              navigate('/mapping-details', { state: { mapping: item } });
            } else {
              throw new Error('Failed to load BSA-IEA mapping details');
            }
          }
          break;
        
        case 'bns_ipc_mapping':
          // Fetch full mapping details and navigate to mapping details page
          try {
            const mappingData = await apiService.getLawMappingById(itemId, 'bns_ipc');
            navigate('/mapping-details', { state: { mapping: mappingData } });
          } catch (err) {
            console.error('Error fetching BNS-IPC mapping:', err);
            // Fallback: use item data if available
            if (item.bns_section || item.ipc_section || item.subject) {
              navigate('/mapping-details', { state: { mapping: item } });
            } else {
              throw new Error('Failed to load BNS-IPC mapping details');
            }
          }
          break;

        case 'bnss_crpc_mapping':
          // Fetch full mapping details and navigate to mapping details page
          try {
            const mappingData = await apiService.getLawMappingById(itemId, 'bnss_crpc');
            navigate('/mapping-details', { state: { mapping: mappingData } });
          } catch (err) {
            console.error('Error fetching BNSS-CrPC mapping:', err);
            // Fallback: use item data if available
            if (item.bnss_section || item.crpc_section || item.subject) {
              navigate('/mapping-details', { state: { mapping: item } });
            } else {
              throw new Error('Failed to load BNSS-CrPC mapping details');
            }
          }
          break;
        
        default:
          console.warn('Unknown bookmark type:', bookmarkType);
          setError(`Unknown bookmark type: ${bookmarkType}`);
          // Fallback: try to open URL if available
          if (item.pdf_url || item.url) {
            window.open(item.pdf_url || item.url, '_blank');
          } else {
            throw new Error(`Unsupported bookmark type: ${bookmarkType}`);
          }
      }
    } catch (err) {
      console.error('Error navigating to bookmark:', err);
      setError(err.message || 'Failed to load bookmark content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Clear bookmarks when user changes or logs out
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setBookmarks([]);
      setFolders([]);
      setError(null);
      return;
    }
  }, [isAuthenticated, user]);

  // Load bookmarks and folders from API when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }
    loadBookmarks();
    loadFolders();
  }, [isAuthenticated, user?.id]); // Add user.id dependency to reload when user changes

  // Reload bookmarks when filters change (only if authenticated)
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }
    loadBookmarks();
  }, [filterType, searchQuery, advancedFilters, currentFolder, user?.id]); // Add user.id to dependencies

  // Handle filter changes
  const handleFilterChange = (filterKey, value) => {
    setFilterType(value);
    setSelectedItems([]); // Clear selections when filter changes
  };

  const handleAdvancedFilterChange = (filterKey, value) => {
    setAdvancedFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
    setSelectedItems([]); // Clear selections when filter changes
  };

  const handleDateRangeChange = (rangeKey, value) => {
    setAdvancedFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [rangeKey]: value
      }
    }));
    setSelectedItems([]);
  };

  const handleTagFilterChange = (tag) => {
    setAdvancedFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
    setSelectedItems([]);
  };

  const clearAllFilters = () => {
    setFilterType('all');
    setSearchQuery('');
    setAdvancedFilters({
      dateRange: { from: '', to: '' },
      court: '',
      ministry: '',
      year: '',
      tags: [],
      isFavorite: null
    });
    setSelectedItems([]);
  };

  const applyFilters = () => {
    loadBookmarks();
  };

  // Load bookmarks from API with filtering
  const loadBookmarks = async (offset = 0, limit = 50) => {
    setLoading(true);
    setError(null);
    try {
      // Build filter parameters based on current filters
      const filterParams = {
        limit,
        offset,
        ...(currentFolder && { folder_id: currentFolder.id }),
        ...(filterType !== 'all' && { type: filterType }),
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
        ...(advancedFilters.dateRange.from && { date_from: advancedFilters.dateRange.from }),
        ...(advancedFilters.dateRange.to && { date_to: advancedFilters.dateRange.to }),
        ...(advancedFilters.court && { court: advancedFilters.court }),
        ...(advancedFilters.ministry && { ministry: advancedFilters.ministry }),
        ...(advancedFilters.year && { year: advancedFilters.year }),
        ...(advancedFilters.tags.length > 0 && { tags: advancedFilters.tags.join(',') }),
        ...(advancedFilters.isFavorite !== null && { is_favorite: advancedFilters.isFavorite })
      };

      const response = await apiService.getUserBookmarks(filterParams);
      
      // Debug: Log response to understand structure
      console.log('📋 Bookmark API Response:', response);
      console.log('📋 Bookmarks received:', response.bookmarks?.length || 0);
      if (response.bookmarks) {
        const typeCounts = {};
        response.bookmarks.forEach(b => {
          typeCounts[b.type] = (typeCounts[b.type] || 0) + 1;
        });
        console.log('📋 Bookmark types distribution:', typeCounts);
        
        // Debug state acts specifically
        const stateActs = response.bookmarks.filter(b => b.type === 'state_act');
        if (stateActs.length > 0) {
          console.log('📋 State Acts found:', stateActs.length);
          console.log('📋 Sample State Act:', stateActs[0]);
        } else {
          console.log('⚠️ No state acts found in response');
        }
      }
      
      if (offset === 0) {
        setBookmarks(response.bookmarks || []);
      } else {
        setBookmarks(prev => [...prev, ...(response.bookmarks || [])]);
      }
      
      setPagination({
        limit: response.pagination?.limit || limit,
        offset: response.pagination?.offset || offset,
        hasMore: response.pagination?.has_more || false
      });
    } catch (err) {
      setError(err.message || 'Failed to load bookmarks');
      console.error('Error loading bookmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load folders from API
  const loadFolders = async () => {
    try {
      const response = await apiService.getBookmarkFolders();
      setFolders(response.folders || []);
    } catch (err) {
      console.error('Error loading folders:', err);
      // Don't set error for folders as it's not critical
    }
  };

  // Since filtering is now done on the API side, we use the bookmarks directly
  const filteredBookmarks = bookmarks;

  const sortedBookmarks = [...filteredBookmarks].sort((a, b) => {
    const itemA = a.item || a;
    const itemB = b.item || b;
    
    switch (sortBy) {
      case 'name':
        return getBookmarkTitle(a).localeCompare(getBookmarkTitle(b));
      case 'date':
        return new Date(b.created_at || b.dateAdded) - new Date(a.created_at || a.dateAdded);
      case 'type':
        return a.type.localeCompare(b.type);
      case 'recent':
      default:
        return new Date(b.created_at || b.dateAdded) - new Date(a.created_at || a.dateAdded);
    }
  });

  const handleCreateFolder = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!newFolderName.trim()) {
      setShowCreateFolder(false);
      return;
    }
    
    try {
      await apiService.createBookmarkFolder(newFolderName.trim());
      setNewFolderName('');
      setShowCreateFolder(false);
      await loadFolders();
    } catch (err) {
      console.error('Error creating folder:', err);
      setError(err.message || 'Failed to create folder');
    }
  };


  const handleDeleteBookmark = async (bookmark) => {
    try {
      const bookmarkId = typeof bookmark === 'object' ? bookmark.id : bookmark;
      const bookmarkType = typeof bookmark === 'object' ? bookmark.type : null;
      const item = typeof bookmark === 'object' ? (bookmark.item || bookmark) : null;
      const itemId = item?.id;

      if (!itemId || !bookmarkType) {
        // Fallback to generic delete if we don't have type info
        await apiService.deleteBookmark(bookmarkId);
      } else {
        // Use the correct endpoint based on bookmark type
        switch (bookmarkType) {
          case 'judgement':
            await apiService.removeJudgementBookmark(itemId);
            break;
          case 'central_act':
            await apiService.removeActBookmark('central', itemId);
            break;
          case 'state_act':
            await apiService.removeActBookmark('state', itemId);
            break;
          case 'bsa_iea_mapping':
            await apiService.removeMappingBookmark('bsa_iea', itemId);
            break;
          case 'bns_ipc_mapping':
            await apiService.removeMappingBookmark('bns_ipc', itemId);
            break;
          default:
            await apiService.deleteBookmark(bookmarkId);
        }
      }
      
      // Remove from local state
      setBookmarks(prev => prev.filter(item => item.id !== bookmarkId));
      setSelectedItems(prev => prev.filter(id => id !== bookmarkId));
    } catch (err) {
      setError(err.message || 'Failed to delete bookmark');
      console.error('Error deleting bookmark:', err);
    }
  };

  const handleToggleFavorite = async (bookmarkId) => {
    try {
      const bookmark = bookmarks.find(b => b.id === bookmarkId);
      if (bookmark) {
        await apiService.updateBookmark(bookmarkId, {
          is_favorite: !bookmark.is_favorite
        });
        
        // Update local state
        setBookmarks(prev => 
          prev.map(item => 
            item.id === bookmarkId ? { ...item, is_favorite: !item.is_favorite } : item
          )
        );
      }
    } catch (err) {
      setError(err.message || 'Failed to update favorite status');
      console.error('Error updating favorite:', err);
    }
  };

  const handleMoveToFolder = async (bookmarkId, folderId) => {
    try {
      await apiService.updateBookmark(bookmarkId, {
        folder_id: folderId
      });
      
      // Update local state
      setBookmarks(prev => 
        prev.map(item => 
          item.id === bookmarkId ? { ...item, folder_id: folderId } : item
        )
      );
    } catch (err) {
      setError(err.message || 'Failed to move bookmark');
      console.error('Error moving bookmark:', err);
    }
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === sortedBookmarks.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(sortedBookmarks.map(item => item.id));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'judgment':
        return <FileText className="h-8 w-8 text-blue-600" />;
      case 'act':
        return <FileText className="h-8 w-8 text-green-600" />;
      default:
        return <FileText className="h-8 w-8 text-gray-600" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'judgment':
        return 'bg-blue-100 text-blue-800';
      case 'act':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start flex-1 min-w-0">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-red-800 mb-1" style={{ fontFamily: 'Roboto, sans-serif' }}>Error</h3>
                <p className="text-sm text-red-700 break-words whitespace-normal" style={{ fontFamily: 'Roboto, sans-serif', wordBreak: 'break-word' }}>{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0"
              aria-label="Close error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Perfect Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>My Bookmarks</h1>
            <p className="text-gray-600 text-xs sm:text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>
              {sortedBookmarks.length} bookmarks • {folders.length} folders
              {(filterType !== 'all' || searchQuery || Object.values(advancedFilters).some(v => 
                v !== null && v !== '' && (typeof v !== 'object' || Object.values(v).some(subV => subV !== ''))
              )) && (
                <span className="ml-2 text-blue-600 font-medium">• Filtered</span>
              )}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-3 sm:gap-0">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 text-white rounded-lg transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 font-medium text-xs sm:text-sm w-full sm:w-auto"
              style={{ backgroundColor: '#CF9B63', fontFamily: 'Roboto, sans-serif' }}
            >
              <FolderPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              New Folder
            </button>
          </div>
        </div>
      </div>


      {/* Tab Content */}
      {activeTab === 'bookmarks' && (
        <>
          {/* Search and Filters */}
          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200">
            <div className="flex flex-col gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search bookmarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-xs sm:text-sm"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:space-x-0">
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 sm:flex-initial px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-xs sm:text-sm bg-white min-w-[120px]"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  <option value="recent">Most Recent</option>
                  <option value="name">Name A-Z</option>
                  <option value="date">Date Added</option>
                  <option value="type">Type</option>
                </select>

                {/* Filter */}
                <select
                  value={filterType}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="flex-1 sm:flex-initial px-2 sm:px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-xs sm:text-sm bg-white min-w-[120px]"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  <option value="all">All Types</option>
                  <option value="judgement">Judgements</option>
                  <option value="central_act">Central Acts</option>
                  <option value="state_act">State Acts</option>
                  <option value="bsa_iea_mapping">BSA-IEA Mappings</option>
                  <option value="bns_ipc_mapping">BNS-IPC Mappings</option>
                </select>

                {/* View Mode */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 sm:p-2.5 transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-50 bg-white'
                    }`}
                    title="Grid View"
                  >
                    <Grid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 sm:p-2.5 transition-colors border-l border-gray-300 ${
                      viewMode === 'list' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-50 bg-white'
                    }`}
                    title="List View"
                  >
                    <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>

                {/* Advanced Filters Toggle */}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 border rounded-lg transition-all duration-200 ${
                    showAdvancedFilters
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  <span className="text-xs sm:text-sm font-medium">Advanced</span>
                </button>
              </div>
            </div>
          </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>Advanced Filters</h3>
            <button
              onClick={() => setShowAdvancedFilters(false)}
              className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Date Range</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={advancedFilters.dateRange.from}
                  onChange={(e) => handleDateRangeChange('from', e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="From date"
                />
                <input
                  type="date"
                  value={advancedFilters.dateRange.to}
                  onChange={(e) => handleDateRangeChange('to', e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="To date"
                />
              </div>
            </div>

            {/* Court Filter (for judgments) */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Court</label>
              <input
                type="text"
                value={advancedFilters.court}
                onChange={(e) => handleAdvancedFilterChange('court', e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Supreme Court"
              />
            </div>

            {/* Ministry Filter (for acts) */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Ministry</label>
              <input
                type="text"
                value={advancedFilters.ministry}
                onChange={(e) => handleAdvancedFilterChange('ministry', e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Ministry of Law"
              />
            </div>

            {/* Year Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Year</label>
              <input
                type="number"
                value={advancedFilters.year}
                onChange={(e) => handleAdvancedFilterChange('year', e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 2024"
                min="1900"
                max="2030"
              />
            </div>

            {/* Favorite Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Favorites</label>
              <select
                value={advancedFilters.isFavorite === null ? '' : advancedFilters.isFavorite.toString()}
                onChange={(e) => handleAdvancedFilterChange('isFavorite', e.target.value === '' ? null : e.target.value === 'true')}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="true">Favorites Only</option>
                <option value="false">Non-Favorites Only</option>
              </select>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Tags</label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Add tag filter"
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const tag = e.target.value.trim();
                      if (tag && !advancedFilters.tags.includes(tag)) {
                        handleTagFilterChange(tag);
                        e.target.value = '';
                      }
                    }
                  }}
                />
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {advancedFilters.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => handleTagFilterChange(tag)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3 sm:gap-0 mt-4 sm:mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={clearAllFilters}
              className="px-3 sm:px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium text-xs sm:text-sm w-full sm:w-auto"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              Clear All
            </button>
            <button
              onClick={applyFilters}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm shadow-sm w-full sm:w-auto"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {(filterType !== 'all' || searchQuery || advancedFilters.dateRange.from || advancedFilters.dateRange.to || 
        advancedFilters.court || advancedFilters.ministry || advancedFilters.year || 
        advancedFilters.tags.length > 0 || advancedFilters.isFavorite !== null) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-medium text-blue-800">Active Filters:</h3>
            <button
              onClick={clearAllFilters}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {filterType !== 'all' && (
              <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm bg-blue-100 text-blue-800">
                Type: {filterType.replace('_', ' ')}
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm bg-blue-100 text-blue-800">
                Search: "{searchQuery}"
              </span>
            )}
            {advancedFilters.dateRange.from && (
              <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm bg-blue-100 text-blue-800">
                From: {new Date(advancedFilters.dateRange.from).toLocaleDateString()}
              </span>
            )}
            {advancedFilters.dateRange.to && (
              <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm bg-blue-100 text-blue-800">
                To: {new Date(advancedFilters.dateRange.to).toLocaleDateString()}
              </span>
            )}
            {advancedFilters.court && (
              <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm bg-blue-100 text-blue-800">
                Court: {advancedFilters.court}
              </span>
            )}
            {advancedFilters.ministry && (
              <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm bg-blue-100 text-blue-800">
                Ministry: {advancedFilters.ministry}
              </span>
            )}
            {advancedFilters.year && (
              <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm bg-blue-100 text-blue-800">
                Year: {advancedFilters.year}
              </span>
            )}
            {advancedFilters.tags.map((tag, index) => (
              <span key={index} className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm bg-blue-100 text-blue-800">
                Tag: {tag}
              </span>
            ))}
            {advancedFilters.isFavorite !== null && (
              <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm bg-blue-100 text-blue-800">
                {advancedFilters.isFavorite ? 'Favorites Only' : 'Non-Favorites Only'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Folders */}
      {!currentFolder && folders.length > 0 && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>Folders</h2>
            <button
              onClick={() => setShowCreateFolder(true)}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              <FolderPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">New Folder</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setCurrentFolder(folder)}
                className="flex flex-col items-center p-3 sm:p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group hover:shadow-md"
              >
                <div 
                  className="p-2 sm:p-3 rounded-lg mb-1.5 sm:mb-2 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: (folder.color || '#1E65AD') + '20' }}
                >
                  <Folder 
                    className="h-6 w-6 sm:h-8 sm:w-8" 
                    style={{ color: folder.color || '#1E65AD' }}
                  />
                </div>
                <h3 className="font-medium text-gray-900 text-xs sm:text-sm text-center group-hover:text-blue-700 mb-0.5 sm:mb-1 truncate w-full px-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {folder.name}
                </h3>
                <p className="text-xs text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {folder.bookmark_count || 0} items
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Folder Header */}
      {currentFolder && (
        <div className="flex items-center justify-between bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200">
          <div className="flex items-center min-w-0 flex-1">
            <button
              onClick={() => setCurrentFolder(null)}
              className="mr-2 sm:mr-4 p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title="Back to all folders"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div 
              className="p-2 sm:p-3 rounded-lg mr-2 sm:mr-3 flex-shrink-0"
              style={{ backgroundColor: (currentFolder.color || '#1E65AD') + '20' }}
            >
              <Folder 
                className="h-5 w-5 sm:h-6 sm:w-6" 
                style={{ color: currentFolder.color || '#1E65AD' }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-0.5 sm:mb-1 truncate" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>{currentFolder.name}</h2>
              <p className="text-xs sm:text-sm text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
                {sortedBookmarks.length} bookmark{sortedBookmarks.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bookmarks Grid/List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading && bookmarks.length === 0 ? (
          <div className="p-8 sm:p-12 md:p-16 text-center">
            <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 mx-auto mb-3 sm:mb-4 animate-spin" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>Loading bookmarks...</h3>
            <p className="text-gray-500 text-xs sm:text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>Please wait while we fetch your bookmarks</p>
          </div>
        ) : sortedBookmarks.length === 0 ? (
          <div className="p-8 sm:p-12 md:p-16 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Bookmark className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>No bookmarks found</h3>
            <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>
              {searchQuery ? 'Try adjusting your search criteria' : 'Start by bookmarking items from the legal library'}
            </p>
          </div>
        ) : (
          <>
            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                  <span className="text-xs sm:text-sm font-medium text-blue-800" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                      className="flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                    >
                      Move to Folder
                    </button>
                    <button 
                      className="flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                    >
                      Delete Selected
                    </button>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'grid' ? (
              <div className="p-3 sm:p-4 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {sortedBookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className={`relative bg-white border rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 hover:shadow-lg transition-all duration-200 cursor-pointer group ${
                        selectedItems.includes(bookmark.id) ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={(e) => {
                        // Only select if clicking on the card itself, not on buttons
                        if (e.target.closest('button') || e.target.closest('input')) {
                          return;
                        }
                        handleViewBookmark(bookmark);
                      }}
                    >
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(bookmark.id)}
                        onChange={() => handleSelectItem(bookmark.id)}
                        className="absolute top-2 left-2 sm:top-3 sm:left-3 w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />

                      {/* Favorite Star */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(bookmark.id);
                        }}
                        className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1 sm:p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
                        title={bookmark.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {bookmark.is_favorite ? (
                          <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500 fill-current" />
                        ) : (
                          <StarOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 group-hover:text-yellow-400" />
                        )}
                      </button>

                      {/* File Icon */}
                      <div className="flex justify-center mb-2 sm:mb-3 md:mb-4 mt-1 sm:mt-2">
                        <div className={`p-2 sm:p-2.5 md:p-3 rounded-lg ${
                          bookmark.type === 'judgement' ? 'bg-blue-50' :
                          bookmark.type === 'central_act' || bookmark.type === 'state_act' ? 'bg-green-50' :
                          'bg-purple-50'
                        }`}>
                          <FileText className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-blue-600" />
                        </div>
                      </div>

                      {/* Bookmark Info */}
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mb-1.5 sm:mb-2 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]" style={{ fontFamily: 'Roboto, sans-serif' }}>
                          {getBookmarkTitle(bookmark)}
                        </h3>
                        
                        {/* Type Badge */}
                        <div className="mb-2 sm:mb-3">
                          <span className={`inline-flex px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${
                            bookmark.type === 'judgement' ? 'bg-blue-100 text-blue-800' :
                            bookmark.type === 'central_act' || bookmark.type === 'state_act' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`} style={{ fontFamily: 'Roboto, sans-serif' }}>
                            {bookmark.type === 'judgement' ? 'Judgement' :
                             bookmark.type === 'central_act' ? 'Central Act' :
                             bookmark.type === 'state_act' ? 'State Act' :
                             bookmark.type === 'bns_ipc_mapping' ? 'BNS IPC' :
                             bookmark.type === 'bsa_iea_mapping' ? 'BSA IEA' :
                             bookmark.type === 'bnss_crpc_mapping' ? 'BNSS CrPC' :
                             bookmark.type.replace('_', ' ').replace('mapping', '').trim()}
                          </span>
                        </div>
                        
                        {/* Tags */}
                        {(bookmark.tags || []).length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1 mb-2 sm:mb-3">
                            {(bookmark.tags || []).slice(0, 2).map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-gray-100 text-gray-600 rounded-md"
                                style={{ fontFamily: 'Roboto, sans-serif' }}
                              >
                                {tag}
                              </span>
                            ))}
                            {(bookmark.tags || []).length > 2 && (
                              <span className="text-[10px] sm:text-xs text-gray-400" style={{ fontFamily: 'Roboto, sans-serif' }}>
                                +{(bookmark.tags || []).length - 2}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 pt-1.5 sm:pt-2 border-t border-gray-100" style={{ fontFamily: 'Roboto, sans-serif' }}>
                          <span className="truncate">{formatDate(bookmark.created_at || bookmark.dateAdded)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex space-x-0.5 sm:space-x-1 bg-white rounded-lg shadow-md p-0.5 sm:p-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewBookmark(bookmark);
                            }}
                            className="p-1 sm:p-1.5 hover:bg-blue-50 rounded transition-colors"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBookmark(bookmark);
                            }}
                            className="p-1 sm:p-1.5 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === sortedBookmarks.length && sortedBookmarks.length > 0}
                          onChange={handleSelectAll}
                          className="rounded w-3.5 h-3.5 sm:w-4 sm:h-4"
                        />
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bookmark
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        Type
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Tags
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Date Added
                      </th>
                      <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedBookmarks.map((bookmark) => (
                      <tr
                        key={bookmark.id}
                        className={`hover:bg-gray-50 ${selectedItems.includes(bookmark.id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(bookmark.id)}
                            onChange={() => handleSelectItem(bookmark.id)}
                            className="rounded w-3.5 h-3.5 sm:w-4 sm:h-4"
                          />
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                          <div className="flex items-center min-w-0">
                            <div className="flex-shrink-0">
                              <FileText className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600" />
                            </div>
                            <div className="ml-2 sm:ml-3 min-w-0 flex-1">
                              <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                {getBookmarkTitle(bookmark)}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500 truncate hidden sm:block">
                                {(bookmark.item || bookmark).description || ''}
                              </div>
                              <div className="text-[10px] sm:text-xs text-gray-500 sm:hidden">
                                {formatDate(bookmark.created_at || bookmark.dateAdded)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                          <span className={`inline-flex px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full ${getTypeColor(bookmark.type)}`}>
                            {bookmark.type}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {(bookmark.tags || []).slice(0, 2).map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs bg-gray-100 text-gray-600 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {(bookmark.tags || []).length > 2 && (
                              <span className="text-[10px] sm:text-xs text-gray-400">
                                +{(bookmark.tags || []).length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden lg:table-cell">
                          {formatDate(bookmark.created_at || bookmark.dateAdded)}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                          <div className="flex space-x-1 sm:space-x-2">
                            <button
                              onClick={() => handleToggleFavorite(bookmark.id)}
                              className={bookmark.is_favorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}
                              title={bookmark.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              onClick={() => handleViewBookmark(bookmark)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View"
                            >
                              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBookmark(bookmark)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        
        {/* Load More Button */}
        {pagination.hasMore && !loading && (
          <div className="p-3 sm:p-4 border-t border-gray-200 text-center">
            <button
              onClick={() => loadBookmarks(pagination.offset + pagination.limit)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Load More Bookmarks
            </button>
          </div>
        )}
        
        {/* Loading More Indicator */}
        {loading && bookmarks.length > 0 && (
          <div className="p-3 sm:p-4 border-t border-gray-200 text-center">
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mx-auto animate-spin" />
            <p className="text-xs sm:text-sm text-gray-500 mt-2">Loading more bookmarks...</p>
          </div>
        )}
      </div>
        </>
      )}

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Create New Folder</h3>
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3 sm:mb-4"
              autoFocus
            />
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3 sm:gap-0">
              <button
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewFolderName('');
                }}
                className="px-3 sm:px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFolder}
                className="px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default Bookmarks;
