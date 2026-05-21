import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, ThemeProvider, SettingsProvider, useAuth } from './context/AppContext'
import { InventoryProvider } from './context/InventoryContext'
import { SubscriptionProvider } from './context/SubscriptionContext'
import { FinanceProvider } from './context/FinanceContext'

function GlobalProviders({ children }) {
  return (
    <SettingsProvider>
      <InventoryProvider>
        <SubscriptionProvider>
          <FinanceProvider>
            {children}
          </FinanceProvider>
        </SubscriptionProvider>
      </InventoryProvider>
    </SettingsProvider>
  )
}
import SubscriptionWrapper from './layouts/SubscriptionWrapper'
import AppLayout from './layouts/AppLayout'
import Landing from './pages/Landing'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import POS from './pages/POS'
import Reports from './pages/Reports'
import AdminPanel from './pages/AdminPanel'
import Settings from './pages/Settings'
import Deliveries from './pages/Deliveries'
import BillingModule from './pages/BillingModule'
import FinanceManager from './pages/FinanceManager'
import KitchenMonitor from './pages/KitchenMonitor'
import Welcome from './pages/Welcome'
import SupportTickets from './pages/SupportTickets'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/landing" replace />
  }
  return children
}

function PermissionGuard({ children, requiredPath }) {
  const { user } = useAuth()
  if (user?.role === 'Superadmin') return children
  if (user?.role === 'admin') {
    if (requiredPath === '/admin') return <Navigate to="/" replace />
    return children
  }
  if (user?.permissions?.includes(requiredPath)) return children
  return <Navigate to="/" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <GlobalProviders>
          <BrowserRouter>
            <Routes>
              <Route path="/landing" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/pay-now" element={
                <div className="h-screen bg-dark-bg">
                  <BillingModule />
                </div>
              } />
              <Route path="/" element={
                <ProtectedRoute>
                  <SubscriptionWrapper>
                    <AppLayout />
                  </SubscriptionWrapper>
                </ProtectedRoute>
              }>
                <Route index element={<Welcome />} />
                <Route path="dashboard" element={<PermissionGuard requiredPath="/dashboard"><Dashboard /></PermissionGuard>} />
                <Route path="inventory" element={<PermissionGuard requiredPath="/inventory"><Inventory /></PermissionGuard>} />
                <Route path="pos" element={<PermissionGuard requiredPath="/pos"><POS /></PermissionGuard>} />
                <Route path="reports" element={<PermissionGuard requiredPath="/reports"><Reports /></PermissionGuard>} />
                <Route path="deliveries" element={<PermissionGuard requiredPath="/deliveries"><Deliveries /></PermissionGuard>} />
                <Route path="admin" element={<PermissionGuard requiredPath="/admin"><AdminPanel /></PermissionGuard>} />
                <Route path="settings" element={<PermissionGuard requiredPath="/settings"><Settings /></PermissionGuard>} />
                <Route path="payments" element={<PermissionGuard requiredPath="/payments"><BillingModule /></PermissionGuard>} />
                <Route path="kitchen" element={<PermissionGuard requiredPath="/kitchen"><KitchenMonitor /></PermissionGuard>} />
                <Route path="finance" element={<PermissionGuard requiredPath="/finance"><FinanceManager /></PermissionGuard>} />
                <Route path="support" element={<PermissionGuard requiredPath="/support"><SupportTickets /></PermissionGuard>} />
                {/* Other routes can be added here */}
                <Route path="*" element={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <h2 className="text-2xl font-bold mb-2">Página en construcción</h2>
                      <p className="text-gray-500">Pronto estará disponible.</p>
                    </div>
                  </div>
                } />
              </Route>
            </Routes>
          </BrowserRouter>
        </GlobalProviders>
      </ThemeProvider>
    </AuthProvider>
  )
}
