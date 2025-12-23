import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { LoginSkeleton, SignUpSkeleton } from './components/AuthSkeleton'
import { 
  DashboardSkeleton, 
  ListSkeleton, 
  DetailSkeleton, 
  FormSkeleton, 
  RecordsSkeleton,
  DispatchRequestsSkeleton,
  ApprovalRequestsSkeleton,
  TableSkeleton, 
  FAQSkeleton,
  PrivacySkeleton,
  TermsSkeleton,
  ContactSkeleton,
  SimpleSkeleton 
} from './components/PageSkeletons'
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

// Root route handler - checks auth and redirects accordingly
const RootRedirect = () => {
  const auth = localStorage.getItem('auth')
  
  if (!auth) {
    return <Navigate to="/login" replace />
  }
  
  // If authenticated, redirect to home
  return <Navigate to="/home" replace />
}

// Protected route wrapper for home/dashboard
const ProtectedHome = () => {
  const auth = localStorage.getItem('auth')
  return auth ? <Home /> : <Navigate to="/login" replace />
}

function AppContent() {
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'
  
  // Remove body background when not on auth pages
  useEffect(() => {
    if (!isAuthPage) {
      document.body.style.backgroundImage = 'none'
    } else {
      document.body.style.backgroundImage = "url('/images/campus.jpeg')"
    }
  }, [isAuthPage])
  
  return (
    <>
      <div 
        className={`flex w-full min-h-screen flex-col overflow-x-hidden smooth-scroll ${isAuthPage ? 'relative' : ''}`}
        style={{ 
          fontFamily: 'Inter, Manrope, sans-serif',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'none',
          transform: 'translateZ(0)' // Force GPU acceleration
        }}
      >
        {isAuthPage && <div className="fixed inset-0 bg-black/40 z-0"></div>}
        <div className={`layout-container flex h-full grow flex-col max-w-full ${isAuthPage ? 'relative z-10' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
          <Header />
          <div className="flex flex-1 justify-center w-full">
            <div className={`layout-content-container flex flex-col w-full max-w-full ${!isAuthPage ? 'pb-20 md:pb-0' : ''}`}>
                    <Routes>
                      {/* Root path - redirects based on auth status */}
                      <Route path="/" element={<RootRedirect />} />
                      {/* Home/Dashboard - protected route */}
                      <Route path="/home" element={<Suspense fallback={<DashboardSkeleton />}><ProtectedHome /></Suspense>} />
                      {/* Staff Routes */}
                      <Route path="/import-marks" element={<Suspense fallback={<FormSkeleton />}><ImportMarks /></Suspense>} />
                      <Route path="/marksheets" element={<Suspense fallback={<ListSkeleton />}><Marksheets /></Suspense>} />
                      <Route path="/marksheets/:id" element={<Suspense fallback={<DetailSkeleton />}><MarksheetDetails /></Suspense>} />
                      <Route path="/dispatch-requests" element={<Suspense fallback={<DispatchRequestsSkeleton />}><DispatchRequests /></Suspense>} />
                      <Route path="/records" element={<Suspense fallback={<RecordsSkeleton />}><Records /></Suspense>} />
                      {/* HOD Routes */}
                      <Route path="/department-overview" element={<Suspense fallback={<DashboardSkeleton />}><DepartmentOverview /></Suspense>} />
                      <Route path="/approval-requests" element={<Suspense fallback={<ApprovalRequestsSkeleton />}><ApprovalRequests /></Suspense>} />
                      <Route path="/reports" element={<Suspense fallback={<TableSkeleton />}><Reports /></Suspense>} />
                      {/* Auth Routes */}
                      <Route path="/login" element={<Suspense fallback={<LoginSkeleton />}><Login /></Suspense>} />
                      <Route path="/signup" element={<Suspense fallback={<SignUpSkeleton />}><SignUp /></Suspense>} />
                      {/* General Routes */}
                      <Route path="/contact" element={<Suspense fallback={<ContactSkeleton />}><Contact /></Suspense>} />
                      <Route path="/privacy-policy" element={<Suspense fallback={<PrivacySkeleton />}><PrivacyPolicy /></Suspense>} />
                      <Route path="/terms-of-service" element={<Suspense fallback={<TermsSkeleton />}><TermsOfService /></Suspense>} />
                      <Route path="/faq" element={<Suspense fallback={<FAQSkeleton />}><FAQ /></Suspense>} />
                      {/* Fallback route for 404 */}
                      <Route path="*" element={<Suspense fallback={<SimpleSkeleton />}><NotFound /></Suspense>} />
                    </Routes>
                </div>
              </div>
            </div>
          </div>
      {!isAuthPage && <BottomNav />}
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