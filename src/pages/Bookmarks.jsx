import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import apiService from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { JudgmentSkeleton } from '../components/LoadingComponents';
import { 
  Folder, 
  FolderPlus, 
  Edit3, 
  Trash2, 
  X, 
  Check,
  Bookmark as BookmarkIcon,
  FileText,
  Gavel,
  Scale
} from 'lucide-react';

export default function Bookmarks() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null); // null = all, 0 = no folder
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, judgements, acts, mappings
  
  // Folder management states
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [deletingFolderId, setDeletingFolderId] = useState(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await apiService.getBookmarkFolders();
      setFolders(response.folders || []);
    } catch (err) {
      console.error('Error fetching folders:', err);
    }
  }, [isAuthenticated]);

  // Fetch user bookmarks
  const fetchBookmarks = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Fetching user bookmarks...', { selectedFolderId });
      const params = { limit: 1000 };
      if (selectedFolderId !== null) {
        params.folderId = selectedFolderId;
      }
      
      const response = await apiService.getUserBookmarks(params);
      
      console.log('Bookmarks API response:', response);
      
      if (response.bookmarks) {
        setBookmarks(response.bookmarks);
      } else if (Array.isArray(response)) {
        setBookmarks(response);
      } else {
        setBookmarks([]);
      }
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
      setError('Failed to load bookmarks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedFolderId]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Create folder
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
      await fetchFolders();
    } catch (err) {
      console.error('Error creating folder:', err);
      setError(err.message || 'Failed to create folder');
    }
  };

  // Update folder
  const handleUpdateFolder = async (folderId) => {
    if (!editingFolderName.trim()) {
      setEditingFolderId(null);
      return;
    }
    
    try {
      await apiService.updateBookmarkFolder(folderId, editingFolderName.trim());
      setEditingFolderId(null);
      setEditingFolderName('');
      await fetchFolders();
    } catch (err) {
      console.error('Error updating folder:', err);
      setError(err.message || 'Failed to update folder');
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderId) => {
    try {
      await apiService.deleteBookmarkFolder(folderId);
      setDeletingFolderId(null);
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      await fetchFolders();
      await fetchBookmarks();
    } catch (err) {
      console.error('Error deleting folder:', err);
      setError(err.message || 'Failed to delete folder');
    }
  };

  // Filter bookmarks by type
  const filteredBookmarks = bookmarks.filter(bookmark => {
    if (filter === 'all') return true;
    if (filter === 'judgements') return bookmark.type === 'judgement';
    if (filter === 'acts') return bookmark.type === 'central_act' || bookmark.type === 'state_act';
    if (filter === 'mappings') return bookmark.type === 'bsa_iea_mapping' || bookmark.type === 'bns_ipc_mapping' || bookmark.type === 'bnss_crpc_mapping';
    return true;
  });

  // Handle bookmark removal
  const handleRemoveBookmark = async (bookmarkId, type, itemId) => {
    try {
      if (type === 'judgement') {
        await apiService.removeJudgementBookmark(itemId);
      } else if (type === 'central_act') {
        await apiService.removeActBookmark('central', itemId);
      } else if (type === 'state_act') {
        await apiService.removeActBookmark('state', itemId);
      } else if (type === 'bsa_iea_mapping') {
        await apiService.removeMappingBookmark('bsa_iea', itemId);
      } else if (type === 'bns_ipc_mapping') {
        await apiService.removeMappingBookmark('bns_ipc', itemId);
      } else if (type === 'bnss_crpc_mapping') {
        await apiService.removeMappingBookmark('bnss_crpc', itemId);
      }
      
      // Remove from local state
      setBookmarks(prev => prev.filter(bookmark => bookmark.id !== bookmarkId));
      // Reload folders to update counts
      await fetchFolders();
    } catch (err) {
      console.error('Error removing bookmark:', err);
      setError('Failed to remove bookmark. Please try again.');
    }
  };

  // Handle view item - fetch full details for judgments
  const handleViewItem = async (bookmark) => {
    const item = bookmark.item || bookmark;
    
    if (bookmark.type === 'judgement') {
      // For judgments, fetch full details including PDF link
      try {
        setLoading(true);
        const fullJudgment = await apiService.getJudgementById(item.id);
        
        // Navigate with full judgment data including PDF link
        const judgmentId = fullJudgment?.id || fullJudgment?.cnr || item?.id || item?.cnr;
        const url = judgmentId ? `/judgment/${judgmentId}` : '/judgment';
        navigate(url, { state: { judgment: fullJudgment } });
      } catch (err) {
        console.error('Error fetching judgment details:', err);
        setError('Failed to load judgment details. Please try again.');
        // Fallback to navigate with basic data if full fetch fails
        const judgmentId = item?.id || item?.cnr;
        const url = judgmentId ? `/judgment/${judgmentId}` : '/judgment';
        navigate(url, { state: { judgment: item } });
      } finally {
        setLoading(false);
      }
    } else if (bookmark.type === 'central_act') {
      navigate('/central-acts', { state: { highlightId: item.id } });
    } else if (bookmark.type === 'state_act') {
      navigate('/state-acts', { state: { highlightId: item.id } });
    } else if (bookmark.type === 'bsa_iea_mapping' || bookmark.type === 'bnss_crpc_mapping') {
      // For mappings, navigate to law-mapping page with the mapping type
      const mappingType = bookmark.type === 'bsa_iea_mapping' ? 'bsa_iea' : 'bnss_crpc';
      navigate(`/law-mapping?type=${mappingType}`, { state: { highlightId: item.id } });
    } else if (bookmark.type === 'bns_ipc_mapping') {
      navigate(`/law-mapping?type=bns_ipc`, { state: { highlightId: item.id } });
    }
  };

  // Get item title
  const getItemTitle = (bookmark) => {
    const item = bookmark.item || bookmark;
    
    if (bookmark.type === 'judgement') {
      return item.title || item.case_title || item.case_info || 'Untitled Judgment';
    } else if (bookmark.type === 'central_act' || bookmark.type === 'state_act') {
      return item.short_title || item.title || item.act_name || 'Untitled Act';
    } else if (bookmark.type === 'bsa_iea_mapping' || bookmark.type === 'bns_ipc_mapping' || bookmark.type === 'bnss_crpc_mapping') {
      return item.title || item.subject || item.mapping_title || 'Untitled Mapping';
    }
    
    return 'Untitled Item';
  };

  // Get item description
  const getItemDescription = (bookmark) => {
    const item = bookmark.item || bookmark;
    
    if (bookmark.type === 'judgement') {
      // Handle different field names that might exist in the API response
      return item.court_name || item.court || item.judge || item.title || 'Supreme Court Judgment';
    } else if (bookmark.type === 'central_act' || bookmark.type === 'state_act') {
      return item.ministry || item.department || 'Government Act';
    } else if (bookmark.type === 'bsa_iea_mapping' || bookmark.type === 'bns_ipc_mapping' || bookmark.type === 'bnss_crpc_mapping') {
      return item.description || item.summary || 'Legal Mapping';
    }
    
    return 'Bookmarked Item';
  };

  // Get type display name
  const getTypeDisplayName = (type) => {
    switch (type) {
      case 'judgement': return 'Judgment';
      case 'central_act': return 'Central Act';
      case 'state_act': return 'State Act';
      case 'bsa_iea_mapping': return 'BSA-IEA Mapping';
      case 'bns_ipc_mapping': return 'BNS-IPC Mapping';
      case 'bnss_crpc_mapping': return 'BNSS-CrPC Mapping';
      default: return 'Bookmark';
    }
  };

  // Get type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case 'judgement': return <Gavel className="w-4 h-4" />;
      case 'central_act':
      case 'state_act': return <FileText className="w-4 h-4" />;
      case 'bsa_iea_mapping':
      case 'bns_ipc_mapping':
      case 'bnss_crpc_mapping': return <Scale className="w-4 h-4" />;
      default: return <BookmarkIcon className="w-4 h-4" />;
    }
  };

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  const selectedFolder = selectedFolderId !== null && selectedFolderId !== 0 
    ? folders.find(f => f.id === selectedFolderId) 
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFC' }}>
      <Navbar />
      
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 pt-24">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
              My Bookmarks
            </h1>
            <div className="w-20 h-1 mx-auto mb-6" style={{ backgroundColor: '#CF9B63' }}></div>
            <p className="text-lg max-w-3xl mx-auto" style={{ color: '#8C969F', fontFamily: 'Roboto, sans-serif' }}>
              Access your saved judgments, acts, and legal resources
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Folder Selector - Like Notes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200 bg-gray-50 flex items-center gap-1 px-2 py-1 overflow-x-auto">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {/* Folder Dropdown */}
              <select
                value={selectedFolderId === null ? '' : selectedFolderId === 0 ? 'unfiled' : selectedFolderId}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setSelectedFolderId(null);
                  } else if (value === 'unfiled') {
                    setSelectedFolderId(0);
                  } else {
                    setSelectedFolderId(parseInt(value));
                  }
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                <option value="">All Bookmarks</option>
                <option value="unfiled">Unfiled</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name} ({folder.bookmark_count || 0})
                  </option>
                ))}
              </select>
              
              {/* Add New Folder Button */}
              {showCreateFolder ? (
                <div className="flex items-center gap-1 px-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyPress={async (e) => {
                      if (e.key === 'Enter' && newFolderName.trim()) {
                        e.preventDefault();
                        await handleCreateFolder(e);
                      } else if (e.key === 'Escape') {
                        setShowCreateFolder(false);
                        setNewFolderName('');
                      }
                    }}
                    placeholder="Folder name..."
                    className="px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ fontFamily: 'Roboto, sans-serif', minWidth: '120px' }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (newFolderName.trim()) {
                        await handleCreateFolder(e);
                      }
                    }}
                    className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Create folder"
                    disabled={!newFolderName.trim()}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateFolder(false);
                      setNewFolderName('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreateFolder(true);
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-1"
                  title="Add new folder"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Folder</span>
                </button>
              )}
            </div>
            
            {/* Edit/Delete buttons for selected folder */}
            {selectedFolderId !== null && selectedFolderId !== 0 && folders.find(f => f.id === selectedFolderId) && (
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                {editingFolderId === selectedFolderId ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateFolder(selectedFolderId);
                        } else if (e.key === 'Escape') {
                          setEditingFolderId(null);
                          setEditingFolderName('');
                        }
                      }}
                      className="px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      style={{ fontFamily: 'Roboto, sans-serif', minWidth: '120px' }}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setEditingFolderId(null);
                        setEditingFolderName('');
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        const folder = folders.find(f => f.id === selectedFolderId);
                        if (folder) {
                          setEditingFolderId(folder.id);
                          setEditingFolderName(folder.name);
                        }
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Rename folder"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setDeletingFolderId(selectedFolderId)}
                      className="p-1.5 hover:bg-red-100 rounded transition-colors"
                      title="Delete folder"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
            
            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-red-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-red-700" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {error}
                    </p>
                  </div>
                  <button
                    onClick={() => setError('')}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Filter Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-bold mb-4" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                Filter Bookmarks
              </h2>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'all', label: 'All Bookmarks' },
                  { key: 'judgements', label: 'Judgments' },
                  { key: 'acts', label: 'Acts' },
                  { key: 'mappings', label: 'Mappings' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bookmarks List */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, index) => (
                  <JudgmentSkeleton key={index} />
                ))}
              </div>
            ) : filteredBookmarks.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <BookmarkIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                  {selectedFolder 
                    ? `No Bookmarks in "${selectedFolder.name}"`
                    : filter === 'all' 
                      ? 'No Bookmarks Found' 
                      : `No ${filter.charAt(0).toUpperCase() + filter.slice(1)} Found`}
                </h3>
                <p className="text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {selectedFolder
                    ? 'This folder is empty. Start bookmarking items to organize them.'
                    : filter === 'all' 
                      ? 'You haven\'t bookmarked any items yet. Start exploring and bookmark items you find useful.'
                      : `You haven't bookmarked any ${filter} yet. Try changing the filter or explore more content.`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookmarks.map((bookmark) => {
                  const item = bookmark.item || bookmark;
                  return (
                    <div key={bookmark.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex items-center gap-1">
                              {getTypeIcon(bookmark.type)}
                              {getTypeDisplayName(bookmark.type)}
                            </span>
                            {bookmark.folder && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full flex items-center gap-1">
                                <Folder className="w-3 h-3" />
                                {bookmark.folder.name}
                              </span>
                            )}
                            <span className="text-sm text-gray-500">
                              Bookmarked {new Date(bookmark.created_at || bookmark.createdAt || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                            {getItemTitle(bookmark)}
                          </h3>
                          
                          <p className="text-gray-600 mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>
                            {getItemDescription(bookmark)}
                          </p>
                          
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleViewItem(bookmark)}
                              disabled={loading}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ fontFamily: 'Roboto, sans-serif' }}
                            >
                              {loading && bookmark.type === 'judgement' ? 'Loading...' : 'View Details'}
                            </button>
                            <button
                              onClick={() => handleRemoveBookmark(bookmark.id, bookmark.type, item.id)}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                              style={{ fontFamily: 'Roboto, sans-serif' }}
                            >
                              Remove Bookmark
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary */}
            {!loading && filteredBookmarks.length > 0 && (
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Showing {filteredBookmarks.length} of {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
      </div>

      {/* Delete Folder Confirmation Modal */}
      {deletingFolderId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
              Delete Folder
            </h3>
            <p className="text-gray-700 mb-6" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Are you sure you want to delete "{folders.find(f => f.id === deletingFolderId)?.name}"? 
              Bookmarks in this folder will be moved to "No Folder".
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingFolderId(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFolder(deletingFolderId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
