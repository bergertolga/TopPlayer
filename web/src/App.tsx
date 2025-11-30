
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CityScreen } from './screens/CityScreen';
import { CapitalScreen } from './screens/CapitalScreen';
import { MapScreen } from './screens/MapScreen';
import { CouncilScreen } from './screens/CouncilScreen';
import { EventsScreen } from './screens/EventsScreen';
import { CombatScreen } from './screens/CombatScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { MarketScreen } from './screens/MarketScreen';
import { LoginScreen } from './screens/LoginScreen';
import { api } from './services/ApiClient';
import { ToastProvider } from './components/Toast';
import { GameModalProvider } from './components/GameModal';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!api.getUserId()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <GameModalProvider />
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<CityScreen />} />
            <Route path="capital" element={<CapitalScreen />} />
            <Route path="map" element={<MapScreen />} />
            <Route path="council" element={<CouncilScreen />} />
            <Route path="events" element={<EventsScreen />} />
            <Route path="combat" element={<CombatScreen />} />
            <Route path="market" element={<MarketScreen />} />
            <Route path="profile" element={<ProfileScreen />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
