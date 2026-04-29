import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Play, Download, FileSpreadsheet, Edit, RefreshCw, X, HelpCircle } from 'lucide-react'
import Plot from 'react-plotly.js'
import { projectsApi, calculationsApi, exportApi } from '../api'
import type { MonteCarloRange } from '../types'

function fmtYears(v: number | null | undefined): string {
  if (v == null) return '—'
  const n = Math.round(v * 10) / 10
  const int = Math.floor(n)
  let word = 'лет'
  if (int % 100 >= 11 && int % 100 <= 19) word = 'лет'
  else if (int % 10 === 1) word = 'год'
  else if (int % 10 >= 2 && int % 10 <= 4) word = 'года'
  return `${n.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ${word}`
}

const fmt = (v: number | null | undefined, suffix = '', dec = 2) =>
  v == null ? '—' : `${v.toLocaleString('ru-RU', { maximumFractionDigits: dec })}${suffix}`

function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex items-center ml-1">
      <button type="button"
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)} onBlur={() => setShow(false)}
        style={{ color: 'var(--text-muted)', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <HelpCircle size={13} />
      </button>
      {show && (
        <div className="absolute z-50 rounded-lg px-3 py-2 text-xs text-white shadow-xl"
          style={{ background: '#1f2937', width: 240, lineHeight: 1.55,
            bottom: '100%', left: '50%', transform: 'translateX(-50%)',
            marginBottom: 6, pointerEvents: 'none' }}>
          {text}
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0, borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent', borderTop: '5px solid #1f2937' }} />
        </div>
      )}
    </div>
  )
}

const METRIC_TIPS = {
  npv: 'NPV (Чистый дисконтированный доход) — сумма всех будущих доходов минус инвестиции, приведённых к сегодняшней стоимости. Если NPV > 0 — проект принесёт прибыль сверх требуемой доходности. Чем больше NPV, тем лучше.',
  irr: 'IRR (Внутренняя норма доходности) — максимальная ставка кредита, при которой проект ещё остаётся прибыльным. Если IRR выше вашей ставки дисконтирования — проект эффективен.',
  payback: 'Простой срок окупаемости — через сколько лет сумма доходов сравняется с суммой вложений (без учёта изменения стоимости денег во времени).',
  discounted_payback: 'Дисконтированный срок окупаемости — срок возврата инвестиций с учётом того, что деньги в будущем стоят меньше, чем сейчас. Всегда больше простого срока окупаемости.',
  pi: 'PI (Индекс прибыльности) — сколько рублей дохода приходится на каждый вложенный рубль с учётом дисконтирования. PI > 1 означает, что проект эффективен. PI = 1.5 означает, что на каждый вложенный рубль вы получаете 1.5 рубля.',
}

