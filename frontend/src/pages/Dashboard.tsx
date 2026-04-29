import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusCircle, TrendingUp, Trash2, ChevronRight, Clock, Calculator } from 'lucide-react'
import { projectsApi } from '../api'
import WelcomeModal from '../components/ui/WelcomeModal'
import type { ProjectListItem } from '../types'

const fmt = (v: number | null, suffix = '', decimals = 2) =>
  v == null ? '—' : `${v.toLocaleString('ru-RU', { maximumFractionDigits: decimals })}${suffix}`

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })

function StatusBadge({ npv }: { npv: number | null }) {
  if (npv == null) return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: '#f3f4f6', color: 'var(--text-muted)' }}>
      Не рассчитан
    </span>
  )
  const ok = npv >= 0
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: ok ? '#dcfce7' : '#fef2f2', color: ok ? '#16a34a' : 'var(--danger)' }}>
      {ok ? 'Эффективен' : 'Убыточен'}
    </span>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [deleting, setDeleting] = useState<number | null>(null)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Удалить проект?')) return
    setDeleting(id)
    await deleteMutation.mutateAsync(id)
    setDeleting(null)
  }

  return (
    <>
      <WelcomeModal />
      <div className="max-w-5xl mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Мои проекты</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {projects.length > 0 ? `${projects.length} проект${projects.length === 1 ? '' : 'ов'}` : 'Нет проектов'}
          </p>
        </div>
        <Link to="/projects/new" className="btn btn-primary">
          <PlusCircle size={15} />
          Новый проект
        </Link>
      </div>

      {/* Empty */}
      {!isLoading && projects.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-20 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--primary-light)' }}>
            <Calculator size={24} style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Пока нет проектов</h3>
          <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-muted)' }}>
            Создайте первый проект и рассчитайте экономическую эффективность
          </p>
          <Link to="/projects/new" className="btn btn-primary">
            <PlusCircle size={15} />
            Создать проект
          </Link>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-5 h-24 animate-pulse"
              style={{ background: '#f3f4f6' }} />
          ))}
        </div>
      )}

      {/* Project list */}
      {!isLoading && projects.length > 0 && (
        <div className="flex flex-col gap-3">
          {projects.map((p: ProjectListItem, idx) => (
            <div
              key={p.id}
              className={`card p-5 cursor-pointer flex items-center gap-4 group animate-fade-up delay-${Math.min(idx + 1, 5)}`}
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--primary-light)' }}>
                <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{p.name}</h3>
                  <StatusBadge npv={p.npv} />
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {fmtDate(p.updated_at)}
                  </span>
                  {p.npv != null && (
                    <>
                      <span>NPV: <span className="metric-value font-medium" style={{ color: 'var(--text)' }}>{fmt(p.npv)}</span></span>
                      <span>IRR: <span className="metric-value font-medium" style={{ color: 'var(--text)' }}>{fmt(p.irr != null ? p.irr * 100 : null, '%', 1)}</span></span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => handleDelete(e, p.id)}
                  className="btn btn-danger py-1.5 px-2.5 text-xs"
                  disabled={deleting === p.id}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  )
}
