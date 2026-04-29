import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