function MetricCard({ label, value, tip, sub, positive }: {
  label: string; value: string; tip: string; sub?: string; positive?: boolean
}) {
  return (
    <div className="card p-4 animate-fade-up">
      <div className="flex items-center mb-2">
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <InfoTip text={tip} />
      </div>
      <p className="metric-value text-lg font-semibold mb-1"
        style={{ color: positive == null ? 'var(--text)' : positive ? 'var(--success)' : 'var(--danger)' }}>
        {value}
      </p>
      {sub && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}

const MC_DEFAULT: MonteCarloRange = {
  revenue_min_pct: -0.2, revenue_max_pct: 0.2,
  expense_min_pct: -0.1, expense_max_pct: 0.1,
  investment_min_pct: -0.1, investment_max_pct: 0.1,
  simulations: 1000,
}

const PLOTLY_CONFIG = { displayModeBar: false, responsive: true }
const PLOT_LAYOUT_BASE = {
  paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
  font: { family: 'DM Sans', size: 11, color: '#6b7280' },
  margin: { t: 20, r: 12, b: 40, l: 52 },
  xaxis: { gridcolor: '#f3f4f6', linecolor: '#e5e7eb' },
  yaxis: { gridcolor: '#f3f4f6', linecolor: '#e5e7eb' },
}

export default function ProjectView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [showExcelPreview, setShowExcelPreview] = useState(false)
  const [mcParams, setMcParams] = useState<MonteCarloRange>(MC_DEFAULT)

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(Number(id)),
  })

  const { data: excelData } = useQuery({
    queryKey: ['excel-preview', id],
    queryFn: () => exportApi.excelPreview(Number(id)),
    enabled: showExcelPreview && project?.npv != null,
  })

  const calcMutation = useMutation({
    mutationFn: () => calculationsApi.run(Number(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  })

  const mcMutation = useMutation({
    mutationFn: () => calculationsApi.monteCarlo(Number(id), mcParams),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
    </div>
  )
  if (!project) return <div>Проект не найден</div>

  const hasResults = project.npv != null
  const mc = project.monte_carlo_data
  const sc = project.scenarios
  const sens = project.sensitivity_data
  const token = localStorage.getItem('access_token') || ''
  const pdfUrl = `/export/${id}/pdf`
  const pdfPreviewUrl = `/export/${id}/pdf-preview?token=${token}`
  const excelUrl = `/export/${id}/excel`

  const downloadFile = (url: string, filename: string) => {
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = filename
        a.click()
        URL.revokeObjectURL(a.href)
      })
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-0 pb-10" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5 sm:mb-7 animate-fade-up">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
          <button onClick={() => navigate('/dashboard')} className="btn btn-ghost py-2 px-2 flex-shrink-0 mt-0.5">
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate" style={{ color: 'var(--text)' }}>{project.name}</h1>
            {project.description && (
              <p className="text-xs sm:text-sm mt-0.5 overflow-hidden" style={{ color: 'var(--text-muted)' }}>{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap ml-10 sm:ml-0 flex-shrink-0">
          <Link to={`/projects/${id}/edit`} className="btn btn-ghost text-xs sm:text-sm py-2 px-3">
            <Edit size={13} /> Редактировать
          </Link>
          <button onClick={() => calcMutation.mutate()} disabled={calcMutation.isPending} className="btn btn-primary text-xs sm:text-sm py-2 px-3">
            {calcMutation.isPending
              ? <><RefreshCw size={13} className="animate-spin" /> Расчёт...</>
              : <><Play size={13} /> Рассчитать</>}
          </button>
        </div>
      </div>

      {/* Params strip */}
      <div className="card px-4 py-3 mb-4 flex flex-wrap gap-4 sm:gap-6 animate-fade-up delay-1">
        {[
          ['Ставка дисконт.', fmt(project.discount_rate * 100, '%', 1)],
          ['Налог на прибыль', fmt(project.tax_rate * 100, '%', 1)],
          ['Периодов', String(project.cash_flows.length)],
        ].map(([l, v]) => (
          <div key={l}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{l}</p>
            <p className="metric-value text-sm font-semibold" style={{ color: 'var(--text)' }}>{v}</p>
          </div>
        ))}
      </div>

      {!hasResults && (
        <div className="card flex flex-col items-center py-14 text-center animate-fade-in">
          <Play size={28} style={{ color: 'var(--primary)' }} className="mb-3 opacity-40" />
          <h3 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Расчёт ещё не выполнен</h3>
          <p className="text-sm mb-5 max-w-xs" style={{ color: 'var(--text-muted)' }}>
            Нажмите «Рассчитать» чтобы получить все метрики и графики
          </p>
          <button onClick={() => calcMutation.mutate()} disabled={calcMutation.isPending} className="btn btn-primary">
            <Play size={14} />{calcMutation.isPending ? 'Расчёт...' : 'Рассчитать'}
          </button>
        </div>
      )}

      {hasResults && (
        <div className="flex flex-col gap-4 sm:gap-5">
          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            <MetricCard label="NPV (ЧДД)" value={fmt(project.npv)} tip={METRIC_TIPS.npv}
              positive={(project.npv ?? 0) >= 0} />
            <MetricCard label="IRR (ВНД)" value={fmt(project.irr != null ? project.irr * 100 : null, '%', 1)}
              tip={METRIC_TIPS.irr}
              positive={project.irr != null ? project.irr > project.discount_rate : undefined} />
            <MetricCard label="Срок окупаемости" value={fmtYears(project.payback_period)}
              tip={METRIC_TIPS.payback} sub="Простой" />
            <MetricCard label="Диск. срок окуп." value={fmtYears(project.discounted_payback)}
              tip={METRIC_TIPS.discounted_payback} sub="С дисконтированием" />
            <MetricCard label="PI" value={fmt(project.pi, '', 3)} tip={METRIC_TIPS.pi}
              positive={(project.pi ?? 0) >= 1}
              sub={(project.pi ?? 0) >= 1 ? 'Проект эффективен' : 'Неэффективен'} />
          </div>

          {/* Вывод */}
          <div className="card p-4 sm:p-5 animate-fade-up delay-1" style={{ borderLeft: '3px solid var(--primary)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--primary)' }}>ВЫВОД</p>
            <p className="text-sm" style={{ color: 'var(--text)', lineHeight: 1.6 }}>
              {(project.npv ?? 0) >= 0
                ? `Проект экономически эффективен — NPV положительный (${fmt(project.npv)}). `
                : `Проект убыточен при данных параметрах — NPV отрицательный (${fmt(project.npv)}). `}
              {project.irr != null && project.irr > project.discount_rate
                ? `IRR (${fmt(project.irr * 100, '%', 1)}) превышает ставку дисконтирования — проект обеспечивает требуемую доходность. `
                : project.irr != null
                ? `IRR (${fmt(project.irr * 100, '%', 1)}) ниже ставки дисконтирования — доходность недостаточна. `
                : ''}
              {project.payback_period != null
                ? `Вложения окупятся через ${fmtYears(project.payback_period)}.`
                : ''}
            </p>
          </div>

          {/* Cash flows */}
          <div className="card p-4 sm:p-5 animate-fade-up delay-2">
            <div className="flex items-center mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Денежные потоки (NCF)</h3>
              <InfoTip text="NCF (чистый денежный поток) — разница между доходами и расходами в каждом периоде после налогов и инвестиций. Отрицательный NCF в первом периоде — норма: это период вложений. Затем потоки должны стать положительными." />
            </div>
            <Plot
              data={[{
                x: project.cash_flows.map(cf => `Период ${cf.period}`),
                y: project.cash_flows.map(cf =>
                  cf.revenues.reduce((s, r) => s + r.amount, 0) -
                  cf.expenses.reduce((s, e) => s + e.amount, 0) -
                  cf.investment
                ),
                type: 'bar',
                marker: {
                  color: project.cash_flows.map(cf => {
                    const v = cf.revenues.reduce((s, r) => s + r.amount, 0) -
                      cf.expenses.reduce((s, e) => s + e.amount, 0) - cf.investment
                    return v >= 0 ? '#6366f1' : '#ef4444'
                  })
                },
              }]}
              layout={{ ...PLOT_LAYOUT_BASE, height: 240, showlegend: false }}
              config={PLOTLY_CONFIG}
              style={{ width: '100%' }}
            />
          </div>

          {/* Scenarios */}
          {sc && (
            <div className="card p-4 sm:p-5 animate-fade-up delay-3">
              <div className="flex items-center mb-3">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Анализ сценариев</h3>
                <InfoTip text="Три сценария развития: пессимистичный (выручка −20%, расходы +15%), реалистичный (базовые данные) и оптимистичный (выручка +20%, расходы −10%). График показывает накопленный NPV по периодам для каждого сценария." />
              </div>
              <Plot
                data={[
                  { x: sc.periods, y: sc.pessimistic.cumulative, name: 'Пессимистичный', type: 'scatter' as const, mode: 'lines+markers' as const, line: { color: '#ef4444', width: 2 } },
                  { x: sc.periods, y: sc.realistic.cumulative,   name: 'Реалистичный',   type: 'scatter' as const, mode: 'lines+markers' as const, line: { color: '#6366f1', width: 2 } },
                  { x: sc.periods, y: sc.optimistic.cumulative,  name: 'Оптимистичный',  type: 'scatter' as const, mode: 'lines+markers' as const, line: { color: '#22c55e', width: 2 } },
                ]}
                layout={{ ...PLOT_LAYOUT_BASE, height: 260, showlegend: true,
                  legend: { orientation: 'h' as const, y: -0.28, font: { size: 11 } } }}
                config={PLOTLY_CONFIG}
                style={{ width: '100%' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                {(['pessimistic', 'realistic', 'optimistic'] as const).map(key => {
                  const labels = { pessimistic: 'Пессимистичный', realistic: 'Реалистичный', optimistic: 'Оптимистичный' }
                  const colors = { pessimistic: 'var(--danger)', realistic: 'var(--primary)', optimistic: 'var(--success)' }
                  return (
                    <div key={key} className="rounded-lg p-3" style={{ background: 'var(--bg)' }}>
                      <p className="text-xs font-semibold mb-1.5" style={{ color: colors[key] }}>{labels[key]}</p>
                      <p className="metric-value text-sm font-bold" style={{ color: 'var(--text)' }}>NPV: {fmt(sc[key].npv)}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Окупаемость: {fmtYears(sc[key].payback)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sensitivity */}
          {sens && (
            <div className="card p-4 sm:p-5 animate-fade-up delay-4">
              <div className="flex items-center mb-3">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Анализ чувствительности NPV</h3>
                <InfoTip text="Показывает, как изменится NPV если один из ключевых факторов вырастет или упадёт на 10-30%. Чем круче наклон линии — тем сильнее NPV зависит от этого фактора. Самый крутой наклон = главный риск проекта." />
              </div>
              <Plot
                data={Object.entries(sens.factors).map(([factor, values], i) => ({
                  x: sens.steps,
                  y: values,
                  name: ({ revenue: 'Выручка', expense: 'Расходы', investment: 'Инвестиции', discount_rate: 'Ставка диск.' } as any)[factor] || factor,
                  type: 'scatter' as const,
                  mode: 'lines+markers' as const,
                  line: { color: ['#6366f1', '#ef4444', '#f59e0b', '#22c55e'][i], width: 2 },
                }))}
                layout={{
                  ...PLOT_LAYOUT_BASE, height: 260, showlegend: true,
                  xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: 'Изменение фактора, %' },
                  yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: 'NPV' },
                  legend: { orientation: 'h' as const, y: -0.3, font: { size: 11 } },
                }}
                config={PLOTLY_CONFIG}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {/* Monte Carlo */}
          <div className="card p-4 sm:p-5 animate-fade-up delay-5">
            <div className="flex items-center mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Моделирование Монте-Карло</h3>
              <InfoTip text="Запускает 1000 симуляций с случайными вариациями выручки, расходов и инвестиций в заданных диапазонах. На выходе — распределение вероятностей NPV. Вероятность NPV > 0 показывает шанс того, что проект окажется прибыльным." />
            </div>
            {mc ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {([
                    ['Средний NPV', fmt(mc.mean_npv), 'Ожидаемый NPV по всем симуляциям'],
                    ['Ст. отклонение', fmt(mc.std_npv), 'Разброс значений — чем меньше, тем стабильнее'],
                    ['5-й перцентиль', fmt(mc.percentile_5), 'В 95% случаев NPV будет выше этого значения'],
                    ['P(NPV > 0)', fmt(mc.prob_positive * 100, '%', 1), 'Вероятность того, что проект окажется прибыльным'],
                  ] as [string, string, string][]).map(([l, v, tip]) => (
                    <div key={l} className="rounded-lg p-3" style={{ background: 'var(--bg)' }}>
                      <div className="flex items-center mb-1">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{l}</p>
                        <InfoTip text={tip} />
                      </div>
                      <p className="metric-value text-sm font-semibold" style={{ color: 'var(--text)' }}>{v}</p>
                    </div>
                  ))}
                </div>
                <Plot
                  data={[{
                    x: mc.histogram.bins.slice(0, -1).map((b, i) => (b + mc.histogram.bins[i + 1]) / 2),
                    y: mc.histogram.counts,
                    type: 'bar',
                    marker: { color: '#6366f1', opacity: 0.75 },
                  }]}
                  layout={{
                    ...PLOT_LAYOUT_BASE, height: 220,
                    xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: 'NPV' },
                    yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: 'Симуляций' },
                    showlegend: false,
                  }}
                  config={PLOTLY_CONFIG}
                  style={{ width: '100%' }}
                />
                <button onClick={() => mcMutation.mutate()} disabled={mcMutation.isPending}
                  className="btn btn-ghost text-xs mt-3">
                  <RefreshCw size={12} /> Пересчитать
                </button>
              </>
            ) : (
              <div>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  Задайте диапазоны вариации факторов и запустите симуляцию
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {([
                    ['Выручка мин., %', 'revenue_min_pct'],
                    ['Выручка макс., %', 'revenue_max_pct'],
                    ['Расходы мин., %', 'expense_min_pct'],
                    ['Расходы макс., %', 'expense_max_pct'],
                    ['Инвестиции мин., %', 'investment_min_pct'],
                    ['Инвестиции макс., %', 'investment_max_pct'],
                  ] as [string, string][]).map(([label, key]) => (
                    <div key={key}>
                      <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>{label}</label>
                      <input type="number" className="input" step={1}
                        value={Math.round((mcParams as any)[key] * 100)}
                        onChange={e => setMcParams(p => ({ ...p, [key]: Number(e.target.value) / 100 }))} />
                    </div>
                  ))}
                </div>
                <div className="flex items-end gap-3 flex-wrap">
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Симуляций</label>
                    <input type="number" className="input w-28" min={100} max={10000} step={100}
                      value={mcParams.simulations}
                      onChange={e => setMcParams(p => ({ ...p, simulations: Number(e.target.value) }))} />
                  </div>
                  <button onClick={() => mcMutation.mutate()} disabled={mcMutation.isPending} className="btn btn-primary">
                    {mcMutation.isPending ? <><RefreshCw size={13} className="animate-spin" /> Расчёт...</> : <><Play size={13} /> Запустить</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Export */}
          <div className="card p-4 sm:p-5 animate-fade-up">
            <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text)' }}>Экспорт отчёта</h3>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button onClick={() => setShowPdfPreview(true)} className="btn btn-ghost text-xs sm:text-sm">
                <Download size={13} /> Превью PDF
              </button>
              <button onClick={() => downloadFile(pdfUrl, `report_${id}.pdf`)} className="btn btn-primary text-xs sm:text-sm">
                <Download size={13} /> Скачать PDF
              </button>
              <button onClick={() => setShowExcelPreview(true)} className="btn btn-ghost text-xs sm:text-sm">
                <FileSpreadsheet size={13} /> Превью Excel
              </button>
              <button onClick={() => downloadFile(excelUrl, `report_${id}.xlsx`)} className="btn btn-ghost text-xs sm:text-sm">
                <FileSpreadsheet size={13} /> Скачать Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3"
          style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl overflow-hidden flex flex-col" style={{ width: '96vw', height: '92vh', maxWidth: 900 }}>
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="font-semibold text-sm">Превью PDF</span>
              <div className="flex gap-2">
                <button onClick={() => downloadFile(pdfUrl, `report_${id}.pdf`)} className="btn btn-primary text-xs py-1.5">
                  <Download size={12} /> Скачать
                </button>
                <button onClick={() => setShowPdfPreview(false)} className="btn btn-ghost py-1.5 px-2">
                  <X size={15} />
                </button>
              </div>
            </div>
            <iframe src={pdfPreviewUrl} className="flex-1 w-full border-0" title="PDF Preview" />
          </div>
        </div>
      )}

      {/* Excel Preview Modal */}
      {showExcelPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3"
          style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white rounded-2xl overflow-hidden flex flex-col" style={{ width: '96vw', height: '92vh', maxWidth: 900 }}>
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="font-semibold text-sm">Превью таблицы</span>
              <div className="flex gap-2">
                <button onClick={() => downloadFile(excelUrl, `report_${id}.xlsx`)} className="btn btn-primary text-xs py-1.5">
                  <Download size={12} /> Скачать Excel
                </button>
                <button onClick={() => setShowExcelPreview(false)} className="btn btn-ghost py-1.5 px-2">
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {excelData ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse" style={{ minWidth: 560 }}>
                    <thead>
                      <tr style={{ background: 'var(--primary)' }}>
                        {['Период','Выручка','Расходы','Инвестиции','NCF','NCF диск.','NPV накопл.'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-white font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {excelData.cash_flow_table?.map((row: any, i: number) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : 'var(--bg)' }}>
                          <td className="px-3 py-2">{row.period}</td>
                          <td className="px-3 py-2 metric-value">{row.revenue?.toLocaleString('ru-RU')}</td>
                          <td className="px-3 py-2 metric-value">{row.expense?.toLocaleString('ru-RU')}</td>
                          <td className="px-3 py-2 metric-value">{row.investment?.toLocaleString('ru-RU')}</td>
                          <td className="px-3 py-2 metric-value" style={{ color: row.ncf >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {row.ncf?.toLocaleString('ru-RU')}
                          </td>
                          <td className="px-3 py-2 metric-value">{row.discounted_ncf?.toLocaleString('ru-RU')}</td>
                          <td className="px-3 py-2 metric-value">{row.cumulative_npv?.toLocaleString('ru-RU')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 rounded-full border-2 animate-spin"
                    style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}