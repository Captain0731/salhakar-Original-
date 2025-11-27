import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import ReactMarkdown from 'react-markdown';
import { 
  FileText, 
  Folder, 
  Plus, 
  Search, 
  MoreVertical,
  Edit,
  Trash2,
  FolderPlus,
  Calendar,
  Clock,
  Tag,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Save,
  Eye
} from 'lucide-react';

const Notes = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedReferenceType, setSelectedReferenceType] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  // Note popup state
  const [showNotePopup, setShowNotePopup] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // Load folders from API
  useEffect(() => {
    const loadFolders = async () => {
      if (!isAuthenticated) return;
      
      try {
        const response = await apiService.getFolders();
        let foldersData = [];
        if (response.success && response.data?.folders) {
          foldersData = response.data.folders;
        } else if (Array.isArray(response)) {
          foldersData = response;
        } else if (response.data && Array.isArray(response.data)) {
          foldersData = response.data;
        }
        setFolders(foldersData);
      } catch (error) {
        console.error('Error loading folders:', error);
        setFolders([]);
      }
    };

    loadFolders();
  }, [isAuthenticated]);

  // Load notes from API
  useEffect(() => {
    const loadNotes = async () => {
      if (!isAuthenticated) {
        setNotes([]);
        return;
      }

      try {
        setLoading(true);
        const params = {
          page: pagination.page,
          limit: pagination.limit
        };

        if (selectedFolder && selectedFolder.id !== 'unfiled') {
          // Only pass folder_id if it's not "unfiled"
          // For unfiled, we'll filter client-side
          params.folder_id = selectedFolder.id;
        }

        if (selectedReferenceType) {
          params.reference_type = selectedReferenceType;
        }

        if (searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        const response = await apiService.getNotes(params);
        
        let notesData = [];
        let paginationData = pagination;
        
        if (response.success && response.data?.notes) {
          notesData = response.data.notes;
          if (response.data.pagination) {
            paginationData = {
              page: response.data.pagination.page || pagination.page,
              limit: response.data.pagination.limit || pagination.limit,
              total: response.data.pagination.total || 0,
              pages: response.data.pagination.pages || 1
            };
          }
        } else if (Array.isArray(response)) {
          notesData = response;
        } else if (response.data && Array.isArray(response.data)) {
          notesData = response.data;
        }

        // Filter for unfiled notes if needed
        let filteredNotesData = notesData;
        if (selectedFolder && selectedFolder.id === 'unfiled') {
          filteredNotesData = notesData.filter(note => !note.folder_id);
        }

        setNotes(filteredNotesData);
        setPagination(paginationData);
      } catch (error) {
        console.error('Error loading notes:', error);
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [isAuthenticated, pagination.page, selectedFolder, selectedReferenceType, searchQuery]);

  const handleNoteClick = (note) => {
    // Open note in popup for viewing/editing
    setSelectedNote(note);
    setNoteContent(note.content || '');
    setNoteTitle(note.title || '');
    setIsEditing(false);
    setShowNotePopup(true);
  };

  const handleNavigateToReference = async (note) => {
    try {
      if (note.reference_type === 'judgment') {
        const judgment = await apiService.getJudgementById(note.reference_id);
        const judgmentId = judgment?.id || judgment?.cnr || note.reference_id;
        const url = judgmentId ? `/judgment/${judgmentId}` : '/judgment';
        navigate(url, { state: { judgment, openNotes: true, noteId: note.id } });
      } else if (note.reference_type === 'central_act') {
        const act = await apiService.getCentralActById(note.reference_id);
        navigate(`/acts/${act.id || note.reference_id}`, { state: { act, openNotes: true, noteId: note.id } });
      } else if (note.reference_type === 'state_act') {
        const act = await apiService.getStateActById(note.reference_id);
        navigate(`/acts/${act.id || note.reference_id}`, { state: { act, openNotes: true, noteId: note.id } });
      } else {
        // For mappings, navigate to law mapping page
        navigate(`/law-mapping?type=${note.reference_type}`, { 
          state: { highlightId: note.reference_id } 
        });
      }
    } catch (error) {
      console.error('Error navigating to referenced item:', error);
      alert('Failed to load the referenced item');
    }
  };

  const handleSaveNote = async () => {
    if (!selectedNote || !noteContent.trim()) {
      alert('Please enter some content for the note');
      return;
    }

    try {
      setSavingNote(true);
      const noteData = {
        title: noteTitle.substring(0, 200),
        content: noteContent,
        folder_id: selectedNote.folder_id || null
      };

      await apiService.updateNote(selectedNote.id, noteData);
      
      // Update the note in the list
      setNotes(prev => prev.map(note => 
        note.id === selectedNote.id 
          ? { ...note, title: noteTitle, content: noteContent, updated_at: new Date().toISOString() }
          : note
      ));
      
      setIsEditing(false);
      alert('Note saved successfully!');
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleFolderClick = (folder) => {
    setSelectedFolder(selectedFolder?.id === folder.id ? null : folder);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleDeleteNote = async (noteId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await apiService.deleteNote(noteId);
      // Reload notes
      setNotes(prev => prev.filter(note => note.id !== noteId));
      setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName || !folderName.trim()) return;

    try {
      const response = await apiService.createFolder({ name: folderName.trim() });
      if (response.success && response.data?.folder) {
        setFolders(prev => [...prev, response.data.folder]);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder. Please try again.');
    }
  };

  const handleDeleteFolder = async (folderId, e) => {
    e.stopPropagation();
    
    const folder = folders.find(f => f.id === folderId);
    const folderNotesCount = getFolderNotes(folderId).length;
    
    const confirmMessage = folderNotesCount > 0
      ? `Are you sure you want to delete "${folder?.name}"? This folder contains ${folderNotesCount} note(s). The notes will be moved to "Unfiled" but will not be deleted.`
      : `Are you sure you want to delete "${folder?.name}"?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await apiService.deleteFolder(folderId);
      
      // Remove folder from state
      setFolders(prev => prev.filter(f => f.id !== folderId));
      
      // If this folder was selected, clear the selection
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
      }
      
      // Reload notes to reflect the change (notes will now be unfiled)
      // The useEffect will automatically reload notes when selectedFolder changes
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Failed to delete folder. Please try again.');
    }
  };

  const getFolderNotes = (folderId) => {
    return notes.filter(note => note.folder_id === folderId);
  };

  const getReferenceTypeLabel = (type) => {
    const labels = {
      'judgment': 'Judgment',
      'central_act': 'Central Act',
      'state_act': 'State Act',
      'bns_ipc_mapping': 'BNS-IPC Mapping',
      'bsa_iea_mapping': 'BSA-IEA Mapping',
      'bnss_crpc_mapping': 'BNSS-CrPC Mapping'
    };
    return labels[type] || type;
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
              Notes
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Organize and manage your legal research notes
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-3 sm:gap-0">
            <button 
              onClick={handleCreateFolder}
              className="px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:shadow-lg flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm w-full sm:w-auto"
              style={{ 
                backgroundColor: '#1E65AD', 
                color: 'white',
                fontFamily: 'Roboto, sans-serif'
              }}
            >
              <FolderPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>New Folder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
              }}
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-xs sm:text-sm"
              style={{ fontFamily: 'Roboto, sans-serif' }}
            />
          </div>
          <select
            value={selectedReferenceType}
            onChange={(e) => {
              setSelectedReferenceType(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
            }}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-xs sm:text-sm"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            <option value="">All Types</option>
            <option value="judgment">Judgments</option>
            <option value="central_act">Central Acts</option>
            <option value="state_act">State Acts</option>
            <option value="bns_ipc_mapping">BNS-IPC Mappings</option>
            <option value="bsa_iea_mapping">BSA-IEA Mappings</option>
            <option value="bnss_crpc_mapping">BNSS-CrPC Mappings</option>
          </select>
        </div>
      </div>

      {/* Folders Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
          Folders
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Unfiled folder */}
          <div
            onClick={() => {
              setSelectedFolder(selectedFolder?.id === 'unfiled' ? null : { id: 'unfiled', name: 'Unfiled' });
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedFolder?.id === 'unfiled' ? 'ring-2 ring-offset-2 ring-blue-500' : ''
            }`}
            style={{
              borderColor: selectedFolder?.id === 'unfiled' ? '#1E65AD' : '#E5E7EB',
              backgroundColor: selectedFolder?.id === 'unfiled' ? '#E3F2FD' : 'white'
            }}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                <div 
                  className="p-1.5 sm:p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: '#E3F2FD' }}
                >
                  <Folder className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#1E65AD' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    Unfiled
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    {notes.filter(note => !note.folder_id).length} notes
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {folders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => handleFolderClick(folder)}
              className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg relative ${
                selectedFolder?.id === folder.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''
              }`}
              style={{
                borderColor: selectedFolder?.id === folder.id ? '#1E65AD' : '#E5E7EB',
                backgroundColor: selectedFolder?.id === folder.id ? '#E3F2FD' : 'white'
              }}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <div 
                    className="p-1.5 sm:p-2 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: '#E3F2FD' }}
                  >
                    <Folder className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#1E65AD' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {folder.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {getFolderNotes(folder.id).length} notes
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteFolder(folder.id, e)}
                  className="p-1.5 rounded hover:bg-red-100 flex-shrink-0 transition-colors"
                  title="Delete folder"
                  style={{ marginLeft: '0.5rem' }}
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
          <h2 className="text-base sm:text-lg font-semibold truncate flex-1 min-w-0" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
            <span className="hidden sm:inline">{selectedFolder ? `${selectedFolder.name} Notes` : 'All Notes'}</span>
            <span className="sm:hidden">{selectedFolder ? selectedFolder.name : 'All Notes'}</span>
            <span className="ml-1 sm:ml-2">({pagination.total})</span>
          </h2>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
              style={{ color: viewMode === 'grid' ? '#1E65AD' : '#6B7280' }}
              title="Grid View"
            >
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
              style={{ color: viewMode === 'list' ? '#1E65AD' : '#6B7280' }}
              title="List View"
            >
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-gray-500 text-xs sm:text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Loading notes...
            </p>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-500 text-xs sm:text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>
              No notes found. Create your first note from a judgment or act!
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {notes.map((note) => {
              const folder = folders.find(f => f.id === note.folder_id);
              return (
                <div
                  key={note.id}
                  onClick={() => handleNoteClick(note)}
                  className="p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-gray-200 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 bg-white relative"
                >
                  <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800" style={{ fontFamily: 'Roboto, sans-serif' }}>
                          {getReferenceTypeLabel(note.reference_type)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1.5 sm:mb-2 line-clamp-2 text-sm sm:text-base" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {note.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-3 mb-2 sm:mb-3" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {note.content?.substring(0, 150)}...
                      </p>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id, e);
                        }}
                        className="p-1 sm:p-1 rounded hover:bg-red-100 flex-shrink-0"
                        title="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 gap-2">
                    <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0 flex-1">
                      {folder ? (
                        <span
                          className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium truncate bg-blue-100 text-blue-800"
                          style={{ fontFamily: 'Roboto, sans-serif' }}
                        >
                          {folder.name}
                        </span>
                      ) : (
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
                          Unfiled
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-[10px] sm:text-xs text-gray-500 flex-shrink-0" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="whitespace-nowrap">{new Date(note.updated_at || note.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {notes.map((note) => {
              const folder = folders.find(f => f.id === note.folder_id);
              return (
                <div
                  key={note.id}
                  onClick={() => handleNoteClick(note)}
                  className="p-3 sm:p-4 rounded-lg border border-gray-200 cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-gray-50 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 sm:space-x-4 flex-1 min-w-0">
                    <div 
                      className="p-2 sm:p-2.5 md:p-3 rounded-lg flex-shrink-0 bg-blue-100"
                    >
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800" style={{ fontFamily: 'Roboto, sans-serif' }}>
                          {getReferenceTypeLabel(note.reference_type)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-0.5 sm:mb-1 text-sm sm:text-base truncate" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {note.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-1 mb-1.5 sm:mb-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {note.content?.substring(0, 100)}...
                      </p>
                      <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        {folder ? (
                          <span className="flex items-center space-x-1">
                            <Folder className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{folder.name}</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-gray-400">
                            <Folder className="h-3 w-3 flex-shrink-0" />
                            <span>Unfiled</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>{new Date(note.updated_at || note.updatedAt).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note.id, e);
                    }}
                    className="p-1.5 sm:p-2 rounded hover:bg-red-100 flex-shrink-0"
                    title="Delete note"
                  >
                    <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-4 sm:mt-6 pt-4 border-t border-gray-200">
            <div className="text-xs sm:text-sm text-gray-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} notes
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs sm:text-sm text-gray-700 px-2" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Note Popup Modal */}
      {showNotePopup && selectedNote && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => {
              setShowNotePopup(false);
              setIsEditing(false);
            }}
          />
          
          {/* Popup */}
          <div
            className="fixed bg-white rounded-lg shadow-2xl z-50 flex flex-col"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90vw',
              maxWidth: '800px',
              maxHeight: '90vh',
              fontFamily: 'Roboto, sans-serif'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0"
              style={{ 
                background: 'linear-gradient(90deg, #1E65AD 0%, #CF9B63 100%)',
                borderTopLeftRadius: '0.5rem',
                borderTopRightRadius: '0.5rem'
              }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="h-5 w-5 text-white flex-shrink-0" />
                {isEditing ? (
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="flex-1 px-2 py-1 rounded text-white bg-white bg-opacity-20 placeholder-white placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                    placeholder="Note title..."
                    style={{ fontFamily: 'Roboto, sans-serif', color: 'white' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <h3 className="text-lg font-bold text-white truncate" style={{ fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                    {noteTitle || 'Untitled Note'}
                  </h3>
                )}
                <span className="px-2 py-1 rounded text-xs font-medium bg-white bg-opacity-20 text-white" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  {getReferenceTypeLabel(selectedNote.reference_type)}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isEditing ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(true);
                      }}
                      className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                      title="Edit note"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateToReference(selectedNote);
                      }}
                      className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                      title="View referenced item"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotePopup(false);
                    setIsEditing(false);
                  }}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: '300px', maxHeight: 'calc(90vh - 200px)' }}>
              {isEditing ? (
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write your notes here... (Markdown supported)"
                  className="w-full h-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  style={{ 
                    fontFamily: 'Roboto, sans-serif',
                    minHeight: '400px',
                    fontSize: '14px',
                    lineHeight: '1.6'
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="prose prose-sm max-w-none p-4" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  <ReactMarkdown>{noteContent || '*No content*'}</ReactMarkdown>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-gray-600" style={{ fontFamily: 'Roboto, sans-serif' }}>
                <Clock className="h-4 w-4" />
                <span>Updated: {new Date(selectedNote.updated_at || selectedNote.updatedAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditing(false);
                        setNoteContent(selectedNote.content || '');
                        setNoteTitle(selectedNote.title || '');
                      }}
                      className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                      disabled={savingNote}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveNote();
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                      disabled={savingNote}
                    >
                      <Save className="h-4 w-4" />
                      {savingNote ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateToReference(selectedNote);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
                    style={{ fontFamily: 'Roboto, sans-serif' }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Source
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Notes;

