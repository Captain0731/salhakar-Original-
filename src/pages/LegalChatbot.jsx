import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/landing/Navbar";
import { 
  Send, Bot, User, X, RotateCcw, Mic, MicOff, Upload, 
  Search, Code, Image, BookOpen, Globe, Copy, ThumbsUp, 
  ThumbsDown, Save, MoreVertical, ArrowLeft, RefreshCw, 
  Edit, Paperclip, ChevronRight, HelpCircle, Building2, 
  SquareStack, Lightbulb, Settings, Share2, Shuffle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import apiService from "../services/api";

export default function LegalChatbot() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  const quickQuestions = [
    "What are my rights as a tenant?",
    "How do I file a consumer complaint?",
    "What is the process for property registration?",
    "How to draft a legal notice?",
    "What are the grounds for divorce?",
    "How to register a business?",
    "What is the procedure for will registration?",
    "How to file an RTI application?"
  ];

  useEffect(() => {
    // Initialize with welcome message
    setMessages([
      {
        id: 1,
        text: "Hello! I'm Kiki, your AI Legal Assistant. I can help you with various legal questions and provide guidance on legal matters. How can I assist you today?",
        sender: "bot",
        timestamp: new Date().toISOString()
      }
    ]);
  }, []);

  const scrollToBottom = useCallback(() => {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      setTimeout(() => {
        // Try scrolling the messages container first
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
        // Also try scrolling to the end ref element
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      }, 150);
    });
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added or typing state changes
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isTyping, scrollToBottom]);

  // Additional scroll when typing indicator appears/disappears
  useEffect(() => {
    if (isTyping) {
      scrollToBottom();
    }
  }, [isTyping, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    
    // Scroll to bottom immediately after adding user message
    setTimeout(() => {
      scrollToBottom();
    }, 50);
    
    setLoading(true);
    setIsTyping(true);

    try {
      // Call the AI Assistant API
      const response = await apiService.llmChat(currentInput);
      
      const botResponse = {
        id: Date.now() + 1,
        text: response.reply || "I'm sorry, I couldn't process your request. Please try again.",
        sender: "bot",
        timestamp: new Date().toISOString(),
        usedTools: response.used_tools || false,
        toolUsed: response.tool_used || null,
        searchInfo: response.search_info || null
      };

      setMessages(prev => [...prev, botResponse]);
      
      // Scroll to bottom after bot response
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('Error getting bot response:', error);
      const errorResponse = {
        id: Date.now() + 1,
        text: "I'm sorry, there was an error processing your message. Please try again.",
        sender: "bot",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorResponse]);
      
      // Scroll to bottom after error response
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  // Voice Recording Functions
  const startRecording = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      const streamRef = stream; // Store stream reference

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleVoiceInput(audioBlob);
        
        // Stop all tracks
        streamRef.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const handleVoiceInput = async (audioBlob) => {
    setIsProcessingVoice(true);
    setIsTyping(true);

    try {
      // Create a File object from the blob
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      
      // Call the Speech API
      const response = await apiService.speechToGemini(audioFile);

      // Note: The new API doesn't return transcription separately
      // The transcription is handled internally and only the AI reply is returned
      // We'll show a placeholder message for voice input
      const userMessage = {
        id: Date.now(),
        text: "[Voice message]",
        sender: "user",
        timestamp: new Date().toISOString(),
        isVoice: true
      };
      setMessages(prev => [...prev, userMessage]);
      setTimeout(() => scrollToBottom(), 50);

      // Add bot response
      const botResponse = {
        id: Date.now() + 1,
        text: response.reply || "I'm sorry, I couldn't process your voice input. Please try again.",
        sender: "bot",
        timestamp: new Date().toISOString(),
        usedTools: response.used_tools || false,
        toolUsed: response.tool_used || null,
        searchInfo: response.search_info || null
      };
      setMessages(prev => [...prev, botResponse]);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error processing voice input:', error);
      const errorResponse = {
        id: Date.now() + 1,
        text: "I'm sorry, there was an error processing your voice input. Please try again.",
        sender: "bot",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsProcessingVoice(false);
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file.');
      return;
    }

    setIsProcessingVoice(true);
    setIsTyping(true);

    try {
      const response = await apiService.speechToGemini(file);

      // Note: The new API doesn't return transcription separately
      // The transcription is handled internally and only the AI reply is returned
      // We'll show a placeholder message for uploaded audio
      const userMessage = {
        id: Date.now(),
        text: "[Audio file uploaded]",
        sender: "user",
        timestamp: new Date().toISOString(),
        isVoice: true
      };
      setMessages(prev => [...prev, userMessage]);
      setTimeout(() => scrollToBottom(), 50);

      // Add bot response
      const botResponse = {
        id: Date.now() + 1,
        text: response.reply || "I'm sorry, I couldn't process your audio file. Please try again.",
        sender: "bot",
        timestamp: new Date().toISOString(),
        usedTools: response.used_tools || false,
        toolUsed: response.tool_used || null,
        searchInfo: response.search_info || null
      };
      setMessages(prev => [...prev, botResponse]);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error processing audio file:', error);
      const errorResponse = {
        id: Date.now() + 1,
        text: "I'm sorry, there was an error processing your audio file. Please try again.",
        sender: "bot",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsProcessingVoice(false);
      setIsTyping(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleQuickQuestion = (question) => {
    setInputMessage(question);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        text: "Hello! I'm Kiki, your AI Legal Assistant. I can help you with various legal questions and provide guidance on legal matters. How can I assist you today?",
        sender: "bot",
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const regenerate = async (messageId) => {
    // Find the user message that triggered this bot response
    const botMessageIndex = messages.findIndex(m => m.id === messageId);
    if (botMessageIndex === -1 || botMessageIndex === 0) return;
    
    const userMessage = messages[botMessageIndex - 1];
    if (userMessage.sender !== 'user') return;

    // Remove the old bot response
    const updatedMessages = messages.slice(0, botMessageIndex);
    setMessages(updatedMessages);

    // Regenerate response
    setLoading(true);
    setIsTyping(true);

    try {
      const response = await apiService.llmChat(userMessage.text);
      
      const botResponse = {
        id: Date.now() + 1,
        text: response.reply || "I'm sorry, I couldn't process your request. Please try again.",
        sender: "bot",
        timestamp: new Date().toISOString(),
        usedTools: response.used_tools || false,
        toolUsed: response.tool_used || null,
        searchInfo: response.search_info || null
      };

      setMessages(prev => [...prev, botResponse]);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error regenerating response:', error);
      const errorResponse = {
        id: Date.now() + 1,
        text: "I'm sorry, there was an error processing your message. Please try again.",
        sender: "bot",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorResponse]);
      setTimeout(() => scrollToBottom(), 100);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#F9FAFC' }}>
      <Navbar />

      {/* Modern Chat Interface */}
      <div className="flex-1 flex flex-col pt-14 sm:pt-16 md:pt-20 w-full overflow-hidden" style={{ backgroundColor: '#F9FAFC' }}>
        {/* Chat Interface - Always Show */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col w-full"
          style={{ 
              height: 'calc(100vh - 56px)'
            }}
          >
          {/* Messages Container - Modern Chat Layout */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-6 sm:py-8 md:py-10 lg:py-12 pb-28 sm:pb-8 md:pb-10 lg:pb-12 space-y-5 sm:space-y-6 md:space-y-8 w-full"
                  style={{ 
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#CBD5E1 #F9FAFC',
                    backgroundColor: '#F9FAFC'
                  }}
                >
                  <AnimatePresence>
                    {messages.map((message, index) => (
                      <motion.div
                      key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                {message.sender === 'user' ? (
                          /* User Message - Modern Bubble Design */
                          <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[70%] lg:max-w-[65%] ml-auto flex items-end gap-2 sm:gap-3">
                            <div className="flex-1"></div>
                            <div 
                              className="rounded-2xl sm:rounded-3xl px-4 sm:px-5 py-3 sm:py-3.5 shadow-lg" 
                              style={{ 
                                background: 'linear-gradient(135deg, #1E65AD 0%, #1a5a9a 100%)',
                                border: 'none',
                                boxShadow: '0 4px 12px rgba(30, 101, 173, 0.25)'
                              }}
                            >
                              <p className="text-sm sm:text-base leading-relaxed break-words" style={{ 
                        fontFamily: "'Roboto', sans-serif",
                                color: '#FFFFFF',
                                fontSize: '15px',
                                lineHeight: '1.7',
                                fontWeight: '400'
                      }}>
                        {message.text}
                      </p>
                    </div>
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                              <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                  </div>
                ) : (
                          /* AI Response - Modern Card Design */
                          <div className="max-w-[65%] sm:max-w-[65%] md:max-w-[60%] lg:max-w-[50%] w-full flex items-start gap-2 sm:gap-3">
                            <div className="w-10 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-md">
                              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="rounded-2xl sm:rounded-3xl bg-white shadow-lg overflow-hidden border border-gray-100 px-4 sm:px-5 md:px-6 py-4 sm:py-5 md:py-6" style={{
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
                              }}>
                      {/* AI Response Content */}
                                <div>
                        <div 
                                    className="text-sm sm:text-base leading-relaxed break-words" 
                          style={{ 
                            fontFamily: "'Roboto', sans-serif", 
                                      color: '#1F2937',
                                      fontSize: '15px',
                                      lineHeight: '1.8'
                          }}
                              >
                                <ReactMarkdown
                                  components={{
                              p: ({ children }) => <p style={{ marginBottom: '0.75rem', marginTop: '0.75rem' }}>{children}</p>,
                              h1: ({ children }) => <h1 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', marginTop: '0.75rem', color: '#1F2937' }}>{children}</h1>,
                              h2: ({ children }) => <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem', marginTop: '0.75rem', color: '#1F2937' }}>{children}</h2>,
                              h3: ({ children }) => <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', marginTop: '0.5rem', color: '#1F2937' }}>{children}</h3>,
                              ul: ({ children }) => <ul style={{ marginLeft: '1rem', marginBottom: '0.75rem', marginTop: '0.75rem', listStyleType: 'disc' }}>{children}</ul>,
                              ol: ({ children }) => <ol style={{ marginLeft: '1rem', marginBottom: '0.75rem', marginTop: '0.75rem', listStyleType: 'decimal' }}>{children}</ol>,
                              li: ({ children }) => <li style={{ marginBottom: '0.375rem', color: '#1F2937' }}>{children}</li>,
                                    code: ({ children, className }) => {
                                      const isInline = !className;
                                      return isInline ? (
                                        <code style={{ 
                                    backgroundColor: '#F3F4F6', 
                                    padding: '0.125rem 0.375rem', 
                                          borderRadius: '0.25rem',
                                          fontSize: '0.875em',
                                          fontFamily: 'monospace',
                                    color: '#1F2937'
                                        }}>{children}</code>
                                      ) : (
                                        <code style={{ 
                                          display: 'block',
                                    backgroundColor: '#F9FAFB', 
                                    padding: '0.75rem', 
                                    borderRadius: '0.375rem',
                                          fontSize: '0.8125em',
                                          fontFamily: 'monospace',
                                          overflowX: 'auto',
                                    marginTop: '0.75rem',
                                    marginBottom: '0.75rem',
                                    color: '#1F2937',
                                    border: '1px solid #E5E7EB'
                                        }}>{children}</code>
                                      );
                                    },
                                    blockquote: ({ children }) => (
                                      <blockquote style={{ 
                                  borderLeft: '3px solid #E5E7EB', 
                                  paddingLeft: '0.75rem', 
                                        marginLeft: '0',
                                  marginTop: '0.75rem',
                                  marginBottom: '0.75rem',
                                  color: '#6B7280',
                                  backgroundColor: '#F9FAFB',
                                  padding: '0.5rem 0.75rem',
                                        borderRadius: '0.25rem',
                                        fontSize: '0.875rem'
                                      }}>{children}</blockquote>
                                    ),
                                    a: ({ href, children }) => (
                                      <a 
                                        href={href} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ 
                                              color: '#1E65AD', 
                                          textDecoration: 'underline',
                                              textDecorationColor: '#CF9B63',
                                              textUnderlineOffset: '2px',
                                              wordBreak: 'break-all',
                                              fontWeight: '500'
                                        }}
                                            onMouseEnter={(e) => e.target.style.color = '#1a5a9a'}
                                            onMouseLeave={(e) => e.target.style.color = '#1E65AD'}
                                      >
                                        {children}
                                      </a>
                                    ),
                              strong: ({ children }) => <strong style={{ fontWeight: '600', color: '#1F2937' }}>{children}</strong>,
                                    em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
                                  }}
                                >
                                  {message.text}
                                </ReactMarkdown>
                                  </div>
                              </div>
                      </div>
                      </div>
                    </div>
                )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {/* Modern Typing Indicator */}
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 sm:gap-3"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-md">
                        <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                      <div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <motion.div 
                            className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
                            style={{ backgroundColor: '#1E65AD' }}
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          />
                          <motion.div 
                            className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
                            style={{ backgroundColor: '#1E65AD' }}
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.div 
                            className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
                            style={{ backgroundColor: '#1E65AD' }}
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

            {/* Modern Input Area - Bottom Fixed */}
            <div className="fixed sm:relative bottom-0 left-0 right-0 sm:left-auto sm:right-auto bg-white border-t px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-4 sm:py-5 md:py-6 pb-4 sm:pb-6 md:pb-8 lg:pb-10 z-50 mobile-input-safe-area" style={{ 
              borderColor: '#E5E7EB',
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
              background: 'linear-gradient(to top, #FFFFFF 0%, #F9FAFC 100%)'
            }}>
              {/* Voice Recording Waveform Indicator */}
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full sm:w-[90%] md:w-[80%] lg:w-[70%] max-w-3xl mx-auto mb-4 sm:mb-5 flex items-center justify-center gap-1.5 sm:gap-2 px-4"
                >
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                      key={i}
                        className="w-1 sm:w-1.5 rounded-full"
                        style={{ backgroundColor: '#1E65AD', height: '20px' }}
                        animate={{
                          height: [`${Math.random() * 15 + 10}px`, `${Math.random() * 25 + 15}px`, `${Math.random() * 15 + 10}px`],
                        }}
                        transition={{
                          duration: 0.5 + Math.random() * 0.3,
                          repeat: Infinity,
                          delay: i * 0.05
                      }}
                    />
                  ))}
                </div>
                  <span className="ml-3 text-xs sm:text-sm font-medium" style={{ color: '#1E65AD', fontFamily: "'Roboto', sans-serif" }}>
                    Listening...
                  </span>
                </motion.div>
              )}
              
              {/* Modern Input Box */}
              <div className="w-full sm:w-[90%] md:w-[80%] lg:w-[70%] max-w-3xl mx-auto">
                <div 
                  className="relative rounded-2xl sm:rounded-3xl transition-all duration-300"
                  style={{ 
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #E5E7EB',
                    minHeight: '64px',
                    height: 'auto',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <div className="flex items-center h-[64px] sm:h-[72px] px-4 sm:px-5 md:px-6">
                    {/* Search Icon */}
                    <div className="flex items-center flex-shrink-0 mr-2 sm:mr-3">
                      <Search className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#9CA3AF' }} />
                        </div>

                    {/* Input Field */}
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask anything about legal matters..."
                      className="flex-1 h-full bg-transparent border-none outline-none text-sm sm:text-base placeholder-gray-400 focus:placeholder-gray-300"
                      style={{ 
                        fontFamily: "'Roboto', sans-serif",
                        color: '#1F2937',
                        fontSize: '16px'
                      }}
                      disabled={loading || isProcessingVoice}
                    />

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200" 
                        title="Attach file"
                        disabled={loading || isProcessingVoice}
                        style={{ color: '#6B7280' }}
                      >
                        <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={loading || isProcessingVoice}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          isRecording ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-100'
                        }`}
                        title={isRecording ? "Stop recording" : "Voice input"}
                        style={{ color: isRecording ? '#EF4444' : '#6B7280' }}
                    >
                      {isRecording ? (
                          <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                          <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </button>
                      <motion.button
                        onClick={handleSendMessage}
                        disabled={loading || isProcessingVoice || !inputMessage.trim()}
                        whileHover={{ scale: !loading && !isProcessingVoice && inputMessage.trim() ? 1.05 : 1 }}
                        whileTap={{ scale: !loading && !isProcessingVoice && inputMessage.trim() ? 0.95 : 1 }}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          background: loading || isProcessingVoice || !inputMessage.trim() 
                            ? 'linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%)'
                            : 'linear-gradient(135deg, #1E65AD 0%, #1a5a9a 100%)',
                          color: 'white',
                          boxShadow: loading || isProcessingVoice || !inputMessage.trim()
                            ? 'none'
                            : '0 4px 12px rgba(30, 101, 173, 0.3)'
                        }}
                        title="Send message"
                      >
                        {(loading || isProcessingVoice) ? (
                          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Hidden File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="audio-file-input"
                      disabled={loading || isProcessingVoice}
                    />
                    </div>
                  </div>
                </div>
        </motion.div>
      </div>

      {/* Custom Styles */}
      <style>{`
        /* Custom Scrollbar */
        .scrollbar-hide::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-hide::-webkit-scrollbar-track {
          background: #F9FAFC;
          border-radius: 10px;
        }
        
        .scrollbar-hide::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 10px;
        }
        
        .scrollbar-hide::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
        
        /* Smooth transitions */
        * {
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Mobile input safe area support */
        @media (max-width: 640px) {
          .mobile-input-safe-area {
            padding-bottom: max(0.75rem, calc(0.75rem + env(safe-area-inset-bottom))) !important;
          }
        }
        
        /* Focus styles */
        input:focus {
          outline: none;
        }
        
        /* Selection styles */
        ::selection {
          background-color: rgba(30, 101, 173, 0.2);
        }
      `}</style>
    </div>
  );
}
