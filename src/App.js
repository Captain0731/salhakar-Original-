// App.js
import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import GoogleTranslate from "./components/GoogleTranslate";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import LegalJudgments from "./pages/LegalJudgments";
import ViewPDF from "./pages/ViewPDF";
import BrowseActs from "./pages/BrowseActs";
import LawLibrary from "./pages/LawLibrary";
import ActDetails from "./pages/ActDetails";
import MappingDetails from "./pages/MappingDetails";
import LawMapping from "./pages/LawMapping";
import LegalTemplate from "./pages/LegalTemplate";
import DocumentEditor from "./pages/DocumentEditor";
import YoutubeVideoSummary from "./pages/YoutubeVideoSummary";
import LegalChatbot from "./pages/LegalChatbot";
import Profile from "./pages/Profile";
import Bookmarks from "./pages/Bookmarks";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import RefundPolicy from "./pages/RefundPolicy";
import Referral from "./pages/Referral";
import InviteFriends from "./pages/InviteFriends";
import EarnRewards from "./pages/EarnRewards";
import TrackReferrals from "./pages/TrackReferrals";
import OurTeam from "./pages/OurTeam";
import PricingPage from "./pages/PricingPage";
import Dashboard from "./pages/Dashboard";
import NotesPage from "./pages/NotesPage";
import LanguageSelectorDemo from "./pages/LanguageSelectorDemo";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Support from "./pages/Support";
import ProtectedRoute from "./components/ProtectedRoute";

import Chatbot from "./components/Chatbot";
import Footer from "./components/landing/Footer";
import CookieConsentPopup from "./components/CookieConsentPopup";

function AppLayout() {
  const location = useLocation();
  
  // Pages where chatbot should be hidden
  const hideChatbotPaths = [
    '/login',
    '/signup',
    '/judgment',
    '/acts',
    '/mapping-details',
    '/law-library',
    '/legal-chatbot',
    '/law-mapping',
    '/document-editor'
  ];
  
  // Pages where footer should be hidden
  const hideFooterPaths = [
    '/login',
    '/signup',
    '/dashboard',
    '/profile',
    '/judgment-access',
    '/judgment',
    '/acts',
    '/mapping-details',
    '/law-library',
    '/legal-chatbot',
    '/law-mapping',
    '/legal-template',
    '/document-editor'
  ];
  
  const shouldShowChatbot = !hideChatbotPaths.some(path => location.pathname.startsWith(path));
  const shouldShowFooter = !hideFooterPaths.some(path => {
    // Match exact path or paths that start with the excluded path followed by '/'
    return location.pathname === path || location.pathname.startsWith(path + '/');
  });
  
  return (
    <div style={{ minHeight: "100vh", overflowY: "auto", overflowX: "hidden", width: "100%", maxWidth: "100vw", scrollbarWidth: "none", msOverflowStyle: "none" }} className="scrollbar-hide">
      {/* Google Translate Component - Global mount point */}
      <GoogleTranslate />
      {/* Cookie Consent Popup - Shows on first visit */}
      <CookieConsentPopup />
      {/* Chatbot Icon - Fixed position on all pages except specified ones */}
      {shouldShowChatbot && <Chatbot />}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/about" element={<About />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:id" element={<BlogPost />} />
        <Route path="/support" element={<Support />} />
        <Route path="/our-team" element={<OurTeam />} />
        <Route path="/language-demo" element={<LanguageSelectorDemo />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        
        {/* Public Routes - No Authentication Required */}
        <Route path="/judgment/:id?" element={<ViewPDF />} />
        <Route path="/law-library" element={<LawLibrary />} />
        <Route path="/browse-acts" element={<BrowseActs />} />
        <Route path="/acts/:id" element={<ActDetails />} />
        <Route path="/mapping-details" element={<MappingDetails />} />
        <Route path="/law-mapping" element={<LawMapping />} />
        <Route path="/legal-template" element={<LegalTemplate />} />
        <Route path="/document-editor" element={<DocumentEditor />} />
        <Route path="/youtube-summary" element={<YoutubeVideoSummary />} />
        <Route path="/legal-chatbot" element={<LegalChatbot />} />
        <Route path="/profile" element={<Profile />} />
        
        {/* Additional Routes for Navigation */}
        <Route path="/judgment-access" element={<LegalJudgments />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        {/* <Route path="/invite-friends" element={<InviteFriends />} /> */}
        {/* <Route path="/earn-rewards" element={<EarnRewards />} /> */}
        {/* <Route path="/track-referrals" element={<TrackReferrals />} /> */}
        
        {/* Dashboard - Public Route (no login required) */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Protected Routes - Authentication Required */}
        <Route path="/notes/:id" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
        
        {/* Referral Program Routes */}
        <Route path="/referral" element={<Referral />} />
        {/* <Route path="/referral/invite" element={<InviteFriends />} /> */}
        {/* <Route path="/referral/rewards" element={<EarnRewards />} /> */}
        {/* <Route path="/referral/track" element={<TrackReferrals />} /> */}
        
        {/* {chatbot routes} */}
        <Route path="/chatbot" element={<LegalChatbot />} />
        
      </Routes>
      {/* Footer - Show on all pages except login, signup, dashboard, and profile */}
      {shouldShowFooter && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}
