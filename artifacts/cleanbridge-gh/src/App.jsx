import { lazy, Suspense } from 'react';
import { Link, Route, Router, Switch } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { AuthProvider, Protected } from './lib/auth.jsx';
import { ThemeProvider } from './lib/theme.jsx';
import { ToastProvider } from './lib/toast.jsx';
import { FullPageLoader, Logo } from './components/ui.jsx';
import WhatsAppButton from './components/WhatsAppButton.jsx';
import Landing from './pages/Landing.jsx';
import AuthPage, { AuthCallback } from './pages/Auth.jsx';

// Signed-in areas load on demand so each role only downloads its own pages.
const named = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const CustomerDashboard = lazy(() => import('./pages/customer/Dashboard.jsx'));
const RequestPickup = lazy(() => import('./pages/customer/RequestPickup.jsx'));
const Pickups = lazy(() => import('./pages/customer/Pickups.jsx'));
const PickupDetail = lazy(() => import('./pages/customer/PickupDetail.jsx'));
const PaymentCallback = lazy(() => import('./pages/customer/PaymentCallback.jsx'));
const LiveMap = lazy(() => import('./pages/customer/LiveMap.jsx'));
const CollectorDashboard = lazy(() => import('./pages/collector/Dashboard.jsx'));
const CollectorJobs = lazy(() => import('./pages/collector/Jobs.jsx'));
const CollectorRoute = lazy(() => import('./pages/collector/Route.jsx'));
const CollectorEarnings = lazy(() => import('./pages/collector/Earnings.jsx'));
const CollectorVehicle = lazy(() => import('./pages/collector/Vehicle.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const AdminCollections = lazy(() => import('./pages/admin/Collections.jsx'));
const AdminCustomers = named(() => import('./pages/admin/People.jsx'), 'AdminCustomers');
const AdminCollectors = named(() => import('./pages/admin/People.jsx'), 'AdminCollectors');
const AdminPayouts = lazy(() => import('./pages/admin/Payouts.jsx'));
const AdminRoutes = named(() => import('./pages/admin/Operations.jsx'), 'AdminRoutes');
const AdminNetworkMap = named(() => import('./pages/admin/Operations.jsx'), 'AdminNetworkMap');
const AdminBroadcast = named(() => import('./pages/admin/Operations.jsx'), 'AdminBroadcast');
const AdminFuel = named(() => import('./pages/admin/Settings.jsx'), 'AdminFuel');
const AdminPricing = named(() => import('./pages/admin/Settings.jsx'), 'AdminPricing');
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics.jsx'));

function NotFound() {
  return <div className="not-found"><div><Logo /><h1>404</h1><p>That page is not on today’s collection plan.</p><Link href="/" className="btn btn-primary" data-testid="link-not-found-home"><ArrowLeft size={15} /> Return home</Link></div></div>;
}

const CUSTOMER = ['customer'];
const COLLECTOR = ['collector'];
const ADMIN = ['admin'];

// [path, Page, roles] - roles undefined = any signed-in user
const PRIVATE_ROUTES = [
  ['/dashboard', CustomerDashboard, CUSTOMER],
  ['/pickup', RequestPickup, CUSTOMER],
  ['/pickups', Pickups, CUSTOMER],
  ['/pickups/:id', PickupDetail],
  ['/map', LiveMap, CUSTOMER],
  ['/payment/callback', PaymentCallback, CUSTOMER],
  ['/notifications', Notifications],
  ['/profile', Profile],
  ['/collector/dashboard', CollectorDashboard, COLLECTOR],
  ['/collector/jobs', CollectorJobs, COLLECTOR],
  ['/collector/route', CollectorRoute, COLLECTOR],
  ['/collector/earnings', CollectorEarnings, COLLECTOR],
  ['/collector/vehicle', CollectorVehicle, COLLECTOR],
  ['/admin/dashboard', AdminDashboard, ADMIN],
  ['/admin/collections', AdminCollections, ADMIN],
  ['/admin/customers', AdminCustomers, ADMIN],
  ['/admin/collectors', AdminCollectors, ADMIN],
  ['/admin/payouts', AdminPayouts, ADMIN],
  ['/admin/routes', AdminRoutes, ADMIN],
  ['/admin/map', AdminNetworkMap, ADMIN],
  ['/admin/fuel', AdminFuel, ADMIN],
  ['/admin/pricing', AdminPricing, ADMIN],
  ['/admin/analytics', AdminAnalytics, ADMIN],
  ['/admin/broadcast', AdminBroadcast, ADMIN]
];

function Routes() {
  return <Switch>
    <Route path="/" component={Landing} />
    <Route path="/login"><AuthPage mode="login" /></Route>
    <Route path="/register"><AuthPage mode="register" /></Route>
    <Route path="/auth/callback" component={AuthCallback} />
    {PRIVATE_ROUTES.map(([path, Page, roles]) => <Route key={path} path={path}><Protected roles={roles}><Suspense fallback={<FullPageLoader />}><Page /></Suspense></Protected></Route>)}
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ThemeProvider>
    <ToastProvider>
      <AuthProvider>
        <Router base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Routes />
          <WhatsAppButton />
        </Router>
      </AuthProvider>
    </ToastProvider>
  </ThemeProvider>;
}
