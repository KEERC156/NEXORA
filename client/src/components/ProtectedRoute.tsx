import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="page-loading" role="status">Restoring your workspace…</div>
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />
}
