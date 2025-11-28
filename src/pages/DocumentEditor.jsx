import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  Edit,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Type,
  CheckSquare,
  Upload,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import './DocumentEditor.css';

/**
 * DocumentEditor Component
 * 
 * A comprehensive document editor for legal templates with:
 * - Rich text editing capabilities
 * - Checkbox insertion
 * - Image upload (normal images and signatures)
 * - Edit/Preview mode switching
 * - PDF export functionality
 */
export default function DocumentEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const [editorContent, setEditorContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [fontSize, setFontSize] = useState('12pt');
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  // Get document path from location state
  const documentPath = location.state?.documentPath || 
                      new URLSearchParams(location.search).get('path') || 
                      '/documents/Vendor Evaluation Template 2.htm';
  const templateTitle = location.state?.templateTitle || 'Vendor Evaluation Template';

  /**
   * Load HTML document from the provided path
   * Extracts body content and cleans up Word-specific tags while preserving structure
   */
  useEffect(() => {
    loadDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDocument = async () => {
    setLoading(true);
    setError('');
    
    try {
      setFileName(templateTitle);

      // Fetch the HTML document
      const response = await fetch(documentPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }
      
      const htmlContent = await response.text();
      
      // Extract body content from HTML
      let content = htmlContent;
      
      // Try to extract body content
      const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        content = bodyMatch[1];
      } else {
        // If no body tag, try to extract WordSection1 div
        const divMatch = htmlContent.match(/<div[^>]*class="?WordSection1"?[^>]*>([\s\S]*)<\/div>/i);
        if (divMatch) {
          content = divMatch[1];
        }
      }
      
      // Use a more careful approach to preserve formatting
      // First, do basic cleanup of Word-specific tags
      content = content
        .replace(/<o:p[^>]*>/gi, '')
        .replace(/<\/o:p>/gi, '')
        .replace(/<w:[^>]*>.*?<\/w:[^>]*>/gi, '')
        .replace(/<v:[^>]*>.*?<\/v:[^>]*>/gi, '')
        .replace(/<o:[^>]*>.*?<\/o:[^>]*>/gi, '')
        .replace(/<![if[^>]*>.*?<!\[endif\]>/gi, '')
        .replace(/xmlns[^=]*="[^"]*"/gi, '');
      
      // Create a temporary DOM element to parse and clean HTML properly
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      
      // Clean up styles but preserve important formatting
      const allElements = tempDiv.querySelectorAll('*');
      allElements.forEach(el => {
        // Remove MSO classes but keep other classes
        if (el.className) {
          const classList = Array.isArray(el.classList) 
            ? Array.from(el.classList) 
            : (typeof el.className === 'string' ? el.className.split(' ') : []);
          const cleanClasses = classList.filter(c => c && !c.includes('Mso'));
          if (cleanClasses.length > 0) {
            el.className = cleanClasses.join(' ');
          } else {
            el.removeAttribute('class');
          }
        }
        
        // Clean up style attribute - remove MSO styles but keep others
        const styleAttr = el.getAttribute('style');
        if (styleAttr) {
          const styles = styleAttr.split(';').filter(s => {
            const trimmed = s.trim();
            return trimmed && !trimmed.toLowerCase().includes('mso-');
          });
          
          // Preserve important styles: font-size, font-family, color, text-align, margin, padding, border, etc.
          const importantStyles = styles.filter(s => {
            const key = s.split(':')[0].trim().toLowerCase();
            return ['font-size', 'font-family', 'color', 'text-align', 'margin', 'padding', 
                    'border', 'line-height', 'font-weight', 'font-style', 'text-decoration',
                    'vertical-align', 'width', 'height'].some(prop => key.includes(prop));
          });
          
          if (importantStyles.length > 0) {
            el.setAttribute('style', importantStyles.join(';'));
          } else {
            el.removeAttribute('style');
          }
        }
        
        // Remove xmlns and namespace attributes
        Array.from(el.attributes || []).forEach(attr => {
          if (attr.name.startsWith('xmlns') || attr.name.includes(':') || 
              attr.name === 'lang' && attr.value === 'EN-IN') {
            // Keep lang but remove others
            if (!attr.name.startsWith('xmlns') && !attr.name.includes(':')) {
              return;
            }
            el.removeAttribute(attr.name);
          }
        });
      });
      
      // Get cleaned content
      content = tempDiv.innerHTML;
      
      // Final cleanup - remove any remaining problematic attributes
      content = content
        .replace(/class="[^"]*Mso[^"]*"/gi, '')
        .replace(/style="[^"]*mso-[^"]*"/gi, (match) => {
          // Remove mso- styles but keep the rest
          return match.replace(/[^;]*mso-[^;]*;?/gi, '').replace(/style="\s*"/, '');
        });
      
      // Ensure signature placeholder exists (check in the parsed DOM)
      const finalDiv = document.createElement('div');
      finalDiv.innerHTML = content;
      const signaturePlaceholder = finalDiv.querySelector('#signature-placeholder');
      if (!signaturePlaceholder) {
        const sigDiv = document.createElement('div');
        sigDiv.id = 'signature-placeholder';
        sigDiv.style.marginTop = '40px';
        sigDiv.style.padding = '20px';
        sigDiv.style.border = '1px dashed #ccc';
        sigDiv.style.textAlign = 'center';
        sigDiv.style.minHeight = '100px';
        sigDiv.innerHTML = '<p style="color: #999; margin: 0;">[Signature will appear here]</p>';
        finalDiv.appendChild(sigDiv);
        content = finalDiv.innerHTML;
      } else {
        content = finalDiv.innerHTML;
      }
      
      // Set both current and original content
      setEditorContent(content);
      setOriginalContent(content);
      
      // Auto-focus editor after content loads
      setTimeout(() => {
        if (editorRef.current && !previewMode) {
          editorRef.current.focus();
        }
      }, 200);
      
    } catch (err) {
      console.error('Error loading document:', err);
      setError(`Failed to load document: ${err.message}. Please make sure the document file exists.`);
      setEditorContent('<div style="padding: 20px;"><p>Document could not be loaded. Please try again or contact support.</p></div>');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format text using document.execCommand
   */
  const formatText = (command, value = null) => {
    if (editorRef.current && !previewMode) {
      editorRef.current.focus();
      setTimeout(() => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
      }, 10);
    }
  };

  /**
   * Change font size
   */
  const changeFontSize = (size) => {
    setFontSize(size);
    formatText('fontSize', size.replace('pt', ''));
  };

  /**
   * Insert checkbox at current cursor position
   */
  const insertCheckbox = () => {
    if (!editorRef.current || previewMode) return;
    
    editorRef.current.focus();
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Insert space before if needed
      if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
        const text = range.startContainer.textContent;
        if (text[range.startOffset - 1] !== ' ') {
          range.insertNode(document.createTextNode(' '));
          range.setStart(range.startContainer, range.startOffset + 1);
        }
      }
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'doc-checkbox';
      checkbox.style.margin = '0 4px';
      checkbox.style.verticalAlign = 'middle';
      checkbox.style.cursor = 'pointer';
      
      range.insertNode(checkbox);
      
      // Insert space after checkbox
      const spaceAfter = document.createTextNode(' ');
      range.setStartAfter(checkbox);
      range.insertNode(spaceAfter);
      
      // Move cursor after space
      range.setStartAfter(spaceAfter);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Update editor content
      setEditorContent(editorRef.current.innerHTML);
    }
    
    setTimeout(() => {
      editorRef.current?.focus();
    }, 50);
  };

  /**
   * Handle normal image upload
   */
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      setError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    if (!editorRef.current || previewMode) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      editorRef.current.focus();
      const selection = window.getSelection();
      
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const img = document.createElement('img');
        img.src = base64;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '10px 0';
        
        range.insertNode(img);
        
        // Insert line break after image
        const br = document.createElement('br');
        range.setStartAfter(img);
        range.insertNode(br);
        range.setStartAfter(br);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        setEditorContent(editorRef.current.innerHTML);
      }
      
      setTimeout(() => {
        editorRef.current?.focus();
      }, 50);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  /**
   * Handle signature upload
   */
  const handleSignatureUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      setError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      
      if (editorRef.current) {
        const editor = editorRef.current;
        let signatureDiv = editor.querySelector('#signature-placeholder');
        
        if (!signatureDiv) {
          signatureDiv = document.createElement('div');
          signatureDiv.id = 'signature-placeholder';
          signatureDiv.style.marginTop = '40px';
          signatureDiv.style.padding = '20px';
          signatureDiv.style.border = '1px dashed #ccc';
          signatureDiv.style.textAlign = 'center';
          signatureDiv.style.minHeight = '100px';
          editor.appendChild(signatureDiv);
        }
        
        signatureDiv.innerHTML = '';
        const img = document.createElement('img');
        img.src = base64;
        img.style.maxWidth = '300px';
        img.style.height = 'auto';
        img.style.display = 'inline-block';
        img.style.border = 'none';
        img.alt = 'Signature';
        signatureDiv.appendChild(img);
        
        setEditorContent(editor.innerHTML);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  /**
   * Handle content changes
   */
  const handleContentChange = () => {
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
  };

  /**
   * Toggle Preview mode
   */
  const togglePreview = () => {
    if (previewMode) {
      setPreviewMode(false);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
      }, 100);
    } else {
      setPreviewMode(true);
      if (editorRef.current) {
        setEditorContent(editorRef.current.innerHTML);
      }
    }
  };

  /**
   * Export to PDF
   */
  const exportToPDF = async () => {
    if (!editorContent) {
      setError('No content to export');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = editorContent;
      tempDiv.style.width = '210mm';
      tempDiv.style.padding = '20mm';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '12pt';
      tempDiv.style.lineHeight = '1.6';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.color = 'black';
      
      // Ensure checkboxes are visible
      const checkboxes = tempDiv.querySelectorAll('.doc-checkbox, input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.style.width = '14px';
        cb.style.height = '14px';
        cb.style.display = 'inline-block';
      });
      
      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: tempDiv.offsetWidth,
        height: tempDiv.offsetHeight,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(tempDiv);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${fileName || 'Vendor-Evaluation-Template'}_edited.pdf`);
      
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      setError(`Failed to export PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="document-editor-page">
      <Navbar />
      <div className="editor-container">
        {/* Header Bar */}
        <div className="editor-header">
          <div className="header-left">
            <button
              onClick={() => navigate('/legal-template')}
              className="back-button"
              title="Back to Templates"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="editor-title">{fileName || 'Vendor Evaluation Template'} – Editor</h1>
          </div>
          <div className="header-right">
            {!previewMode ? (
              <button
                onClick={togglePreview}
                className="header-btn preview-btn"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
            ) : (
              <button
                onClick={togglePreview}
                className="header-btn exit-preview-btn"
              >
                <Edit className="w-4 h-4" />
                Exit Preview
              </button>
            )}
            <button
              onClick={exportToPDF}
              disabled={!editorContent || loading}
              className="header-btn download-btn"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => setError('')} className="error-close">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>{editorContent ? 'Exporting PDF...' : 'Loading document...'}</p>
          </div>
        )}

        {/* Formatting Toolbar - Only visible in Edit mode */}
        {!previewMode && !loading && (
          <div className="toolbar">
            {/* Text Formatting */}
            <div className="toolbar-group">
              <button
                onClick={() => formatText('bold')}
                className="toolbar-btn"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => formatText('italic')}
                className="toolbar-btn"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => formatText('underline')}
                className="toolbar-btn"
                title="Underline"
              >
                <Underline className="w-4 h-4" />
              </button>
            </div>

            {/* Font Size */}
            <div className="toolbar-group">
              <select
                value={fontSize}
                onChange={(e) => changeFontSize(e.target.value)}
                className="font-size-select"
                title="Font Size"
              >
                <option value="8pt">8pt</option>
                <option value="10pt">10pt</option>
                <option value="12pt">12pt</option>
                <option value="14pt">14pt</option>
                <option value="16pt">16pt</option>
                <option value="18pt">18pt</option>
                <option value="24pt">24pt</option>
              </select>
            </div>

            {/* Alignment */}
            <div className="toolbar-group">
              <button
                onClick={() => formatText('justifyLeft')}
                className="toolbar-btn"
                title="Align Left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => formatText('justifyCenter')}
                className="toolbar-btn"
                title="Align Center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => formatText('justifyRight')}
                className="toolbar-btn"
                title="Align Right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => formatText('justifyFull')}
                className="toolbar-btn"
                title="Justify"
              >
                <AlignJustify className="w-4 h-4" />
              </button>
            </div>

            {/* Lists */}
            <div className="toolbar-group">
              <button
                onClick={() => formatText('insertUnorderedList')}
                className="toolbar-btn"
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => formatText('insertOrderedList')}
                className="toolbar-btn"
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
            </div>

            {/* Special Insertions */}
            <div className="toolbar-group">
              <button
                onClick={insertCheckbox}
                className="toolbar-btn"
                title="Insert Checkbox"
              >
                <CheckSquare className="w-4 h-4" />
                Checkbox
              </button>
            </div>

            {/* Image Upload */}
            <div className="toolbar-group">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleImageUpload}
                className="hidden-input"
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                className="toolbar-btn"
                title="Insert Image"
              >
                <ImageIcon className="w-4 h-4" />
                Image
              </button>
            </div>

            {/* Signature Upload */}
            <div className="toolbar-group">
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleSignatureUpload}
                className="hidden-input"
              />
              <button
                onClick={() => signatureInputRef.current?.click()}
                className="toolbar-btn signature-btn"
                title="Upload Signature"
              >
                <Upload className="w-4 h-4" />
                Signature
              </button>
            </div>
          </div>
        )}

        {/* Editor/Preview Content */}
        {!loading && editorContent && (
          <div className="document-wrapper">
            <div className="document-page">
              {previewMode ? (
                <div
                  className="preview-content"
                  dangerouslySetInnerHTML={{ __html: editorContent }}
                />
              ) : (
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleContentChange}
                  className="editable-content"
                  dangerouslySetInnerHTML={{ __html: editorContent }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

