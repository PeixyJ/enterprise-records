import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { HashRouter, Routes, Route, Navigate } from "react-router"
import "./index.css"
import LoginPage from "./pages/login"
import App from "./App"
import DashboardPage from "./pages/dashboard"
import ScreeningPage from "./pages/screening"
import ScreeningDetailPage from "./pages/screening-detail"
import CityPage from "./pages/city"
import TownPage from "./pages/town"
import SettingsPage from "./pages/settings"
import AdvancedSettingsPage from "./pages/advanced-settings"

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const authenticated = sessionStorage.getItem("authenticated") === "true"
  return authenticated ? children : <Navigate to="/login" replace />
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/app"
          element={
            <PrivateRoute>
              <App />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="screening" element={<ScreeningPage />} />
          <Route path="screening/:id" element={<ScreeningDetailPage />} />
          <Route path="city" element={<CityPage />} />
          <Route path="town" element={<TownPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="advanced-settings" element={<AdvancedSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  </StrictMode>
)
