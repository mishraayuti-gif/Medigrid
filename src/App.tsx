import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { JourneyProvider } from './contexts/JourneyContext';
import { MusicPlayerProvider } from './contexts/MusicPlayerContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { ForgotPasswordPage, LoginPage, SignupPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { StressAssessmentPage } from './pages/StressAssessmentPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { MusicPage } from './pages/MusicPage';
import { EmotionsPage } from './pages/EmotionsPage';
import { CompanionPage } from './pages/CompanionPage';
import { AnalyticsSleepPage } from './pages/AnalyticsSleepPage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <JourneyProvider>
            <MusicPlayerProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                  <Route
                    path="/app"
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/app/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="stress" element={<StressAssessmentPage />} />
                    <Route path="emotions" element={<EmotionsPage />} />
                    <Route path="exercises" element={<ExercisesPage />} />
                    <Route path="music" element={<MusicPage />} />
                    <Route path="companion" element={<CompanionPage />} />
                    <Route path="analytics" element={<AnalyticsSleepPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </MusicPlayerProvider>
          </JourneyProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
