import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { LoginSkeleton, SignUpSkeleton } from './components/AuthSkeleton'
import { 
  DashboardSkeleton, 
  ListSkeleton, 
  DetailSkeleton, 
  FormSkeleton, 
  TableSkeleton, 
  ContentSkeleton, 
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
                    <Routes>
                      <Route path="/" element={<Suspense fallback={<DashboardSkeleton />}><ProtectedHome /></Suspense>} />
                      {/* Staff Routes */}
                      <Route path="/import-marks" element={<Suspense fallback={<FormSkeleton />}><ImportMarks /></Suspense>} />
                      <Route path="/marksheets" element={<Suspense fallback={<ListSkeleton />}><Marksheets /></Suspense>} />
                      <Route path="/marksheets/:id" element={<Suspense fallback={<DetailSkeleton />}><MarksheetDetails /></Suspense>} />
                      <Route path="/dispatch-requests" element={<Suspense fallback={<ListSkeleton />}><DispatchRequests /></Suspense>} />
                      <Route path="/records" element={<Suspense fallback={<TableSkeleton />}><Records /></Suspense>} />
                      {/* HOD Routes */}
                      <Route path="/department-overview" element={<Suspense fallback={<DashboardSkeleton />}><DepartmentOverview /></Suspense>} />
                      <Route path="/approval-requests" element={<Suspense fallback={<ListSkeleton />}><ApprovalRequests /></Suspense>} />
                      <Route path="/reports" element={<Suspense fallback={<TableSkeleton />}><Reports /></Suspense>} />
                      {/* Auth Routes */}
                      <Route path="/login" element={<Suspense fallback={<LoginSkeleton />}><Login /></Suspense>} />
                      <Route path="/signup" element={<Suspense fallback={<SignUpSkeleton />}><SignUp /></Suspense>} />
                      {/* General Routes */}
                      <Route path="/contact" element={<Suspense fallback={<FormSkeleton />}><Contact /></Suspense>} />
                      <Route path="/privacy-policy" element={<Suspense fallback={<ContentSkeleton />}><PrivacyPolicy /></Suspense>} />
                      <Route path="/terms-of-service" element={<Suspense fallback={<ContentSkeleton />}><TermsOfService /></Suspense>} />
                      <Route path="/faq" element={<Suspense fallback={<ContentSkeleton />}><FAQ /></Suspense>} />
                      {/* Fallback route for 404 */}
                      <Route path="*" element={<Suspense fallback={<SimpleSkeleton />}><NotFound /></Suspense>} />
                    </Routes>
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