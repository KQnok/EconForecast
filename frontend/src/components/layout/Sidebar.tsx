import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, LogOut, TrendingUp, Menu, X } from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Мои проекты' },
  { to: '/projects/new', icon: PlusCircle, label: 'Новый проект' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    logout()
    qc.clear()
    navigate('/login')
  }

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ width: 30, height: 30, background: 'var(--primary)' }}>
          <TrendingUp size={15} color="white" />
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>EconForecast</span>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => setOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              isActive ? 'text-white' : 'hover:bg-gray-50'
            )}
            style={({ isActive }) => isActive
              ? { background: 'var(--primary)', color: 'white' }
              : { color: 'var(--text-muted)' }
            }>
            <Icon size={16} />{label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="flex items-center justify-center rounded-full text-xs font-semibold text-white flex-shrink-0"
            style={{ width: 30, height: 30, background: 'var(--primary)' }}>
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{user?.name}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost w-full justify-start text-xs py-2">
          <LogOut size={13} /> Выйти
        </button>
      </div>
    </>
  )

  return (
    <>
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen flex-col"
        style={{ width: 'var(--sidebar-w)', background: 'var(--surface)', borderRight: '1px solid var(--border)', zIndex: 40 }}>
        <SidebarContent />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', height: 56 }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-lg"
            style={{ width: 28, height: 28, background: 'var(--primary)' }}>
            <TrendingUp size={14} color="white" />
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>EconForecast</span>
        </div>
        <button onClick={() => setOpen(true)} className="btn btn-ghost py-2 px-2">
          <Menu size={20} />
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setOpen(false)} />
          <div className="relative flex flex-col w-64 h-full"
            style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
            <button onClick={() => setOpen(false)}
              className="absolute top-3 right-3 btn btn-ghost py-1.5 px-2">
              <X size={16} />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}