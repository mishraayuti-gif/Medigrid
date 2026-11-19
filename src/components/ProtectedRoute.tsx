import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1120] p-6">
        <div className="w-full max-w-md space-y-4">
          <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mx-auto" />
          <div className="h-28 w-full bg-slate-200/70 dark:bg-slate-800/70 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
