import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrendingUp, ArrowRight } from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store/auth'

export default function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.register(form)
      setAuth(data.user, data.access_token)
      localStorage.removeItem('onboarding_seen')
      localStorage.removeItem('project_onboarding_seen')
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)', fontFamily: 'DM Sans, sans-serif' }}>
      <div className="hidden lg:flex flex-col justify-between p-12 w-[420px] flex-shrink-0" style={{ background: 'var(--primary)' }}>
        <div className="flex items-center gap-2">
          <TrendingUp size={22} color="white" />
          <span className="font-semibold text-white text-lg">EconForecast</span>
        </div>
        <div>
          <p className="text-white/60 text-sm mb-2">Начните прямо сейчас</p>
          <h2 className="text-white text-3xl font-bold leading-snug mb-6">Создайте аккаунт и сохраняйте свои проекты</h2>
          <p className="text-white/70 text-sm leading-relaxed">Все ваши расчёты будут сохранены в личном архиве. Возвращайтесь к ним в любое время.</p>
        </div>
        <p className="text-white/40 text-xs">2026 EconForecast</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-up">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Регистрация</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            Уже есть аккаунт?{' '}
            <Link to="/login" style={{ color: 'var(--primary)' }} className="font-medium hover:underline">Войти</Link>
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--text)' }}>Ваше имя</label>
              <input type="text" className="input" placeholder="Например: Иван Иванов"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--text)' }}>Email</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--text)' }}>Пароль</label>
              <input type="password" className="input" placeholder="Минимум 6 символов"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
            {error && <div className="text-sm px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: 'var(--danger)' }}>{error}</div>}
            <button type="submit" className="btn btn-primary w-full justify-center mt-2" disabled={loading}>
              {loading ? 'Создание аккаунта...' : 'Создать аккаунт'}{!loading && <ArrowRight size={15} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
