import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
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
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Authenticated routes (auth guard to be added) */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/donors" element={<DonorsPage />} />
        <Route path="/residents" element={<ResidentsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
