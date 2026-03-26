/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Vault from "./pages/Vault";
import Workspace from "./pages/Workspace";
import Learn from "./pages/Learn";
import Revise from "./pages/Revise";
import Mission from "./pages/Mission";
import Analyse from "./pages/Analyse";
import ActiveMission from "./pages/ActiveMission";
import Login from "./pages/Login";
import More from "./pages/More";
import { MissionProvider } from "./lib/MissionContext";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";

// Auth guard component
const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B12] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Handle Login route separately
  if (location.pathname === "/login") {
    return user ? <Navigate to="/" replace /> : <Login />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <MissionProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analyse" element={<Analyse />} />
          <Route path="/mission" element={<Mission />} />
          <Route path="/mission/:id" element={<ActiveMission />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/revise" element={<Revise />} />
          <Route path="/more" element={<More />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </MissionProvider>
  );
};

export default function App() {
  console.log('[App] Rendering App component');
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
