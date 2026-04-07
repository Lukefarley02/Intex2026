import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DonorsPage from './pages/DonorsPage';
import ResidentsPage from './pages/ResidentsPage';
import PrivacyPage from './pages/PrivacyPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Authenticated routes — Admin and Staff only */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={['Admin', 'Staff']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/donors"
          element={
            <ProtectedRoute roles={['Admin', 'Staff']}>
              <DonorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/residents"
          element={
            <ProtectedRoute roles={['Admin', 'Staff']}>
              <ResidentsPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
