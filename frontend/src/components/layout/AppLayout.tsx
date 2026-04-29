import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <main
        className="px-4 py-6 sm:px-6 sm:py-8"
        style={{
          marginLeft: 0,
          paddingTop: 'calc(56px + 1.5rem)',
          minHeight: '100vh',
        }}
      >
        <style>{`
          @media (min-width: 1024px) {
            main {
              margin-left: var(--sidebar-w) !important;
              padding-top: 2rem !important;
            }
          }
        `}</style>
        <Outlet />
      </main>
    </div>
  )
}