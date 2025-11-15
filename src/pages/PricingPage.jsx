import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/landing/Navbar";
import Footer from "../components/landing/Footer";

const pricingData = {
  student: [
    {
      title: "Free",
      subtitle: "Full access to all premium features",
      price: "₹0/mo",
      features: [
        { text: "Unlimited Judgment Access", included: true },
        { text: "Access to the full legal library ", included: true },
        { text: "Access to sakhi AI ", included: true },

        { text: "50 Youtube video summerisations", included: true },
        { text: "5000+ legal templates", included: true },


        { text: "24/7 AI support ", included: true },
        { text: "150+ PDF Uploads", included: true },
        { text: "Smart Dashboard", included: true },
        { text: "API Access", included: false }
      ],
      button: "Get Started",
      popular: false
    },
    {
      title: "Pro",
      subtitle: "Ideal for advanced legal research",
      price: "₹499/mo",
      features: [
        { text: "Unlimited Judgment Access", included: true },
        { text: "Access to the full legal library ", included: true },
        { text: "Access to sakhi AI ", included: true },

        { text: "50 Youtube video summerisations", included: true },
        { text: "5000+ legal templates", included: true },


        { text: "24/7 AI support ", included: true },
        { text: "150+ PDF Uploads", included: true },
        { text: "Smart Dashboard", included: true },
        { text: "API Access", included: false }
      ],
      button: "Start Free Trial",
      popular: true
    },
    {
      title: "Ultimate",
      subtitle: "Unleash the best of Salhakar AI",
      price: "₹999/mo",
      features: [
        { text: "Unlimited Judgment Access", included: true },
        { text: "Access to the full legal library ", included: true },
        { text: "All Pro features", included: true },
        { text: "Priority Support (24/7)", included: true },
        { text: "API Access", included: true },
        { text: "Custom Integrations", included: true },
        { text: "Early Access to New Features", included: true },
        { text: "Dedicated Account Manager", included: true },
        { text: "Usage Analytics", included: true }
      ],
      button: "Start Free Trial",
      popular: false
    }
  ],
  professional: [
    {
      title: "free",
      subtitle: "Full access to all premium features",
      price: "₹/mo",
      features: [
        { text: "Access to 50,000+ Legal Judgments", included: true },
        { text: "Professional Legal Templates", included: true },
        { text: "AI Chatbot Support", included: true },
        { text: "YouTube Video Summaries", included: true },
        { text: "Basic Law Mapping", included: true },
        { text: "Advanced Search Filters", included: false },
        { text: "Priority Support", included: false },
        { text: "API Access", included: false }
      ],
      button: "Start Free Trial",
      popular: false
    },
    {
      title: "Pro",
      subtitle: "Comprehensive solution for legal professionals",
      price: "₹699/mo",
      features: [
        { text: "Access to 100,000+ Legal Judgments", included: true },
        { text: "Premium Legal Templates", included: true },
        { text: "Unlimited AI Chatbot", included: true },
        { text: "Unlimited Video Summaries", included: true },
        { text: "Old to New Law Mapping", included: true },
        { text: "Advanced Search Filters", included: true },
        { text: "Priority Support", included: true },
        { text: "API Access", included: false }
      ],
      button: "Start Free Trial",
      popular: true
    },
    {
      title: "Ultimate",
      subtitle: "Full-featured plan for growing practices",
      price: "₹1499/mo",
      features: [
        { text: "All Pro features", included: true },
        { text: "Unlimited Judgment Access", included: true },
        { text: "Full API Access", included: true },
        { text: "Custom Integrations", included: true },
        { text: "Priority Support (24/7)", included: true },
        { text: "Dedicated Account Manager", included: true },
        { text: "Usage Analytics & Reports", included: true },
        { text: "On-Site Training", included: true }
      ],
      button: "Start Free Trial",
      popular: false
    }
  ],
  corporate: [
    {
      title: "Basic",
      subtitle: "Tailored solutions for small teams",
      price: "Custom",
      features: [
        { text: "Unlimited Judgment Access", included: true },
        { text: "Custom Legal Templates", included: true },
        { text: "Advanced AI Chatbot", included: true },
        { text: "Video Summary Services", included: true },
        { text: "Basic Law Mapping", included: true },
        { text: "Dedicated Support", included: true },
        { text: "Custom Integration", included: true },
        { text: "Team Collaboration Tools", included: true }
      ],
      button: "Contact Sales Team",
      popular: false
    },
    {
      title: "Pro",
      subtitle: "Enterprise-grade features for mid-size organizations",
      price: "Custom",
      features: [
        { text: "Unlimited Legal Judgment Access", included: true },
        { text: "Enterprise Templates Library", included: true },
        { text: "Unlimited AI Chatbot", included: true },
        { text: "Unlimited Video Summaries", included: true },
        { text: "Complete Law Mapping Suite", included: true },
        { text: "Advanced Search & Filters", included: true },
        { text: "Priority Support (24/7)", included: true },
        { text: "Full API Access", included: true }
      ],
      button: "Contact Sales Team",
      popular: true
    },
    {
      title: "Ultimate",
      subtitle: "Complete solution for large enterprises",
      price: "Custom",
      features: [
        { text: "All Corporate Features", included: true },
        { text: "Unlimited Access to All Resources", included: true },
        { text: "Custom Enterprise Templates", included: true },
        { text: "Dedicated Account Manager", included: true },
        { text: "Custom SLAs", included: true },
        { text: "On-Site Training", included: true },
        { text: "White-Label Options", included: true },
        { text: "Priority SLA", included: true }
      ],
      button: "Contact Sales Team",
      popular: false
    }
  ]
};

