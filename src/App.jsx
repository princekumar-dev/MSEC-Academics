import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { PageSkeleton } from './components/Skeleton'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import { AlertProvider } from './components/AlertContext'
// Removed old notification imports for academic system

// Lazy load components for better performance
const Home = lazy(() => import('./pages/Home'))
const ImportMarks = lazy(() => import('./pages/ImportMarks'))
const Marksheets = lazy(() => import('./pages/Marksheets'))
const MarksheetDetails = lazy(() => import('./pages/MarksheetDetails'))
const DispatchRequests = lazy(() => import('./pages/DispatchRequests'))
const Records = lazy(() => import('./pages/Records'))
const DepartmentOverview = lazy(() => import('./pages/DepartmentOverview'))
const ApprovalRequests = lazy(() => import('./pages/ApprovalRequests'))
const Reports = lazy(() => import('./pages/Reports'))
const Login = lazy(() => import('./pages/Login'))
const SignUp = lazy(() => import('./pages/SignUp'))
const Contact = lazy(() => import('./pages/Contact'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const FAQ = lazy(() => import('./pages/FAQ'))
const NotFound = lazy(() => import('./pages/NotFound'))

// Suspense fallback
const LoadingSpinner = () => (<PageSkeleton />)

// Protected route wrapper
const ProtectedHome = () => {
  const auth = localStorage.getItem('auth')
  return auth ? <Home /> : <Navigate to="/login" replace />
}

function AppContent() {
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'
  
  return (
    <>
      <div 
        className="flex w-full min-h-screen flex-col overflow-x-hidden smooth-scroll" 
        style={{ 
          fontFamily: 'Inter, Manrope, sans-serif',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'none',
          transform: 'translateZ(0)', // Force GPU acceleration
          ...(isAuthPage ? {
            backgroundImage: 'url(/images/campus.jpeg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          } : {})
        }}
      >
        {isAuthPage && <div className="absolute inset-0 bg-black/40 z-0"></div>}
        <div className={`layout-container flex h-full grow flex-col max-w-full ${isAuthPage ? 'relative z-10' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
          <Header />
          <div className="flex flex-1 justify-center w-full">
            <div className={`layout-content-container flex flex-col w-full max-w-full ${!isAuthPage ? 'pb-20 md:pb-0' : ''}`}>
              <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      <Route path="/" element={<ProtectedHome />} />
                      {/* Staff Routes */}
                      <Route path="/import-marks" element={<ImportMarks />} />
                      <Route path="/marksheets" element={<Marksheets />} />
                      <Route path="/marksheets/:id" element={<MarksheetDetails />} />
                      <Route path="/dispatch-requests" element={<DispatchRequests />} />
                      <Route path="/records" element={<Records />} />
                      {/* HOD Routes */}
                      <Route path="/department-overview" element={<DepartmentOverview />} />
                      <Route path="/approval-requests" element={<ApprovalRequests />} />
                      <Route path="/reports" element={<Reports />} />
                      {/* Auth Routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<SignUp />} />
                      {/* General Routes */}
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                      <Route path="/terms-of-service" element={<TermsOfService />} />
                      <Route path="/faq" element={<FAQ />} />
                      {/* Fallback route for 404 */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
      <BottomNav />
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AlertProvider>
        <Router>
          <AppContent />
        </Router>
      </AlertProvider>
    </ErrorBoundary>
  )
}

export default App