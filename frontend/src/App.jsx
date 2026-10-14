import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { AdminAuthProvider } from './context/AdminAuthContext.jsx';
import { LocationProvider } from './context/LocationContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Header from './components/Header.jsx';
import BottomNav from './components/BottomNav.jsx';
import { Spinner, EmptyState } from './components/ui/States.jsx';
import Home from './pages/Home.jsx';
import { CategoryIndex, CategoryPage, NearbyPage, SearchPage } from './pages/Browse.jsx';
import FoodDetails from './pages/FoodDetails.jsx';
import AddFood from './pages/AddFood.jsx';
import { Login, Signup } from './pages/Auth.jsx';
import Account from './pages/Account.jsx';

// The admin area is only downloaded when someone opens /admin
const AdminLayout = lazy(() => import('./admin/AdminLayout.jsx'));
const AdminLogin = lazy(() => import('./admin/AdminLogin.jsx'));
const Dashboard = lazy(() => import('./admin/Dashboard.jsx'));
const AdminFoods = lazy(() => import('./admin/AdminFoods.jsx'));
const AdminReviews = lazy(() => import('./admin/AdminReviews.jsx'));
const AdminUsers = lazy(() => import('./admin/AdminUsers.jsx'));
const AdminPromotions = lazy(() => import('./admin/AdminPromotions.jsx'));

function PublicLayout() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="app">
      <Header />
      <main className="content"><Outlet /></main>
      <footer className="footer">© {new Date().getFullYear()} Food Finder Cambodia · Made for food lovers</footer>
      <BottomNav />
    </div>
  );
}

const NotFound = () => (
  <EmptyState title="Page not found" text="That page does not exist." action={<Link className="btn" to="/">Go home</Link>} />
);

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <LocationProvider>
            <Suspense fallback={<div className="adminloading"><Spinner label="Loading…" /></div>}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route index element={<Home />} />
                  <Route path="nearby" element={<NearbyPage />} />
                  <Route path="category" element={<CategoryIndex />} />
                  <Route path="category/:category" element={<CategoryPage />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="food/:id" element={<FoodDetails />} />
                  <Route path="add-food" element={<AddFood />} />
                  <Route path="login" element={<Login />} />
                  <Route path="signup" element={<Signup />} />
                  <Route path="account" element={<Account />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                <Route path="admin" element={<AdminAuthProvider />}>
                  <Route path="login" element={<AdminLogin />} />
                  <Route element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="foods" element={<AdminFoods />} />
                    <Route path="reviews" element={<AdminReviews />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="promotions" element={<AdminPromotions />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </LocationProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
