import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import Layout from '@/components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Home from './pages/Home';
import ExamTypes from './pages/ExamTypes';
import Structures from './pages/Structures';
import Questions from './pages/Questions';
import Employees from './pages/Employees';
import ExamClient from './pages/ExamClient';
import ActiveExam from './pages/ActiveExam';
import './style.css';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Yüklənir...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/exam-client" element={<ExamClient />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/active-exam" element={<ActiveExam />} />
        <Route path="/system/exam-types" element={<ExamTypes />} />
        <Route path="/system/structures" element={<Structures />} />
        <Route path="/system/questions" element={<Questions />} />
        <Route path="/system/employees" element={<Employees />} />
      </Route>
    </Routes>
  );
};

const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <AppRoutes />
            <Toaster />
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
