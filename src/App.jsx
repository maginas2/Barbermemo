import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginView from './views/LoginView';
import AdminDashboard from './views/AdminDashboard';
import BarberLayout from './views/BarberLayout';
import BarberDashboard from './views/BarberDashboard';
import ClientProfileView from './views/ClientProfileView';
import NewClientForm from './views/NewClientForm';
import NewAppointmentForm from './views/NewAppointmentForm';
import NewAttendanceForm from './views/NewAttendanceForm';
import CalendarView from './components/CalendarView';
import MetricsView from './components/MetricsView';
import PublicBookingView from './views/PublicBookingView';
import SettingsView from './views/SettingsView';
import QueueDashboard from './views/QueueDashboard';

const ScheduleRouteWrapper = () => {
  const { currentUser } = useAuth();
  return currentUser?.modeloAtendimento === 'fila' ? <QueueDashboard /> : <CalendarView />;
};

function AppRoutes() {
  const { currentUser, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-barber-dark flex flex-col items-center justify-center space-y-4 text-zinc-400 font-sans select-none">
        <div className="w-8 h-8 border-3 border-barber-accent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold">Carregando BarberMemo...</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* Auth Route */}
      <Route path="/login" element={<LoginView />} />

      {/* Public Booking Route */}
      <Route path="/agendar/:barberId" element={<PublicBookingView />} />

      {/* SaaS Admin Portal */}
      <Route
        path="/admin"
        element={
          currentUser?.role === 'admin' ? (
            <AdminDashboard />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Barber Client Workspace (Nested under BarberLayout wrapper) */}
      <Route
        path="/"
        element={
          currentUser && currentUser.role !== 'admin' ? (
            <BarberLayout />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        {/* Default route redirect to dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Main Barber Workspace Views */}
        <Route path="dashboard" element={<BarberDashboard />} />
        <Route path="settings" element={<SettingsView />} />
        
        {/* Client Management */}
        <Route path="clientes/novo" element={<NewClientForm />} />
        <Route path="clientes/:id" element={<ClientProfileView />} />
        <Route path="clientes/:id/editar" element={<NewClientForm />} />
        <Route path="clientes/:id/atendimentos/novo" element={<NewAttendanceForm />} />

        {/* Schedule & Appointments */}
        <Route path="agendamentos" element={<ScheduleRouteWrapper />} />
        <Route path="agendamentos/novo" element={<NewAppointmentForm />} />

        {/* Financial & Customer Retention Reports */}
        <Route path="metrics" element={<MetricsView />} />
      </Route>

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
