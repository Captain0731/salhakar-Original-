// API Service for Legal Platform - Complete Integration
const API_BASE_URL = 'https://unquestioned-gunnar-medially.ngrok-free.dev';

// Fallback URLs in case the primary one fails
const FALLBACK_URLS = [
  'https://752ce8b44879.ngrok-free.app',
  'http://localhost:8000', // Local development fallback
  'https://your-production-api.com' // Production fallback
];

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.currentUrlIndex = 0;
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  // Method to test API connectivity and switch URLs if needed
  async testConnectivity() {
    try {
      console.log('🔧 Testing API connectivity...');
      const response = await fetch(`${this.baseURL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        console.log('✅ API connectivity successful');
        return true;
      } else {
        console.log('❌ API connectivity failed:', response.status);
        return false;
      }
    } catch (error) {
      console.log('❌ API connectivity error:', error.message);
      
      // Try fallback URLs
      for (let i = 0; i < FALLBACK_URLS.length; i++) {
        try {
          console.log(`🔄 Trying fallback URL ${i + 1}: ${FALLBACK_URLS[i]}`);
          const fallbackResponse = await fetch(`${FALLBACK_URLS[i]}/api/health`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true'
            },
            signal: AbortSignal.timeout(3000) // 3 second timeout for fallbacks
          });
          
          if (fallbackResponse.ok) {
            console.log(`✅ Fallback URL ${i + 1} successful`);
            this.baseURL = FALLBACK_URLS[i];
            this.currentUrlIndex = i;
            return true;
          }
        } catch (fallbackError) {
          console.log(`❌ Fallback URL ${i + 1} failed:`, fallbackError.message);
        }
      }
      
      console.log('❌ All API endpoints failed, using mock data');
      return false;
    }
  }

  // Helper method to format phone number for Twilio
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 0, replace with +91 (India country code)
    if (cleaned.startsWith('0')) {
      return '+91' + cleaned.substring(1);
    }
    
    // If it starts with 91 and is 12 digits, add +
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return '+' + cleaned;
    }
    
    // If it's 10 digits, assume India and add +91
    if (cleaned.length === 10) {
      return '+91' + cleaned;
    }
    
    // If it already has +, return as is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    // Default: add +91 for India
    return '+91' + cleaned;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    // Check all possible token storage keys
    const token = localStorage.getItem('access_token') || 
                  localStorage.getItem('accessToken') || 
                  localStorage.getItem('token') ||
                  this.accessToken;
    
    // Clear and return null if token is invalid/empty
    if (!token || token === 'null' || token === 'undefined') {
      return {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      };
    }
    
    return {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'Authorization': `Bearer ${token}`
    };
  }

  // Helper method to get headers without authentication
  getPublicHeaders() {
    return {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    };
  }

  // Helper method to handle API responses with token refresh
  async handleResponse(response) {
    if (response.ok) {
      return await response.json();
    } else if (response.status === 401) {
      // Check if we have a refresh token and try to refresh
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          await this.refreshTokens();
          // Retry the original request with new token
          return await this.retryRequest(response.url, response);
        } catch (refreshError) {
          // Refresh failed, logout user
          this.clearAllTokens();
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
      } else {
        // No refresh token, redirect to login
        this.clearAllTokens();
        window.location.href = '/login';
        throw new Error('Authentication required');
      }
    } else {
      let errorMessage = 'API request failed';
      try {
        const errorData = await response.json();
        
        // Handle different error response formats
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            // Handle validation errors array
            errorMessage = errorData.detail.map(err => err.msg || err.message || JSON.stringify(err)).join(', ');
          } else if (typeof errorData.detail === 'object') {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else if (errorData.message) {
          if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          } else {
            errorMessage = JSON.stringify(errorData.message);
          }
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      } catch (parseError) {
        // If response is not JSON (e.g., HTML error page)
        if (response.status === 404) {
          errorMessage = `Resource not found (404)`;
        } else if (response.status === 500) {
          errorMessage = `Server error (500)`;
        } else if (response.status === 403) {
          errorMessage = `Access forbidden (403)`;
        } else if (response.status === 401) {
          errorMessage = `Authentication required (401)`;
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  // Helper method to retry request with new token
  async retryRequest(url, originalResponse) {
    const newToken = localStorage.getItem('access_token');
    const response = await fetch(url, {
      method: originalResponse.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'Authorization': `Bearer ${newToken}`
      }
    });
    return await this.handleResponse(response);
  }

  // Helper method to clear all tokens
  clearAllTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.accessToken = null;
    this.refreshToken = null;
  }

  // Authentication APIs
  async signup(userData) {
    // Format the mobile number before sending
    const formattedUserData = {
      ...userData,
      mobile: this.formatPhoneNumber(userData.mobile)
    };
    
    const response = await fetch(`${this.baseURL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(formattedUserData)
    });

    return await this.handleResponse(response);
  }

  async login(email, password) {
    console.log('🔐 Login attempt for:', email);
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ email, password })
    });

    const result = await this.handleResponse(response);
    
    if (result.access_token) {
      this.accessToken = result.access_token;
      this.refreshToken = result.refresh_token;
      localStorage.setItem('access_token', result.access_token);
      localStorage.setItem('refresh_token', result.refresh_token);
      console.log('✅ Login successful, tokens stored');
    }
    
    return result;
  }

  async logout() {
    console.log('🔐 Logging out...');
    const response = await fetch(`${this.baseURL}/auth/logout`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    const result = await this.handleResponse(response);
    
    // Clear tokens
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    console.log('✅ Logout successful, tokens cleared');
    
    return result;
  }

  async refreshTokens() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    console.log('🔄 Refreshing tokens...');
    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ refresh_token: this.refreshToken })
    });

    const result = await this.handleResponse(response);
    
    if (result.access_token) {
      this.accessToken = result.access_token;
      this.refreshToken = result.refresh_token;
      localStorage.setItem('access_token', result.access_token);
      localStorage.setItem('refresh_token', result.refresh_token);
      console.log('✅ Tokens refreshed successfully');
    }
    
    return result;
  }

  async getSessions() {
    const response = await fetch(`${this.baseURL}/auth/sessions`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    return await this.handleResponse(response);
  }

  async deleteSession(sessionId) {
    const response = await fetch(`${this.baseURL}/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    return await this.handleResponse(response);
  }

  async sendVerificationCode(phoneNumber) {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    const response = await fetch(`${this.baseURL}/auth/send-verification-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ phone_number: formattedPhone })
    });

    return await this.handleResponse(response);
  }

  async verifyPhone(phoneNumber, code) {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    const response = await fetch(`${this.baseURL}/auth/verify-phone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ phone_number: formattedPhone, code })
    });

    return await this.handleResponse(response);
  }

  // Enhanced session management
  async getActiveSessions() {
    const response = await fetch(`${this.baseURL}/auth/sessions`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    return await this.handleResponse(response);
  }

  async terminateAllSessions() {
    const sessions = await this.getActiveSessions();
    const sessionPromises = sessions.sessions
      .filter(session => session.is_active)
      .map(session => this.deleteSession(session.session_id));
    
    await Promise.all(sessionPromises);
    return { message: 'All sessions terminated' };
  }

  // Enhanced authentication status check
  async checkAuthStatus() {
    try {
      const response = await fetch(`${this.baseURL}/auth/sessions`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        return { authenticated: true, data: await response.json() };
      } else {
        return { authenticated: false, error: 'Not authenticated' };
      }
    } catch (error) {
      return { authenticated: false, error: error.message };
    }
  }

  // Judgements API (public access) - Enhanced with real API calls and fallback
  async getJudgements(params = {}) {
    console.log('🌐 getJudgements called with params:', params);
    
    try {
      console.log('🌐 Making real API call for judgments');
      const queryParams = new URLSearchParams();
      
      // Add pagination parameters
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      
      // Add cursor-based pagination parameters for High Court
      if (params.cursor_decision_date) queryParams.append('cursor_decision_date', params.cursor_decision_date);
      if (params.cursor_id) queryParams.append('cursor_id', params.cursor_id);
      
      // Add search and filter parameters
      if (params.search) queryParams.append('search', params.search);
      if (params.title) queryParams.append('title', params.title);
      if (params.cnr) queryParams.append('cnr', params.cnr);
      // Support both highCourt (for backward compatibility) and court_name (preferred)
      if (params.court_name) {
        queryParams.append('court_name', params.court_name);
      } else if (params.highCourt) {
        queryParams.append('court_name', params.highCourt);
      }
      if (params.judge) queryParams.append('judge', params.judge);
      if (params.decisionDateFrom || params.decision_date_from) {
        // Keep date in YYYY-MM-DD format as per API documentation
        const dateValue = params.decisionDateFrom || params.decision_date_from;
        queryParams.append('decision_date_from', dateValue);
      }
      
      // Note: Using /api/judgements endpoint for High Court judgments as per API documentation
      const url = `${this.baseURL}/api/judgements?${queryParams.toString()}`;
      console.log('🌐 API URL:', url);
      
      // Check authentication token
      const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
      console.log('🌐 Auth token available:', !!token);
      
      const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('🌐 Request headers:', headers);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      console.log('🌐 Response status:', response.status);
      console.log('🌐 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🌐 API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('🌐 Real API response:', data);
      
      // Map API field names to frontend expected field names
      if (data.data && Array.isArray(data.data)) {
        data.data = data.data.map(judgment => ({
          ...judgment,
          pdf_url: judgment.pdf_link || judgment.pdf_url // Map pdf_link to pdf_url
        }));
      }
      
      console.log('🌐 Mapped API response:', data);
      return data;
      
    } catch (error) {
      console.error('🌐 API call failed:', error);
      console.error('🌐 Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Throw error instead of returning mock data
      throw error;
    }
  }

  // Mock data for judgments when API is unavailable
  getMockJudgementsData(params = {}) {
    const mockData = [
      {
        id: 1,
        case_number: "WP(C) 1234/2023",
        cnr: "DLCT01-123456-2023",
        petitioner: "Rajesh Kumar vs State of Delhi",
        respondent: "State of Delhi",
        court_name: "Delhi High Court",
        judge: "Hon'ble Justice A.K. Singh",
        decision_date: "2023-12-15",
        pdf_url: "https://example.com/judgment1.pdf",
        summary: "This case deals with fundamental rights and constitutional validity of certain provisions.",
        keywords: ["fundamental rights", "constitutional law", "writ petition"],
        category: "Constitutional Law"
      },
      {
        id: 2,
        case_number: "CRL.A. 567/2023",
        cnr: "DLCT01-789012-2023",
        petitioner: "State vs Mohan Lal",
        respondent: "Mohan Lal",
        court_name: "Delhi High Court",
        judge: "Hon'ble Justice B.K. Sharma",
        decision_date: "2023-12-10",
        pdf_url: "https://example.com/judgment2.pdf",
        summary: "Criminal appeal regarding bail application and evidence admissibility.",
        keywords: ["criminal law", "bail", "evidence"],
        category: "Criminal Law"
      },
      {
        id: 3,
        case_number: "CIVIL 890/2023",
        cnr: "DLCT01-345678-2023",
        petitioner: "ABC Company vs XYZ Corporation",
        respondent: "XYZ Corporation",
        court_name: "Delhi High Court",
        judge: "Hon'ble Justice C.K. Verma",
        decision_date: "2023-12-05",
        pdf_url: "https://example.com/judgment3.pdf",
        summary: "Commercial dispute regarding contract breach and damages.",
        keywords: ["contract law", "commercial dispute", "damages"],
        category: "Commercial Law"
      },
      {
        id: 4,
        case_number: "FAM 234/2023",
        cnr: "DLCT01-901234-2023",
        petitioner: "Priya Sharma vs Ravi Sharma",
        respondent: "Ravi Sharma",
        court_name: "Delhi High Court",
        judge: "Hon'ble Justice D.K. Gupta",
        decision_date: "2023-11-28",
        pdf_url: "https://example.com/judgment4.pdf",
        summary: "Family law matter regarding divorce and child custody.",
        keywords: ["family law", "divorce", "custody"],
        category: "Family Law"
      },
      {
        id: 5,
        case_number: "LAB 456/2023",
        cnr: "DLCT01-567890-2023",
        petitioner: "Workers Union vs Management",
        respondent: "ABC Industries Ltd.",
        court_name: "Delhi High Court",
        judge: "Hon'ble Justice E.K. Singh",
        decision_date: "2023-11-20",
        pdf_url: "https://example.com/judgment5.pdf",
        summary: "Labor dispute regarding wage revision and working conditions.",
        keywords: ["labor law", "wages", "working conditions"],
        category: "Labor Law"
      }
    ];

    // Apply search filter if provided
    let filteredData = mockData;
    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filteredData = mockData.filter(item => 
        item.petitioner.toLowerCase().includes(searchTerm) ||
        item.case_number.toLowerCase().includes(searchTerm) ||
        item.summary.toLowerCase().includes(searchTerm) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
      );
    }

    // Apply title filter if provided
    if (params.title) {
      const titleTerm = params.title.toLowerCase();
      filteredData = filteredData.filter(item => 
        item.petitioner.toLowerCase().includes(titleTerm) ||
        item.case_number.toLowerCase().includes(titleTerm)
      );
    }

    // Apply court filter if provided
    if (params.highCourt) {
      filteredData = filteredData.filter(item => 
        item.court_name.toLowerCase().includes(params.highCourt.toLowerCase())
      );
    }

    // Apply judge filter if provided
    if (params.judge) {
      filteredData = filteredData.filter(item => 
        item.judge.toLowerCase().includes(params.judge.toLowerCase())
      );
    }

    // Apply CNR filter if provided
    if (params.cnr) {
      filteredData = filteredData.filter(item => 
        item.cnr.toLowerCase().includes(params.cnr.toLowerCase())
      );
    }

    // Apply decision date from filter if provided
    if (params.decisionDateFrom) {
      // Convert from yyyy-mm-dd to dd-mm-yyyy format for comparison
      const dateParts = params.decisionDateFrom.split('-');
      let compareDate;
      if (dateParts.length === 3) {
        // If it's in yyyy-mm-dd format, convert to Date object
        compareDate = new Date(params.decisionDateFrom);
      } else {
        // If it's already in dd-mm-yyyy format, parse it correctly
        const [day, month, year] = params.decisionDateFrom.split('-');
        compareDate = new Date(year, month - 1, day);
      }
      
      filteredData = filteredData.filter(item => 
        new Date(item.decision_date) >= compareDate
      );
    }

    // Apply pagination
    const limit = params.limit || 10;
    const offset = params.offset || 0;
    const paginatedData = filteredData.slice(offset, offset + limit);

    return {
      data: paginatedData,
      pagination_info: {
        total_count: filteredData.length,
        current_page: Math.floor(offset / limit) + 1,
        page_size: limit,
        has_more: (offset + limit) < filteredData.length,
        offset: offset,
        limit: limit
      },
      message: "Mock data - API unavailable"
    };
  }

  // Supreme Court Judgements API (public access)
  async getSupremeCourtJudgements(params = {}) {
    console.log('🌐 getSupremeCourtJudgements called with params:', params);
    
    try {
      console.log('🌐 Making real API call for Supreme Court judgments');
      const queryParams = new URLSearchParams();
      
      // Add pagination parameters
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      
      // Add cursor-based pagination for Supreme Court
      if (params.cursor_id) queryParams.append('cursor_id', params.cursor_id);
      
      // Add search and filter parameters
      if (params.search) queryParams.append('search', params.search);
      if (params.title) queryParams.append('title', params.title);
      if (params.cnr) queryParams.append('cnr', params.cnr);
      if (params.judge) queryParams.append('judge', params.judge);
      if (params.petitioner) queryParams.append('petitioner', params.petitioner);
      if (params.respondent) queryParams.append('respondent', params.respondent);
      if (params.decisionDateFrom || params.decision_date_from) {
        // Keep date in YYYY-MM-DD format as per API documentation
        const dateValue = params.decisionDateFrom || params.decision_date_from;
        queryParams.append('decision_date_from', dateValue);
      }
      
      const url = `${this.baseURL}/api/supreme-court-judgements?${queryParams.toString()}`;
      console.log('🌐 Supreme Court API URL:', url);
      
      // Check authentication token
      const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
      console.log('🌐 Auth token available:', !!token);
      
      const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('🌐 Request headers:', headers);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      console.log('🌐 Response status:', response.status);
      console.log('🌐 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🌐 Supreme Court API Error Response:', errorText);
        throw new Error(`Supreme Court API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('🌐 Real Supreme Court API response:', data);
      
      // Map API field names to frontend expected field names
      if (data.data && Array.isArray(data.data)) {
        data.data = data.data.map(judgment => ({
          ...judgment,
          pdf_url: judgment.pdf_link || judgment.pdf_url // Map pdf_link to pdf_url
        }));
      }
      
      console.log('🌐 Mapped Supreme Court API response:', data);
      return data;
      
    } catch (error) {
      console.error('🌐 Supreme Court API call failed:', error);
      console.error('🌐 Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Throw error instead of returning mock data
      throw error;
    }
  }

  // Mock data for Supreme Court judgments when API is unavailable
  getMockSupremeCourtJudgementsData(params = {}) {
    const mockData = [
      {
        id: 1,
        case_number: "CIVIL APPEAL NO. 1234 OF 2023",
        cnr: "SC-123456-2023",
        petitioner: "State of Maharashtra",
        respondent: "Union of India",
        judge: "Hon'ble Mr. Justice D.Y. Chandrachud",
        decision_date: "2023-12-15",
        pdf_url: "https://example.com/supreme_judgment1.pdf",
        summary: "Constitutional validity of certain provisions of the Maharashtra Land Revenue Code.",
        keywords: ["constitutional law", "land revenue", "state powers"],
        category: "Constitutional Law"
      },
      {
        id: 2,
        case_number: "CRIMINAL APPEAL NO. 567 OF 2023",
        cnr: "SC-789012-2023",
        petitioner: "Rajesh Kumar",
        respondent: "State of Delhi",
        judge: "Hon'ble Ms. Justice B.V. Nagarathna",
        decision_date: "2023-12-10",
        pdf_url: "https://example.com/supreme_judgment2.pdf",
        summary: "Criminal appeal regarding bail application and evidence admissibility in criminal cases.",
        keywords: ["criminal law", "bail", "evidence"],
        category: "Criminal Law"
      },
      {
        id: 3,
        case_number: "CIVIL APPEAL NO. 890 OF 2023",
        cnr: "SC-345678-2023",
        petitioner: "ABC Corporation Ltd.",
        respondent: "XYZ Industries Pvt. Ltd.",
        judge: "Hon'ble Mr. Justice Sanjay Kishan Kaul",
        decision_date: "2023-12-05",
        pdf_url: "https://example.com/supreme_judgment3.pdf",
        summary: "Commercial dispute regarding contract breach and damages in corporate law.",
        keywords: ["commercial law", "contract", "corporate"],
        category: "Commercial Law"
      },
      {
        id: 4,
        case_number: "WRIT PETITION (CIVIL) NO. 234 OF 2023",
        cnr: "SC-901234-2023",
        petitioner: "Environmental Action Group",
        respondent: "Ministry of Environment",
        judge: "Hon'ble Mr. Justice K.M. Joseph",
        decision_date: "2023-11-28",
        pdf_url: "https://example.com/supreme_judgment4.pdf",
        summary: "Environmental law matter regarding forest conservation and wildlife protection.",
        keywords: ["environmental law", "forest conservation", "wildlife"],
        category: "Environmental Law"
      },
      {
        id: 5,
        case_number: "CIVIL APPEAL NO. 456 OF 2023",
        cnr: "SC-567890-2023",
        petitioner: "Workers Union",
        respondent: "Management of ABC Industries",
        judge: "Hon'ble Mr. Justice S. Ravindra Bhat",
        decision_date: "2023-11-20",
        pdf_url: "https://example.com/supreme_judgment5.pdf",
        summary: "Labor law dispute regarding wage revision and working conditions.",
        keywords: ["labor law", "wages", "working conditions"],
        category: "Labor Law"
      }
    ];

    // Apply search filter if provided
    let filteredData = mockData;
    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filteredData = mockData.filter(item => 
        item.petitioner.toLowerCase().includes(searchTerm) ||
        item.respondent.toLowerCase().includes(searchTerm) ||
        item.case_number.toLowerCase().includes(searchTerm) ||
        item.summary.toLowerCase().includes(searchTerm) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
      );
    }

    // Apply title filter if provided
    if (params.title) {
      const titleTerm = params.title.toLowerCase();
      filteredData = filteredData.filter(item => 
        item.petitioner.toLowerCase().includes(titleTerm) ||
        item.respondent.toLowerCase().includes(titleTerm) ||
        item.case_number.toLowerCase().includes(titleTerm)
      );
    }

    // Apply judge filter if provided
    if (params.judge) {
      filteredData = filteredData.filter(item => 
        item.judge.toLowerCase().includes(params.judge.toLowerCase())
      );
    }

    // Apply petitioner filter if provided
    if (params.petitioner) {
      filteredData = filteredData.filter(item => 
        item.petitioner.toLowerCase().includes(params.petitioner.toLowerCase())
      );
    }

    // Apply respondent filter if provided
    if (params.respondent) {
      filteredData = filteredData.filter(item => 
        item.respondent.toLowerCase().includes(params.respondent.toLowerCase())
      );
    }

    // Apply CNR filter if provided
    if (params.cnr) {
      filteredData = filteredData.filter(item => 
        item.cnr.toLowerCase().includes(params.cnr.toLowerCase())
      );
    }

    // Apply decision date from filter if provided
    if (params.decisionDateFrom || params.decision_date_from) {
      const dateFrom = params.decisionDateFrom || params.decision_date_from;
      
      // Convert from yyyy-mm-dd to dd-mm-yyyy format for comparison
      const dateParts = dateFrom.split('-');
      let compareDate;
      if (dateParts.length === 3) {
        // If it's in yyyy-mm-dd format, convert to Date object
        compareDate = new Date(dateFrom);
      } else {
        // If it's already in dd-mm-yyyy format, parse it correctly
        const [day, month, year] = dateFrom.split('-');
        compareDate = new Date(year, month - 1, day);
      }
      
      filteredData = filteredData.filter(item => 
        new Date(item.decision_date) >= compareDate
      );
    }

    // Apply pagination
    const limit = params.limit || 10;
    const offset = params.offset || 0;
    const paginatedData = filteredData.slice(offset, offset + limit);

    return {
      data: paginatedData,
      next_cursor: paginatedData.length === limit ? { id: paginatedData[paginatedData.length - 1].id } : null,
      pagination_info: {
        total_count: filteredData.length,
        current_page_size: paginatedData.length,
        has_more: (offset + limit) < filteredData.length
      },
      message: "Mock data - API unavailable"
    };
  }

  // Health check
  async getHealth() {
    const response = await fetch(`${this.baseURL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });

    return await this.handleResponse(response);
  }

  // Check API connectivity
  async checkConnectivity() {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        timeout: 5000 // 5 second timeout
      });
      
      return response.ok;
    } catch (error) {
      console.error('API connectivity check failed:', error);
      return false;
    }
  }

  // Get alternative endpoints for fallback
  getAlternativeEndpoints() {
    return [
      'https://752ce8b44879.ngrok-free.app', // Current ngrok
      'http://localhost:8000', // Local development
      'https://api.legalplatform.com', // Production (if available)
      'https://legal-api.herokuapp.com' // Alternative hosting
    ];
  }

  // Try alternative endpoints for High Court judgments
  async getHighCourtJudgementsWithFallback(params = {}) {
    const endpoints = this.getAlternativeEndpoints();
    console.log('🔍 getHighCourtJudgementsWithFallback called with params:', params);
    console.log('🔍 Available endpoints:', endpoints);
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying endpoint: ${endpoint}`);
        const queryString = new URLSearchParams(params).toString();
        const url = `${endpoint}/api/high-court-judgements?${queryString}`;
        console.log(`🔄 Full URL: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: this.getPublicHeaders()
        });
        
        console.log(`🔄 Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          console.log(`✅ Successfully connected to: ${endpoint}`);
          // Update base URL if we found a working endpoint
          if (endpoint !== this.baseURL) {
            console.log(`🔄 Switching to working endpoint: ${endpoint}`);
            this.baseURL = endpoint;
          }
          const result = await this.handleResponse(response);
          console.log(`✅ Got data from ${endpoint}:`, result);
          return result;
        } else {
          console.warn(`❌ Endpoint ${endpoint} returned status ${response.status}`);
        }
      } catch (error) {
        console.warn(`❌ Endpoint ${endpoint} failed:`, error.message);
        continue;
      }
    }
    
    console.error('❌ All API endpoints are unavailable');
    throw new Error('All API endpoints are unavailable');
  }

  // Get API info
  async getApiInfo() {
    const response = await fetch(`${this.baseURL}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });

    return await this.handleResponse(response);
  }

  // Law Mapping APIs (public access)
  async getLawMappings(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/api/law_mapping?${queryString}`, {
      method: 'GET',
      headers: this.getPublicHeaders()
    });

    return await this.handleResponse(response);
  }

  // Get BNS-IPC mappings
  async getBnsIpcMappings(params = {}) {
    return await this.getLawMappings({
      mapping_type: 'bns_ipc',
      ...params
    });
  }

  // Get BSA-IEA mappings
  async getBsaIeaMappings(params = {}) {
    return await this.getLawMappings({
      mapping_type: 'bsa_iea',
      ...params
    });
  }

  // Get BNSS-CrPC mappings
  async getBnssCrpcMappings(params = {}) {
    return await this.getLawMappings({
      mapping_type: 'bnss_crpc',
      ...params
    });
  }

  // Judgment filtering APIs with enhanced filters
  async getJudgmentsWithFilters(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/api/judgements?${queryString}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    return await this.handleResponse(response);
  }

  // Get Supreme Court judgments with filters
  async getSupremeCourtJudgmentsWithFilters(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/api/supreme-court-judgements?${queryString}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    return await this.handleResponse(response);
  }

  // Central Acts API (public access)
  async getCentralActs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/api/acts/central-acts?${queryString}`, {
      method: 'GET',
      headers: this.getPublicHeaders()
    });

    return await this.handleResponse(response);
  }

  // State Acts API (public access)
  async getStateActs(params = {}) {
    console.log('🌐 getStateActs called with params:', params);
    
    try {
      console.log('🌐 Making real API call for State Acts');
      const queryParams = new URLSearchParams();
      
      // Add pagination parameters
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      
      // Add search and filter parameters
      if (params.search) queryParams.append('search', params.search);
      if (params.short_title) queryParams.append('short_title', params.short_title);
      if (params.state) queryParams.append('state', params.state);
      if (params.act_number) queryParams.append('act_id', params.act_number); // Changed to act_id for State Acts API
      if (params.act_id) queryParams.append('act_id', params.act_id); // Support direct act_id parameter
      if (params.year) queryParams.append('year', params.year);
      if (params.department) queryParams.append('department', params.department);
      
      const url = `${this.baseURL}/api/acts/state-acts?${queryParams.toString()}`;
      console.log('🌐 State Acts API URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getPublicHeaders()
      });
      
      console.log('🌐 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🌐 State Acts API Error Response:', errorText);
        throw new Error(`State Acts API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🌐 State Acts API response:', data);
      
      return data;
    } catch (error) {
      console.error('🌐 State Acts API call failed:', error);
      throw error;
    }
  }

  // Enhanced State Acts API with offset-based pagination
  async getStateActsWithOffset(offset = 0, limit = 20, filters = {}) {
    const params = {
      limit,
      offset,
      ...filters
    };
    
    return await this.getStateActs(params);
  }

  // Enhanced Judgements API with cursor-based pagination
  async getJudgementsWithCursor(cursor = null, filters = {}) {
    const params = { limit: 10, ...filters };
    
    if (cursor) {
      params.cursor_decision_date = cursor.decision_date;
      params.cursor_id = cursor.id;
    }
    
    return await this.getJudgements(params);
  }

  // Enhanced Supreme Court Judgements API with cursor-based pagination
  async getSupremeCourtJudgementsWithCursor(cursor = null, filters = {}) {
    const params = { limit: 10, ...filters };
    
    if (cursor) {
      params.cursor_decision_date = cursor.decision_date;
      params.cursor_id = cursor.id;
    }
    
    return await this.getSupremeCourtJudgements(params);
  }

  // High Court Judgements API (public access) - Enhanced with real API calls
  async getHighCourtJudgements(params = {}) {
    console.log('🌐 getHighCourtJudgements called with params:', params);
    
    try {
      console.log('🌐 Making real API call for High Court judgments');
      const queryParams = new URLSearchParams();
      
      // Add pagination parameters
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.offset) queryParams.append('offset', params.offset);
      
      // Add search and filter parameters
      if (params.search) queryParams.append('search', params.search);
      if (params.title) queryParams.append('title', params.title);
      if (params.cnr) queryParams.append('cnr', params.cnr);
      if (params.court_name) queryParams.append('court_name', params.court_name);
      if (params.decision_date_from) queryParams.append('decision_date_from', params.decision_date_from);
      if (params.judge) queryParams.append('judge', params.judge);
      if (params.year) queryParams.append('year', params.year);
      
      // Add cursor-based pagination parameters for High Court
      if (params.cursor_decision_date) queryParams.append('cursor_decision_date', params.cursor_decision_date);
      if (params.cursor_id) queryParams.append('cursor_id', params.cursor_id);
      
      const url = `${this.baseURL}/api/high-court-judgements?${queryParams.toString()}`;
      console.log('🌐 High Court API URL:', url);
      
      // Check authentication token
      const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
      console.log('🌐 Auth token available:', !!token);
      
      const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('🌐 Request headers:', headers);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      console.log('🌐 Response status:', response.status);
      console.log('🌐 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🌐 High Court API Error Response:', errorText);
        throw new Error(`High Court API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('🌐 Real High Court API response:', data);
      
      // Map API field names to frontend expected field names
      if (data.data && Array.isArray(data.data)) {
        data.data = data.data.map(judgment => ({
          ...judgment,
          pdf_url: judgment.pdf_link || judgment.pdf_url // Map pdf_link to pdf_url
        }));
      }
      
      console.log('🌐 Mapped High Court API response:', data);
      return data;
      
    } catch (error) {
      console.error('🌐 High Court API call failed:', error);
      console.error('🌐 Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }

  // Enhanced High Court Judgements API with cursor-based pagination
  async getHighCourtJudgementsWithCursor(cursor = null, filters = {}) {
    const params = { limit: 10, ...filters };
    
    if (cursor) {
      params.cursor_decision_date = cursor.decision_date;
      params.cursor_id = cursor.id;
    }
    
    return await this.getHighCourtJudgements(params);
  }

  // High Court Judgements with advanced filtering
  async getHighCourtJudgementsWithFilters(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/api/high-court-judgements?${queryString}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    return await this.handleResponse(response);
  }

  // Enhanced Law Mapping API with offset-based pagination
  async getLawMappingsWithOffset(offset = 0, limit = 50, filters = {}) {
    const params = {
      limit,
      offset,
      ...filters
    };
    
    return await this.getLawMappings(params);
  }

  // Enhanced Central Acts API with offset-based pagination
  async getCentralActsWithOffset(offset = 0, limit = 20, filters = {}) {
    const params = {
      limit,
      offset,
      ...filters
    };
    
    return await this.getCentralActs(params);
  }

  // User Type specific signup methods
  async signupStudent(userData) {
    return await this.signup({
      ...userData,
      user_type: 1
    });
  }

  async signupLawyer(userData) {
    return await this.signup({
      ...userData,
      user_type: 2
    });
  }

  async signupCorporate(userData) {
    return await this.signup({
      ...userData,
      user_type: 3
    });
  }

  async signupOther(userData) {
    return await this.signup({
      ...userData,
      user_type: 4
    });
  }

  // Enhanced error handling with specific error types
  async handleApiError(error) {
    if (error.message.includes('Not authenticated')) {
      this.clearAllTokens();
      window.location.href = '/login';
    } else if (error.message.includes('Token has expired')) {
      this.clearAllTokens();
      window.location.href = '/login';
    } else {
      throw error;
    }
  }

  // Utility method to check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
    return !!token;
  }

  // Utility method to get stored user data
  getStoredUserData() {
    const userData = localStorage.getItem('userData') || localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }

  // Utility method to store user data
  storeUserData(userData) {
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('user', JSON.stringify(userData));
  }

  // Utility method to clear all stored data
  clearStoredData() {
    this.clearAllTokens();
    localStorage.removeItem('userData');
    localStorage.removeItem('user');
  }

  // Dashboard API Methods
  
  // Get user downloads
  async getUserDownloads(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/api/dashboard/downloads?${queryString}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Add download
  async addDownload(downloadData) {
    const response = await fetch(`${this.baseURL}/api/dashboard/downloads`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(downloadData)
    });
    return await this.handleResponse(response);
  }

  // Delete download
  async deleteDownload(downloadId) {
    const response = await fetch(`${this.baseURL}/api/dashboard/downloads/${downloadId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Bookmark API Methods - Following the documented API structure

  // Get user bookmarks
  async getUserBookmarks(params = {}) {
    // Handle folder_id parameter - backend expects folder_id, but we support folderId for consistency
    const queryParams = { ...params };
    if (queryParams.folderId !== undefined) {
      queryParams.folder_id = queryParams.folderId;
      delete queryParams.folderId;
    }
    // Special case: folder_id=0 means bookmarks without folder (null)
    if (queryParams.folder_id === 0) {
      queryParams.folder_id = null;
    }
    
    const queryString = new URLSearchParams(
      Object.entries(queryParams).filter(([_, v]) => v !== null && v !== undefined)
    ).toString();
    const headers = this.getAuthHeaders();
    
    // Log token info for debugging (without exposing actual token)
    const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
    console.log('🔐 Fetching bookmarks with token:', token ? `Bearer ${token.substring(0, 10)}...` : 'No token');
    
    const response = await fetch(`${this.baseURL}/api/bookmarks?${queryString}`, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok && response.status === 401) {
      console.error('❌ Authentication failed - token may be invalid or expired');
      // Clear invalid tokens
      this.clearAllTokens();
      throw new Error('Authentication failed. Please login again.');
    }
    
    return await this.handleResponse(response);
  }

  // Bookmark a judgement
  async bookmarkJudgement(judgementId, folderId = null) {
    const payload = folderId ? { folder_id: folderId } : {};
    const response = await fetch(`${this.baseURL}/api/bookmarks/judgements/${judgementId}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined
    });
    return await this.handleResponse(response);
  }

  // Remove judgement bookmark
  async removeJudgementBookmark(judgementId) {
    const response = await fetch(`${this.baseURL}/api/bookmarks/judgements/${judgementId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Get full judgment details by ID (for viewing bookmarked judgments)
  async getJudgementById(judgementId) {
    try {
      const response = await fetch(`${this.baseURL}/api/judgements/${judgementId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        // If direct fetch fails, try with fallback search
        if (response.status === 404) {
          console.warn(`Judgment ${judgementId} not found via direct endpoint, trying search fallback...`);
          // Fallback: fetch judgments list and search by ID
          try {
            const searchResponse = await this.getJudgements({ limit: 100 });
            if (searchResponse.data && searchResponse.data.length > 0) {
              const foundJudgment = searchResponse.data.find(j => 
                j.id === parseInt(judgementId) || 
                j.id === judgementId ||
                j.id === String(judgementId)
              );
              if (foundJudgment) {
                console.log('✅ Found judgment via fallback search');
                return foundJudgment;
              }
            }
            // Try with larger limit if first attempt didn't find it
            const largeSearchResponse = await this.getJudgements({ limit: 1000, offset: 0 });
            if (largeSearchResponse.data && largeSearchResponse.data.length > 0) {
              const foundJudgment = largeSearchResponse.data.find(j => 
                j.id === parseInt(judgementId) || 
                j.id === judgementId ||
                j.id === String(judgementId)
              );
              if (foundJudgment) {
                console.log('✅ Found judgment via large fallback search');
                return foundJudgment;
              }
            }
          } catch (fallbackErr) {
            console.error('Fallback search also failed:', fallbackErr);
          }
          throw new Error(`Judgment with ID ${judgementId} not found`);
        }
        throw new Error(`Failed to fetch judgment: ${response.statusText}`);
      }
      
      const data = await response.json();
      // Handle both direct object and wrapped responses
      return data.data || data.judgment || data;
    } catch (err) {
      console.error('Error fetching judgment by ID:', err);
      throw err;
    }
  }

  // Delete judgment by ID
  async deleteJudgement(judgementId) {
    try {
      const response = await fetch(`${this.baseURL}/api/judgements/${judgementId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      return await this.handleResponse(response);
    } catch (err) {
      console.error('Error deleting judgment:', err);
      throw err;
    }
  }

  // Delete judgment by name (searches and deletes)
  async deleteJudgementByName(judgmentName) {
    try {
      // First, search for the judgment by name
      const searchResponse = await this.getJudgements({
        search: judgmentName,
        title: judgmentName,
        limit: 50
      });

      if (!searchResponse.data || searchResponse.data.length === 0) {
        throw new Error(`No judgment found with name: ${judgmentName}`);
      }

      // If multiple found, delete the first match (or could be enhanced to show selection)
      const judgmentToDelete = searchResponse.data[0];
      
      // Delete the judgment
      return await this.deleteJudgement(judgmentToDelete.id);
    } catch (err) {
      console.error('Error deleting judgment by name:', err);
      throw err;
    }
  }

  // Get central act by ID
  async getCentralActById(actId) {
    try {
      // Try to get by ID endpoint first
      const response = await fetch(`${this.baseURL}/api/acts/central-acts/${actId}`, {
        method: 'GET',
        headers: this.getPublicHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle both direct object and wrapped response
        return data.data || data;
      } else if (response.status === 404) {
        // Fallback: search by filtering using the ID field
        const searchResponse = await this.getCentralActs({ limit: 100 });
        if (searchResponse.data && searchResponse.data.length > 0) {
          // Find the act by ID in the response
          const foundAct = searchResponse.data.find(act => act.id === parseInt(actId) || act.id === actId);
          if (foundAct) {
            return foundAct;
          }
        }
        throw new Error('Central act not found');
      }
      return await this.handleResponse(response);
    } catch (err) {
      // Fallback: try to get from list and search
      try {
        const searchResponse = await this.getCentralActs({ limit: 100 });
        if (searchResponse.data && searchResponse.data.length > 0) {
          const foundAct = searchResponse.data.find(act => act.id === parseInt(actId) || act.id === actId);
          if (foundAct) {
            return foundAct;
          }
        }
        // If still not found, try with larger limit
        const largeSearchResponse = await this.getCentralActs({ limit: 1000, offset: 0 });
        if (largeSearchResponse.data && largeSearchResponse.data.length > 0) {
          const foundAct = largeSearchResponse.data.find(act => act.id === parseInt(actId) || act.id === actId);
          if (foundAct) {
            return foundAct;
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback search also failed:', fallbackErr);
      }
      throw err;
    }
  }

  // Get state act by ID
  async getStateActById(actId) {
    try {
      // Try to get by ID endpoint first
      const response = await fetch(`${this.baseURL}/api/acts/state-acts/${actId}`, {
        method: 'GET',
        headers: this.getPublicHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle both direct object and wrapped response
        return data.data || data;
      } else if (response.status === 404) {
        // Fallback: search by filtering using the ID field
        const searchResponse = await this.getStateActs({ limit: 100 });
        if (searchResponse.data && searchResponse.data.length > 0) {
          // Find the act by ID in the response
          const foundAct = searchResponse.data.find(act => act.id === parseInt(actId) || act.id === actId);
          if (foundAct) {
            return foundAct;
          }
        }
        throw new Error('State act not found');
      }
      return await this.handleResponse(response);
    } catch (err) {
      // Fallback: try to get from list and search
      try {
        const searchResponse = await this.getStateActs({ limit: 100 });
        if (searchResponse.data && searchResponse.data.length > 0) {
          const foundAct = searchResponse.data.find(act => act.id === parseInt(actId) || act.id === actId);
          if (foundAct) {
            return foundAct;
          }
        }
        // If still not found, try with larger limit
        const largeSearchResponse = await this.getStateActs({ limit: 1000, offset: 0 });
        if (largeSearchResponse.data && largeSearchResponse.data.length > 0) {
          const foundAct = largeSearchResponse.data.find(act => act.id === parseInt(actId) || act.id === actId);
          if (foundAct) {
            return foundAct;
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback search also failed:', fallbackErr);
      }
      throw err;
    }
  }

  // Get law mapping by ID
  async getLawMappingById(mappingId, mappingType) {
    try {
      // Try to get by ID endpoint first
      const response = await fetch(`${this.baseURL}/api/law_mapping/${mappingId}`, {
        method: 'GET',
        headers: this.getPublicHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle both direct object and wrapped response
        return data.data || data;
      } else if (response.status === 404) {
        // Fallback: search by filtering with mapping type
        const searchResponse = await this.getLawMappings({ 
          mapping_type: mappingType, 
          limit: 100 
        });
        if (searchResponse.data && searchResponse.data.length > 0) {
          // Find the mapping by ID in the response
          const foundMapping = searchResponse.data.find(
            mapping => mapping.id === parseInt(mappingId) || mapping.id === mappingId
          );
          if (foundMapping) {
            return foundMapping;
          }
        }
        throw new Error('Mapping not found');
      }
      return await this.handleResponse(response);
    } catch (err) {
      // Fallback: try to get from list and search
      try {
        const searchResponse = await this.getLawMappings({ 
          mapping_type: mappingType, 
          limit: 100 
        });
        if (searchResponse.data && searchResponse.data.length > 0) {
          const foundMapping = searchResponse.data.find(
            mapping => mapping.id === parseInt(mappingId) || mapping.id === mappingId
          );
          if (foundMapping) {
            return foundMapping;
          }
        }
        // If still not found, try with larger limit (pagination)
        let offset = 0;
        let found = false;
        let foundMapping = null;
        while (!found && offset < 1000) {
          const largeSearchResponse = await this.getLawMappings({ 
            mapping_type: mappingType, 
            limit: 100,
            offset: offset
          });
          if (largeSearchResponse.data && largeSearchResponse.data.length > 0) {
            foundMapping = largeSearchResponse.data.find(
              mapping => mapping.id === parseInt(mappingId) || mapping.id === mappingId
            );
            if (foundMapping) {
              found = true;
              break;
            }
            // Check if there are more results
            if (!largeSearchResponse.pagination_info || !largeSearchResponse.pagination_info.has_more) {
              break;
            }
            offset += 100;
          } else {
            break;
          }
        }
        if (foundMapping) {
          return foundMapping;
        }
      } catch (fallbackErr) {
        console.error('Fallback search also failed:', fallbackErr);
      }
      throw err;
    }
  }

  async getJudgementByIdHTML(judgementId) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers = {
      'Accept': 'text/html',
      'ngrok-skip-browser-warning': 'true',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
    
    const response = await fetch(`${this.baseURL}/api/judgements/${judgementId}?format=html`, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch judgment HTML: ${response.statusText}`);
    }
    
    return await response.text(); // Return HTML as text
  }

  async getJudgementByIdMarkdown(judgementId) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers = {
      'Accept': 'text/markdown',
      'ngrok-skip-browser-warning': 'true',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
    
    const response = await fetch(`${this.baseURL}/api/judgements/${judgementId}?format=markdown`, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch judgment Markdown: ${response.statusText}`);
    }
    
    return await response.text(); // Return Markdown as text
  }

  // Get central act markdown by ID
  async getCentralActByIdMarkdown(actId) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers = {
      'Accept': 'text/markdown',
      'ngrok-skip-browser-warning': 'true',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
    
    const response = await fetch(`${this.baseURL}/api/central_acts/${actId}?format=markdown`, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch central act Markdown: ${response.statusText}`);
    }
    
    return await response.text(); // Return Markdown as text
  }

  // Get state act markdown by ID
  async getStateActByIdMarkdown(actId) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers = {
      'Accept': 'text/markdown',
      'ngrok-skip-browser-warning': 'true',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
    
    const response = await fetch(`${this.baseURL}/api/state_acts/${actId}?format=markdown`, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch state act Markdown: ${response.statusText}`);
    }
    
    return await response.text(); // Return Markdown as text
  }


  // Get judgment summary using Gemini
  async getJudgementSummary(judgementId, options = {}) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const payload = {
      format: options.format || 'markdown',
      max_chars_per_chunk: options.max_chars_per_chunk || 2000,
      ...(options.focus && { focus: options.focus })
    };

    const response = await fetch(`${this.baseURL}/api/judgements/${judgementId}/summary`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to fetch judgment summary: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorMessage;
      } catch (e) {
        // If not JSON, use the text as is
        if (errorText) {
          errorMessage = errorText;
        }
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  // Bookmark an act (central or state)
  async bookmarkAct(actType, actId, folderId = null) {
    // Ensure actId is numeric - backend requires numeric ID
    const numericId = parseInt(actId);
    if (isNaN(numericId)) {
      throw new Error(`Invalid act ID: ${actId}. Must be a number.`);
    }
    
    // Backend requires exactly "central" or "state" (not "central_act" or "state_act")
    const validActType = actType === 'central_act' ? 'central' : actType === 'state_act' ? 'state' : actType;
    
    if (validActType !== 'central' && validActType !== 'state') {
      throw new Error(`Invalid act type: ${actType}. Must be "central" or "state".`);
    }
    
    const url = `${this.baseURL}/api/bookmarks/acts/${validActType}/${numericId}`;
    const headers = this.getAuthHeaders();
    const payload = folderId ? { folder_id: folderId } : {};
    
    console.log('🔖 Bookmarking act:', { actType, validActType, actId, numericId, folderId, url });
    console.log('🔖 Headers:', { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : 'None' });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined
    });
    
    console.log('🔖 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔖 Bookmark act error:', response.status, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        console.error('🔖 Error details:', errorJson);
      } catch (e) {
        console.error('🔖 Error response is not JSON:', errorText);
      }
    }
    
    return await this.handleResponse(response);
  }

  // Remove act bookmark
  async removeActBookmark(actType, actId) {
    // Ensure actId is numeric - backend requires numeric ID
    const numericId = parseInt(actId);
    if (isNaN(numericId)) {
      throw new Error(`Invalid act ID: ${actId}. Must be a number.`);
    }
    
    // Backend requires exactly "central" or "state" (not "central_act" or "state_act")
    const validActType = actType === 'central_act' ? 'central' : actType === 'state_act' ? 'state' : actType;
    
    if (validActType !== 'central' && validActType !== 'state') {
      throw new Error(`Invalid act type: ${actType}. Must be "central" or "state".`);
    }
    
    const url = `${this.baseURL}/api/bookmarks/acts/${validActType}/${numericId}`;
    const headers = this.getAuthHeaders();
    
    console.log('🗑️ Removing act bookmark:', { actType, validActType, actId, numericId, url });
    console.log('🗑️ Headers:', { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : 'None' });
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: headers
    });
    
    console.log('🗑️ Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🗑️ Remove act bookmark error:', response.status, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        console.error('🗑️ Error details:', errorJson);
      } catch (e) {
        console.error('🗑️ Error response is not JSON:', errorText);
      }
    }
    
    return await this.handleResponse(response);
  }

  // Bookmark a mapping (BSA-IEA or BNS-IPC)
  async bookmarkMapping(mappingType, mappingId, folderId = null) {
    const payload = folderId ? { folder_id: folderId } : {};
    const response = await fetch(`${this.baseURL}/api/bookmarks/mappings/${mappingType}/${mappingId}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined
    });
    return await this.handleResponse(response);
  }

  // Remove mapping bookmark
  async removeMappingBookmark(mappingType, mappingId) {
    const response = await fetch(`${this.baseURL}/api/bookmarks/mappings/${mappingType}/${mappingId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Generic bookmark toggle function
  async toggleBookmark(type, id, actType = null, mappingType = null) {
    let url;
    let method;

    // Determine the correct endpoint based on type
    switch (type) {
      case 'judgement':
        url = `/api/bookmarks/judgements/${id}`;
        break;
      case 'central_act':
        url = `/api/bookmarks/acts/central/${id}`;
        break;
      case 'state_act':
        url = `/api/bookmarks/acts/state/${id}`;
        break;
      case 'bsa_iea_mapping':
        url = `/api/bookmarks/mappings/bsa_iea/${id}`;
        break;
      case 'bns_ipc_mapping':
        url = `/api/bookmarks/mappings/bns_ipc/${id}`;
        break;
      default:
        throw new Error(`Unsupported bookmark type: ${type}`);
    }

    // For now, we'll assume POST to add bookmark
    // In a real implementation, you'd check if it's already bookmarked
    method = 'POST';

    const response = await fetch(`${this.baseURL}${url}`, {
      method,
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // ===== BOOKMARK FOLDER MANAGEMENT =====

  // Create a bookmark folder
  async createBookmarkFolder(name) {
    if (!name || !name.trim()) {
      throw new Error('Folder name is required');
    }
    const response = await fetch(`${this.baseURL}/api/bookmarks/folders`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name: name.trim() })
    });
    return await this.handleResponse(response);
  }

  // Get all bookmark folders
  async getBookmarkFolders() {
    const response = await fetch(`${this.baseURL}/api/bookmarks/folders`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Update a bookmark folder (rename)
  async updateBookmarkFolder(folderId, name) {
    if (!name || !name.trim()) {
      throw new Error('Folder name is required');
    }
    const response = await fetch(`${this.baseURL}/api/bookmarks/folders/${folderId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name: name.trim() })
    });
    return await this.handleResponse(response);
  }

  // Delete a bookmark folder
  async deleteBookmarkFolder(folderId) {
    const response = await fetch(`${this.baseURL}/api/bookmarks/folders/${folderId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Get bookmarks in a specific folder
  async getBookmarksInFolder(folderId, limit = 50, offset = 0) {
    const queryString = new URLSearchParams({ limit, offset }).toString();
    const response = await fetch(`${this.baseURL}/api/bookmarks/folders/${folderId}?${queryString}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Legacy methods for backward compatibility
  async addBookmark(bookmarkData) {
    // This method is kept for backward compatibility
    // It should be replaced with specific bookmark methods
    console.warn('addBookmark is deprecated. Use specific bookmark methods instead.');
    const response = await fetch(`${this.baseURL}/api/bookmarks`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(bookmarkData)
    });
    return await this.handleResponse(response);
  }

  async updateBookmark(bookmarkId, bookmarkData) {
    // This method is kept for backward compatibility
    console.warn('updateBookmark is deprecated. Use specific bookmark methods instead.');
    const response = await fetch(`${this.baseURL}/api/bookmarks/${bookmarkId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(bookmarkData)
    });
    return await this.handleResponse(response);
  }

  async deleteBookmark(bookmarkId) {
    // This method is kept for backward compatibility
    console.warn('deleteBookmark is deprecated. Use specific bookmark methods instead.');
    const response = await fetch(`${this.baseURL}/api/bookmarks/${bookmarkId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Get user events
  async getUserEvents(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/api/dashboard/events?${queryString}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Add event
  async addEvent(eventData) {
    const response = await fetch(`${this.baseURL}/api/dashboard/events`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(eventData)
    });
    return await this.handleResponse(response);
  }

  // Update event
  async updateEvent(eventId, eventData) {
    const response = await fetch(`${this.baseURL}/api/dashboard/events/${eventId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(eventData)
    });
    return await this.handleResponse(response);
  }

  // Delete event
  async deleteEvent(eventId) {
    const response = await fetch(`${this.baseURL}/api/dashboard/events/${eventId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Get user notifications
  async getUserNotifications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/api/dashboard/notifications?${queryString}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    const response = await fetch(`${this.baseURL}/api/dashboard/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Delete notification
  async deleteNotification(notificationId) {
    const response = await fetch(`${this.baseURL}/api/dashboard/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Get user folders
  async getUserFolders() {
    const response = await fetch(`${this.baseURL}/api/dashboard/folders`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Create folder
  async createFolder(folderData) {
    const response = await fetch(`${this.baseURL}/api/dashboard/folders`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(folderData)
    });
    return await this.handleResponse(response);
  }

  // Update folder
  async updateFolder(folderId, folderData) {
    const response = await fetch(`${this.baseURL}/api/dashboard/folders/${folderId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(folderData)
    });
    return await this.handleResponse(response);
  }

  // Delete folder
  async deleteFolder(folderId) {
    const response = await fetch(`${this.baseURL}/api/dashboard/folders/${folderId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Update user profile
  async updateUserProfile(profileData) {
    const response = await fetch(`${this.baseURL}/api/user/profile`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    return await this.handleResponse(response);
  }

  // Change password
  async changePassword(passwordData) {
    const response = await fetch(`${this.baseURL}/api/user/change-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(passwordData)
    });
    return await this.handleResponse(response);
  }

  // Get user settings
  async getUserSettings() {
    const response = await fetch(`${this.baseURL}/api/user/settings`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Update user settings
  async updateUserSettings(settingsData) {
    const response = await fetch(`${this.baseURL}/api/user/settings`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settingsData)
    });
    return await this.handleResponse(response);
  }

  // Additional API endpoints from documentation
  // Note: getSessions() and deleteSession() are already defined above (lines 317, 326)
  // These were duplicates and have been removed to fix build errors

  // Health check endpoint
  async healthCheck() {
    const response = await fetch(`${this.baseURL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    return await this.handleResponse(response);
  }

  // Get API documentation info
  async getApiDocs() {
    const response = await fetch(`${this.baseURL}/docs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    return await this.handleResponse(response);
  }

  // Get OpenAPI schema
  async getOpenApiSchema() {
    const response = await fetch(`${this.baseURL}/openapi.json`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    return await this.handleResponse(response);
  }

  // Notes API Methods

  // Create a note
  async createNote(noteData) {
    const response = await fetch(`${this.baseURL}/api/notes`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(noteData)
    });
    return await this.handleResponse(response);
  }

  // Get notes by reference (judgment, act, or mapping)
  async getNotesByReference(referenceType, referenceId) {
    const response = await fetch(`${this.baseURL}/api/notes/reference/${referenceType}/${referenceId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // List user notes with filters
  async getNotes(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/api/notes?${queryString}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Update a note
  async updateNote(noteId, noteData) {
    const response = await fetch(`${this.baseURL}/api/notes/${noteId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(noteData)
    });
    return await this.handleResponse(response);
  }

  // Delete a note
  async deleteNote(noteId) {
    const response = await fetch(`${this.baseURL}/api/notes/${noteId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Folders API Methods

  // List user folders
  async getFolders() {
    const response = await fetch(`${this.baseURL}/api/folders`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    const result = await this.handleResponse(response);
    // Handle different response formats
    if (result.success && result.data?.folders) {
      return result;
    } else if (Array.isArray(result)) {
      return { success: true, data: { folders: result } };
    } else if (result.data && Array.isArray(result.data)) {
      return { success: true, data: { folders: result.data } };
    }
    return result;
  }

  // Create a folder
  async createFolder(folderData) {
    const response = await fetch(`${this.baseURL}/api/folders`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(folderData)
    });
    return await this.handleResponse(response);
  }

  // Update a folder
  async updateFolder(folderId, folderData) {
    const response = await fetch(`${this.baseURL}/api/folders/${folderId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(folderData)
    });
    return await this.handleResponse(response);
  }

  // Delete a folder
  async deleteFolder(folderId) {
    const response = await fetch(`${this.baseURL}/api/folders/${folderId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // YouTube Summary API Methods

  // Summarize YouTube video
  async summarizeYouTubeVideo(videoUrl) {
    const response = await fetch(`${this.baseURL}/api/yt_summary`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ url: videoUrl })
    });
    return await this.handleResponse(response);
  }

  // AI Assistant - Text-based chat with automatic tool usage
  async llmChat(message, useTools = null, limit = 10) {
    const response = await fetch(`${this.baseURL}/ai_assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify({ 
        message,
        ...(useTools !== null && { use_tools: useTools }),
        limit
      })
    });
    return await this.handleResponse(response);
  }

  // Speech to Text and AI Assistant Response - Voice input
  async speechToGemini(audioFile, useTools = null, limit = 10) {
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    
    // Add optional parameters
    if (useTools !== null) {
      formData.append('use_tools', useTools);
    }
    formData.append('limit', limit.toString());

    // Get auth token for authorization header
    const token = localStorage.getItem('access_token') || 
                  localStorage.getItem('accessToken') || 
                  localStorage.getItem('token') ||
                  this.accessToken;

    const headers = {
      'ngrok-skip-browser-warning': 'true'
    };

    // Add authorization if token exists
    if (token && token !== 'null' && token !== 'undefined') {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}/speech`, {
      method: 'POST',
      headers: headers,
      body: formData
    });
    return await this.handleResponse(response);
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