function PricingPage() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [openFaqs, setOpenFaqs] = useState([]);

  const faqData = [
    {
      id: 1,
      question: "How does the pricing work?",
      answer: "You get full access to Pro features for one month at no cost. After the trial, you can upgrade to Pro or Ultimate to continue uninterrupted research."
    },
    {
      id: 2,
      question: "Is my payment safe and private?",
      answer: "Yes, payments are securely processed. Your personal data is encrypted and protected to comply with Indian data privacy laws."
    },
    {
      id: 3,
      question: "Can I upgrade, downgrade or cancel anytime?",
      answer: "You can change or cancel your plan whenever you wish. Your data remains safe, and you retain access until the current billing cycle ends.​"
    },
    {
      id: 4,
      question: "What payment methods do you accept?",
      answer: " We accept UPI, major credit/debit cards, and Indian netbanking. GST-compliant invoices are provided for Pro and Ultimate plans."
    },
    {
      id: 5,
      question: "Will there be any hidden charges or setup fees?",
      answer: "No, our pricing is fully transparent, with zero hidden fees on all plans."
    },
    {
      id: 6,
      question: "Will I lose my saved research if I cancel?",
      answer: "If you cancel, you retain access until your renewal date. Saved searches are protected, but premium features will be paused until you resume service.​"
    },
    {
      id: 7,
      question: "Do you offer discounts for teams, students, or law colleges?",
      answer: "Yes, special discounts are available. Contact support for details or custom plans for academic/corporate bulk users."
    },
    {
      id: 8,
      question: "How do monthly and annual billing differ?",
      answer: "Monthly billing gives flexibility to switch plans. Annual billing offers extra savings and uninterrupted access for 12 months."
    },
    {
      id: 9,
      question: "Can multiple users from my firm share one subscription?",
      answer: "Our Ultimate plan is designed for team/firm use and supports multiple user dashboards​"
    },
    {
      id: 10,
      question: "How do I upgrade my plan?",
      answer: "You can upgrade your plan at any time. Simply contact our support team, and we'll guide you through the process."
    }
  ];

  const toggleFaq = (id) => {
    // Find the index of the clicked FAQ
    const clickedIndex = faqData.findIndex(item => item.id === id);
    
    // Calculate the partner index (same row, other column)
    // In a 2-column grid: even index (0,2,4...) pairs with odd index (1,3,5...)
    let partnerIndex;
    if (clickedIndex % 2 === 0) {
      // Even index (left column) - partner is next item (right column)
      partnerIndex = clickedIndex + 1;
    } else {
      // Odd index (right column) - partner is previous item (left column)
      partnerIndex = clickedIndex - 1;
    }
    
    // Get partner FAQ id if it exists
    const partnerId = partnerIndex >= 0 && partnerIndex < faqData.length 
      ? faqData[partnerIndex].id 
      : null;
    
    // Check if the clicked FAQ is already open
    const isCurrentlyOpen = openFaqs.includes(id);
    
    if (isCurrentlyOpen) {
      // If clicking the same item that's open, close both (clear all)
      setOpenFaqs([]);
    } else {
      // If opening a new pair, close all previously opened FAQs and open the new pair
      const newOpenFaqs = [id];
      if (partnerId) {
        newOpenFaqs.push(partnerId);
      }
      setOpenFaqs(newOpenFaqs);
    }
  };

  const handleButtonClick = (buttonText, planTitle) => {
    // Redirect to login page for Get Started, Pro, and Ultimate buttons
    if (buttonText === "Get Started" || buttonText === "Start Free Trial") {
      navigate('/login');
    } else if (buttonText === "Contact Sales Team") {
      // Keep existing behavior for Contact Sales Team
      window.location.href = "/legal-chatbot";
    } else {
      // Default fallback
      navigate('/login');
    }
  };

  // Calculate yearly prices (assuming 20% discount for yearly)
  const getPrice = (monthlyPrice) => {
    // Handle free plans - they stay free regardless of billing cycle
    if (!monthlyPrice || monthlyPrice === "₹/mo" || monthlyPrice === "₹0/mo" || monthlyPrice.includes("Custom")) {
      return monthlyPrice;
    }
    
    if (billingCycle === "yearly") {
      const priceValue = parseFloat(monthlyPrice.replace("₹", "").replace("/mo", ""));
      // If parsing fails (NaN), return original price
      if (isNaN(priceValue) || priceValue === 0) {
        return monthlyPrice;
      }
      const yearlyPrice = priceValue * 12 * 0.8;
      return `₹${Math.round(yearlyPrice)}/mo`;
    }
    return monthlyPrice;
  };



  return (
    <div className="min-h-screen bg-[#F9FAFC]">
      <Navbar />

      {/* Hero Section */}
      <section 
        className="pt-14 sm:pt-16 md:pt-20 lg:pt-28 pb-6 sm:pb-8 md:pb-12 lg:pb-16 relative z-20 w-full border-2 border-gray-200 shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #1E65AD 0%, #1a5a9a 30%, #CF9B63 100%)'
        }}
      >
        <div className="w-full mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 text-center pt-4 sm:pt-6 md:pt-7">
          <h1
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight"
            style={{
              color: "#FFFFFF",
              fontFamily: "'Heebo', 'Helvetica Hebrew Bold', sans-serif",
              fontWeight: 700
            }}
          >
            Pricing Plans
          </h1>
          <div className="w-16 sm:w-18 md:w-20 h-0.5 sm:h-1 bg-white mx-auto rounded-full mb-2 sm:mb-3 md:mb-4"></div>
          <p
            className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-white max-w-2xl mx-auto mb-3 sm:mb-4 md:mb-6 leading-relaxed pt-2 sm:pt-3 md:pt-4 px-2"
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontWeight: 400
            }}
          >
            Discover India's most user-friendly AI legal research tool with straightforward pricing and no hidden fees.
          </p>
        </div>
      </section>



      {/* Student Plans Section */}
      <section className="py-4 sm:py-6 md:py-8 lg:py-10 xl:py-12 bg-[#F9FAFC]">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">

          {/* Student Heading */}
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <h2
              className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 sm:mb-3 md:mb-4 leading-tight"
              style={{
                color: "#1E65AD",
                fontFamily: "'Heebo', 'Helvetica Hebrew Bold', sans-serif",
                fontWeight: 700
              }}
            >
              Student
            </h2>
            <div className="w-12 sm:w-14 md:w-16 h-0.5 sm:h-1 bg-[#CF9B63] mx-auto rounded-full"></div>
          </div>

          {/* Student Description */}
          <div className="flex justify-center items-center gap-2 sm:gap-4 mb-2 sm:mb-3 md:mb-4 px-2">
            <span className="text-xs sm:text-sm md:text-base font-semibold transition-colors duration-300 text-[#8C969F] text-center">
              <p
                className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-[#8C969F] max-w-2xl mx-auto mb-3 sm:mb-4 md:mb-6 leading-relaxed pt-1 break-words"
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontWeight: 400
                }}
              >
                Premium tools and unlimited legal research for students and academic learners who want to ace their law studies.
              </p>
            </span>
          </div>



          {/* Billing Cycle Toggle Switch */}
          <div className="flex justify-center items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8 px-2">
            <span
              className={`text-xs sm:text-sm md:text-base font-semibold transition-colors duration-300 ${billingCycle === "monthly" ? "text-[#1E65AD]" : "text-[#8C969F]"
                }`}
              style={{ fontFamily: "'Roboto', sans-serif" }}
            >
              Monthly
            </span>
            <label className="relative inline-block cursor-pointer group">
              <input
                type="checkbox"
                className="sr-only"
                checked={billingCycle === "yearly"}
                onChange={(e) => setBillingCycle(e.target.checked ? "yearly" : "monthly") }
              />
              <div
                className="relative overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  width: "56px",
                  height: "32px",
                  backgroundColor: billingCycle === "yearly" ? "#1E65AD" : "#E5E7EB",
                  borderRadius: "16px",
                  boxShadow: billingCycle === "yearly" 
                    ? "inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(30, 101, 173, 0.2)"
                    : "inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                  cursor: "pointer"
                }}
              >
                {/* Inner shadow effect for depth */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: billingCycle === "yearly"
                      ? "linear-gradient(to bottom, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.1))"
                      : "linear-gradient(to bottom, rgba(255, 255, 255, 0.2), rgba(0, 0, 0, 0.05))",
                  }}
                />
                {/* Toggle knob */}
                <div
                  className="absolute rounded-full transition-all duration-300 ease-in-out flex items-center justify-center"
                  style={{
                    backgroundColor: "#FFFFFF",
                    transform: billingCycle === "yearly" ? "translateX(24px)" : "translateX(2px)",
                    borderRadius: "50%",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)",
                    width: "28px",
                    height: "28px",
                    top: "2px",
                    left: "2px"
                  }}
                >
                  {/* Subtle inner highlight on knob */}
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background: "radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), transparent 60%)",
                    }}
                  />
                </div>
              </div>
            </label>
            <span
              className={`text-xs sm:text-sm md:text-base font-semibold transition-colors duration-300 ${billingCycle === "yearly" ? "text-[#1E65AD]" : "text-[#8C969F]"
                }`}
              style={{ fontFamily: "'Roboto', sans-serif" }}
            >
              Yearly
            </span>
          </div>

          {/* Pricing Cards Section */}
          {(() => {
            const filteredPlans = pricingData.student.filter((plan) => {
              // When yearly billing is selected, only show Pro and Ultimate plans
              if (billingCycle === "yearly") {
                const planTitle = plan.title.toLowerCase();
                return planTitle === "pro" || planTitle === "ultimate";
              }
              return true;
            });
            
            const planCount = filteredPlans.length;
            const useFlex = planCount < 3;
            const gridCols = planCount === 2 ? "md:grid-cols-2" : planCount === 1 ? "md:grid-cols-1" : "md:grid-cols-3";
            
            return (
              <div className={useFlex 
                ? `flex flex-col md:flex-row justify-center items-center gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12 md:mb-16 lg:mb-20 px-2 sm:px-0` 
                : `grid grid-cols-1 ${gridCols} gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12 md:mb-16 lg:mb-20 px-2 sm:px-0`
              }>
                {filteredPlans.map((plan, index) => (
              <div
                key={plan.title}
                className={`bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 lg:p-8 relative hover:shadow-xl transition-shadow duration-300 w-full${plan.popular ? "border-2 border-[#1E65AD]" : "border border-gray-200"
                  }`}
              >
                {/* Most Popular Badge */}
                {plan.popular && (
                  <div
                    className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 bg-[#1E65AD] text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold"
                    style={{ fontFamily: "'Roboto', sans-serif" }}
                  >
                    Most Popular
                  </div>
                )}

                {/* Not Required Autopay Sticker for Free Plan */}
                {(() => {
                  const isFree = !plan.price || plan.price === "₹/mo" || plan.price === "₹0/mo" || plan.title.toLowerCase().includes("free");
                  return isFree && (
                    <div
                      className="absolute -top-3 sm:-top-4 md:-top-5 left-2 sm:left-8 md:left-10 lg:left-1 bg-[#1E65AD] text-white px-3 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 rounded-full text-xs sm:text-sm md:text-base font-bold shadow-lg z-10 transform -rotate-5 hover:rotate-0 hover:scale-105 transition-all duration-300"
                      style={{ 
                        fontFamily: "'Roboto', sans-serif",
                        fontWeight: 700,
                        boxShadow: '0 4px 12px rgba(30, 101, 173, 0.4)',
                        letterSpacing: '0.02em'
                      }}
                    >
                      <span className="whitespace-nowrap">No Autopay Required</span>
                    </div>
                  );
                })()}

                <div className="mb-4 sm:mb-6 md:mb-8 text-center" style={{ marginTop: plan.popular ? "0.5rem sm:1rem" : "0" }}>
                  <h3
                    className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3"
                    style={{
                      color: "#1E65AD",
                      fontFamily: "'Heebo', 'Helvetica Hebrew Bold', sans-serif",
                      fontWeight: 700,
                      letterSpacing: "-0.02em"
                    }}
                  >
                    {plan.title}
                  </h3>
                  <p
                    className="text-xs sm:text-sm md:text-base text-[#8C969F] mb-3 sm:mb-4 md:mb-6 leading-relaxed break-words"
                    style={{
                      fontFamily: "'Roboto', sans-serif",
                      fontWeight: 400
                    }}
                  >
                    {plan.subtitle}
                  </p>
                  <div className="flex items-baseline justify-center gap-1 mb-4 sm:mb-5 md:mb-6">
                    {(() => {
                      const isFree = !plan.price || plan.price === "₹/mo" || plan.price === "₹0/mo" || plan.price.toLowerCase().includes("free");
                      const isCustom = plan.price === "Custom";
                      const displayPrice = isFree ? "Free" : isCustom ? plan.price : getPrice(plan.price).replace("/mo", "").replace("/yr", "");
                      
                      return (
                        <>
                          <span
                            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold"
                            style={{
                              color: "#1E65AD",
                              fontFamily: "'Heebo', 'Helvetica Hebrew Bold', sans-serif",
                              fontWeight: 700,
                              letterSpacing: "-0.02em"
                            }}
                          >
                            {displayPrice}
                          </span>
                          {!isFree && !isCustom && (
                            <span
                              className="text-sm sm:text-base md:text-lg lg:text-xl font-normal text-[#1E65AD]"
                              style={{
                                fontFamily: "'Heebo', 'Helvetica Hebrew Bold', sans-serif",
                                fontWeight: 400
                              }}
                            >
                              {billingCycle === "yearly" ? "/year" : "/month"}
                            </span>
                          )}
                          {!isFree && !isCustom && billingCycle === "yearly" && (
                            <span
                              className="ml-1 sm:ml-2 text-xs text-red-500 font-semibold"
                              style={{ fontFamily: "'Roboto', sans-serif" }}
                            >
                              (Save 20%)
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <button
                  onClick={() => handleButtonClick(plan.button, plan.title)}
                  className={`w-full py-2.5 sm:py-3 md:py-3.5 lg:py-4 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 ${plan.popular
                      ? "bg-[#1E65AD] text-white hover:bg-[#185a9a] hover:shadow-lg"
                      : "bg-white text-[#1E65AD] border-2 border-[#1E65AD] hover:bg-[#F9FAFC]"
                    }`}
                  style={{
                    fontFamily: "'Roboto', sans-serif",
                    fontWeight: 600
                  }}
                >
                  {plan.button}
                </button>

                <ul className="mb-4 sm:mb-6 md:mb-8 space-y-2 sm:space-y-3 md:space-y-4 mt-6 sm:mt-8 md:mt-10">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 sm:gap-3">
                      {feature.included ? (
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 text-[#1E65AD] mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 text-[#8C969F] mt-0.5 flex-shrink-0 opacity-40"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                      <span
                        className={`text-xs sm:text-sm md:text-base leading-relaxed break-words ${feature.included ? "text-[#8C969F]" : "text-[#8C969F] line-through opacity-40"
                          }`}
                        style={{
                          fontFamily: "'Roboto', sans-serif",
                          fontWeight: 400
                        }}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>


              </div>
            ))}
              </div>
            );
          })()}
        </div>
      </section>

   

      {/* Let's Work Together Contact Form Section */}
      <section className="py-6 sm:py-8 md:py-12 lg:py-16 bg-[#F9FAFC]">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8">
          <div className="bg-[#F9FAFC]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12 lg:gap-16 p-4 sm:p-6 md:p-8 lg:p-12">
              {/* Left Side - Contact Info */}
              <div>
                <h2
                  className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 sm:mb-6 md:mb-8 leading-tight"
              style={{ 
                    color: "#1E65AD",
                fontFamily: "'Heebo', 'Helvetica Hebrew Bold', sans-serif",
                fontWeight: 700,
                letterSpacing: "-0.02em"
              }}
            >
                  Need Customized Solution?
            </h2>
                
                <div className="space-y-4 sm:space-y-5 md:space-y-6 mb-4 sm:mb-6 md:mb-8">
                  <div>
            <p
                      className="text-xs sm:text-sm md:text-base lg:text-lg text-[#8C969F] leading-relaxed break-words"
              style={{ 
                fontFamily: "'Roboto', sans-serif",
                fontWeight: 400
              }}
            >
                      If you're a large law firm, law school, or have a sizable user base, connect with our team for a tailored solution designed to meet your specific needs. We offer enterprise options, bulk access, educational partnerships, and bespoke integrations, just reach out and let us create the perfect fit for you.
                    </p>
                  </div>
                  
                  <div>
                    <p
                      className="text-xs sm:text-sm md:text-base lg:text-lg text-[#8C969F] leading-relaxed break-words"
                      style={{
                        fontFamily: "'Roboto', sans-serif",
                        fontWeight: 400
                      }}
                    >
                      inquire@salhakar.com
                    </p>
                  </div>
                  
                  <div>
                    <p
                      className="text-xs sm:text-sm md:text-base lg:text-lg text-[#8C969F] leading-relaxed break-words"
                      style={{
                        fontFamily: "'Roboto', sans-serif",
                        fontWeight: 400
                      }}
                    >
                      Phone No:- +91 7069900088
                    </p>
                  </div>
                </div>

                {/* Social Media Icons */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <a
                    href="https://www.linkedin.com/company/salhakar/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-[#1E65AD] flex items-center justify-center hover:bg-[#185a9a] transition-colors duration-200"
                    aria-label="LinkedIn"
                  >
                    <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                  </a>
                  <a
                    href="https://www.instagram.com/salhakar.legal/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-[#1E65AD] flex items-center justify-center hover:bg-[#185a9a] transition-colors duration-200"
                    aria-label="Instagram"
                  >
                    <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                  <a
                    href="https://x.com/Salhakar_legal"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-[#1E65AD] flex items-center justify-center hover:bg-[#185a9a] transition-colors duration-200"
                    aria-label="Twitter"
                  >
                    <img 
                      src="/twitter.png" 
                      alt="Twitter"
                      className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 object-contain"
                      style={{ 
                        filter: 'brightness(0) invert(1)',
                        opacity: 0.9
                      }}
                    />
                  </a>
                </div>
              </div>

              {/* Right Side - Contact Form */}
              <div>
                <form className="space-y-4 sm:space-y-5 md:space-y-6">
                  {/* First Name and Last Name - Side by Side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                    <div>
                      <label
                        htmlFor="firstName"
                        className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-2.5"
                        style={{
                          color: "#1E65AD",
                          fontFamily: "'Roboto', sans-serif",
                          fontWeight: 600
                        }}
                      >
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        required
                        className="w-full px-0 py-2 sm:py-2.5 md:py-3 border-0 border-b-2 border-gray-300 focus:border-[#1E65AD] focus:outline-none transition-colors duration-200 bg-transparent text-xs sm:text-sm md:text-base"
                        style={{
                          fontFamily: "'Roboto', sans-serif"
                        }}
                      />
                    </div>
                    
                    <div>
                      <label
                        htmlFor="lastName"
                        className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-2.5"
                        style={{
                          color: "#1E65AD",
                          fontFamily: "'Roboto', sans-serif",
                          fontWeight: 600
                        }}
                      >
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        required
                        className="w-full px-0 py-2 sm:py-2.5 md:py-3 border-0 border-b-2 border-gray-300 focus:border-[#1E65AD] focus:outline-none transition-colors duration-200 bg-transparent text-xs sm:text-sm md:text-base"
                        style={{
                          fontFamily: "'Roboto', sans-serif"
                        }}
                      />
                    </div>
                  </div>

                  {/* Phone Number - Full Width */}
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-2.5"
                      style={{
                        color: "#1E65AD",
                        fontFamily: "'Roboto', sans-serif",
                        fontWeight: 600
                      }}
                    >
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      className="w-full px-0 py-2 sm:py-2.5 md:py-3 border-0 border-b-2 border-gray-300 focus:border-[#1E65AD] focus:outline-none transition-colors duration-200 bg-transparent text-xs sm:text-sm md:text-base"
                      style={{
                        fontFamily: "'Roboto', sans-serif"
                      }}
                    />
                  </div>

                 
                  {/* Email - Full Width */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-2.5"
                      style={{
                        color: "#1E65AD",
                        fontFamily: "'Roboto', sans-serif",
                        fontWeight: 600
                      }}
                    >
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="w-full px-0 py-2 sm:py-2.5 md:py-3 border-0 border-b-2 border-gray-300 focus:border-[#1E65AD] focus:outline-none transition-colors duration-200 bg-transparent text-xs sm:text-sm md:text-base"
                      style={{
                        fontFamily: "'Roboto', sans-serif"
                      }}
                    />
                  </div>

                  {/* Message - Full Width Textarea */}
                  <div>
                    <label
                      htmlFor="message"
                      className="block text-xs sm:text-sm font-semibold mb-2 sm:mb-2.5"
                      style={{
                        color: "#1E65AD",
                        fontFamily: "'Roboto', sans-serif",
                        fontWeight: 600
                      }}
                    >
                      Leave us a message...
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows="4"
                      className="w-full px-0 py-2 sm:py-2.5 md:py-3 border-0 border-b-2 border-gray-300 focus:border-[#1E65AD] focus:outline-none transition-colors duration-200 resize-none bg-transparent text-xs sm:text-sm md:text-base"
                      style={{
                        fontFamily: "'Roboto', sans-serif"
                      }}
                    />
                  </div>

                  {/* Submit Button - Bottom Right */}
                  <div className="flex justify-end mt-4 sm:mt-5 md:mt-6">
            <button
                      type="submit"
                      className="px-6 sm:px-7 md:px-8 py-2 sm:py-2.5 md:py-3 rounded-lg font-semibold text-xs sm:text-sm md:text-base text-white transition-all duration-200 hover:shadow-md"
              style={{
                        background: 'linear-gradient(to right, #b794f6, #9775fa)',
                fontFamily: "'Roboto', sans-serif",
                fontWeight: 600
              }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(to right, #a78bfa, #8b6cf5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(to right, #b794f6, #9775fa)';
                      }}
                    >
                      Submit
            </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      
         {/* FAQ Section */}
         <section className="py-6 sm:py-8 md:py-10 lg:py-16 xl:py-20 bg-[#F9FAFC]">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 2xl:px-14">
          <h2
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12"
            style={{
              color: "#1E65AD",
              fontFamily: "'Heebo', 'Helvetica Hebrew Bold', sans-serif",
              fontWeight: 700,
              letterSpacing: "-0.02em"
            }}
          >
            FAQ
          </h2>
          
          <div className="space-y-0 grid grid-cols-1 md:grid-cols-2 gap-x-4 sm:gap-x-6 md:gap-x-8 lg:gap-x-12 xl:gap-x-16 gap-y-3 sm:gap-y-4">
            {faqData.map((item, index) => (
              <div
                key={item.id}
                
              >
                <button
                  onClick={() => toggleFaq(item.id)}
                  className="w-full py-3 sm:py-4 md:py-5 lg:py-6 px-3 sm:px-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200 group"
                >
                  <span
                    className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold flex-1 pr-2 sm:pr-3 md:pr-4 break-words"
                    style={{
                      color: "#1E65AD",
                      fontFamily: "'Roboto', sans-serif",
                      fontWeight: 600
                    }}
                  >
                    {item.question}
                  </span>
                  <div className="flex-shrink-0">
                    <svg
                      className={`w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 transition-transform duration-300 ${
                        openFaqs.includes(item.id) ? "rotate-180" : ""
                      }`}
                      style={{
                        color: openFaqs.includes(item.id) ? "#1E65AD" : "#8C969F"
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {openFaqs.includes(item.id) ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 12H4"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      )}
                    </svg>
                  </div>
                </button>
                
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaqs.includes(item.id) ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 md:pb-5 lg:pb-6">
                    <p
                      className="text-xs sm:text-sm md:text-base leading-relaxed break-words"
                      style={{
                        color: "#8C969F",
                        fontFamily: "'Roboto', sans-serif",
                        fontWeight: 400
                      }}
                    >
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      
    </div>
  );
}

export default PricingPage;

