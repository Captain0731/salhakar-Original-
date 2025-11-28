import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/landing/Navbar";

export default function LegalTemplate() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateDetails, setShowTemplateDetails] = useState(false);


  const categories = [
    "Property Law",
    "Family Law",
    "Labor Law",
    "Corporate Law",
    "Consumer Law",
    "General Law",
    "Criminal Law",
    "Civil Law"
  ];

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    
    // Filter default templates based on search query and category
    let filtered = [...defaultTemplates];
    
    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(template => 
        template.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template => 
        template.title.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query)) ||
        template.category.toLowerCase().includes(query)
      );
    }
    
    setTemplates(filtered);
    
    if (filtered.length === 0) {
      setError("No templates found matching your search criteria.");
    }
    
    setLoading(false);
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setSearchQuery("");
    setTemplates(defaultTemplates);
    setError("");
  };

  const viewDocument = (template) => {
    // Navigate to document editor page
    const documentPath = template.path || `/documents/${template.title.replace(/\s+/g, '%20')}.${template.fileType || 'html'}`;
    navigate('/document-editor', { 
      state: { 
        documentPath: documentPath,
        templateTitle: template.title,
        templateId: template.id
      } 
    });
  };

  const viewTemplateDetails = (template) => {
    setSelectedTemplate(template);
    setShowTemplateDetails(true);
  };

  const closeTemplateDetails = () => {
    setShowTemplateDetails(false);
    setSelectedTemplate(null);
  };

  const downloadTemplate = (template) => {
    // In a real app, this would trigger a download
    console.log("Downloading template:", template.title);
    alert(`Downloading: ${template.title}\n\nThis would download the template file in a real application.`);
  };

  const getRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push("★");
    }
    if (hasHalfStar) {
      stars.push("☆");
    }
    while (stars.length < 5) {
      stars.push("☆");
    }
    return stars.join("");
  };

  // Default templates
  const defaultTemplates = [
    {
      id: 1,
      title: "Vendor Evaluation Template",
      category: "Corporate Law",
      type: "Evaluation Form",
      description: "Comprehensive vendor evaluation template for assessing and selecting vendors. Includes evaluation criteria, scoring system, and approval workflow.",
      format: "HTML",
      size: "148 KB",
      pages: 5,
      downloads: 1247,
      rating: 4.5,
      lastUpdated: new Date('2024-11-28'),
      tags: ["vendor", "evaluation", "corporate", "assessment", "procurement"],
      features: [
        "Vendor information section",
        "Evaluation criteria checklist",
        "Scoring and rating system",
        "Approval workflow",
        "Terms and conditions"
      ],
      preview: "This template helps organizations systematically evaluate and select vendors based on multiple criteria including quality, pricing, delivery, and service.",
      path: "/documents/Vendor Evaluation Template 2.htm",
      fileType: "html"
    }
  ];

  useEffect(() => {
    // Load default templates
    setTemplates(defaultTemplates);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFC' }}>
      <Navbar />
      <div className="p-6 pt-24">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
              Legal Templates
            </h1>
            <p className="text-lg" style={{ color: '#8C969F', fontFamily: 'Roboto, sans-serif' }}>
              Access professional legal document templates and forms for various legal needs
            </p>
          </div>

          {/* Search Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
              Search Templates
            </h2>
            
            {/* Main Search Bar */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by template name, category, or keywords..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                    style={{ fontFamily: 'Roboto, sans-serif', '--tw-ring-color': '#1E65AD' }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  style={{ backgroundColor: '#1E65AD', fontFamily: 'Roboto, sans-serif', minHeight: '44px' }}
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1E65AD', fontFamily: 'Roboto, sans-serif' }}>
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                style={{ fontFamily: 'Roboto, sans-serif', '--tw-ring-color': '#1E65AD' }}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{ backgroundColor: '#1E65AD', fontFamily: 'Roboto, sans-serif' }}
              >
                {loading ? "Searching..." : "Apply Filters"}
              </button>
              <button
                onClick={clearFilters}
                className="px-6 py-2 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 border-2"
                style={{ 
                  color: '#8C969F', 
                  borderColor: '#8C969F', 
                  fontFamily: 'Roboto, sans-serif' 
                }}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                Legal Templates & Forms
              </h2>
              <span className="text-sm" style={{ color: '#8C969F', fontFamily: 'Roboto, sans-serif' }}>
                {templates.length} templates found
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Searching templates...</p>
                </div>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-2">No templates found</div>
                <p className="text-gray-400">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                          {template.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {template.category}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                            {template.type}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium" style={{ color: '#8C969F' }}>
                          {template.rating}
                        </div>
                        <div className="text-xs" style={{ color: '#CF9B63' }}>
                          {getRatingStars(template.rating)}
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {template.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-4" style={{ color: '#8C969F' }}>
                      <div><strong>Format:</strong> {template.format}</div>
                      <div><strong>Size:</strong> {template.size}</div>
                      <div><strong>Pages:</strong> {template.pages}</div>
                      <div><strong>Downloads:</strong> {template.downloads}</div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          style={{ fontFamily: 'Roboto, sans-serif' }}
                        >
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          +{template.tags.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => viewDocument(template)}
                        className="w-full px-4 py-2 bg-[#1E65AD] text-white rounded-lg hover:bg-[#1a5a9a] transition-colors font-medium text-sm flex items-center justify-center gap-2"
                        style={{ fontFamily: 'Roboto, sans-serif' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        View Details / Edit
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewTemplateDetails(template)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                          style={{ fontFamily: 'Roboto, sans-serif' }}
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => downloadTemplate(template)}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                          style={{ fontFamily: 'Roboto, sans-serif' }}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Details Modal */}
      {showTemplateDetails && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#1E65AD', fontFamily: 'Helvetica Hebrew Bold, sans-serif' }}>
                  {selectedTemplate.title}
                </h2>
                <button
                  onClick={closeTemplateDetails}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-3" style={{ color: '#1E65AD' }}>Template Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Category:</strong> {selectedTemplate.category}</div>
                    <div><strong>Type:</strong> {selectedTemplate.type}</div>
                    <div><strong>Format:</strong> {selectedTemplate.format}</div>
                    <div><strong>Size:</strong> {selectedTemplate.size}</div>
                    <div><strong>Pages:</strong> {selectedTemplate.pages}</div>
                    <div><strong>Downloads:</strong> {selectedTemplate.downloads}</div>
                    <div><strong>Rating:</strong> {selectedTemplate.rating} {getRatingStars(selectedTemplate.rating)}</div>
                    <div><strong>Last Updated:</strong> {new Date(selectedTemplate.lastUpdated).toLocaleDateString()}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3" style={{ color: '#1E65AD' }}>Description</h3>
                  <p className="text-gray-600 text-sm mb-4" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    {selectedTemplate.description}
                  </p>
                  <h4 className="font-semibold mb-2" style={{ color: '#1E65AD' }}>Preview</h4>
                  <p className="text-gray-600 text-sm" style={{ fontFamily: 'Roboto, sans-serif' }}>
                    {selectedTemplate.preview}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3" style={{ color: '#1E65AD' }}>Key Features</h3>
                <ul className="list-disc list-inside space-y-1 text-sm" style={{ color: '#8C969F', fontFamily: 'Roboto, sans-serif' }}>
                  {selectedTemplate.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3" style={{ color: '#1E65AD' }}>Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => downloadTemplate(selectedTemplate)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  Download Template
                </button>
                <button
                  onClick={closeTemplateDetails}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
