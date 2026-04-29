import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusCircle, Trash2, Save, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { projectsApi } from '../api'
import type { CashFlowPeriod, InflationRate } from '../types'
import Tooltip from '../components/ui/Tooltip'
import ProjectOnboarding from '../components/ui/ProjectOnboarding'

const TIPS = {
  name: 'Дайте проекту понятное название. Например: "Открытие кофейни" или "Расширение производства".',
  description: 'Необязательное поле. Опишите суть проекта в 1-2 предложениях.',
  discountRate: 'Ставка дисконтирования показывает, сколько стоят для вас деньги во времени. Обычно берётся равной ставке по банковскому депозиту или стоимости кредита. Типичные значения: 10-20%.',
  taxRate: 'Ставка налога на прибыль. В Беларуси стандартная ставка — 20%. Можно оставить по умолчанию.',
  inflation: 'Инфляция влияет на реальную стоимость доходов и расходов. Если не знаете — оставьте пустым или укажите 5%.',
  investment: 'Сколько денег вы вкладываете в этом периоде. Например: оборудование, ремонт, лицензии. Если вложений нет — оставьте 0.',
  revenue: 'Все источники дохода в этом периоде. Например: продажи товаров, оказание услуг, аренда. Указывайте суммы без НДС.',
  expense: 'Все постоянные и переменные расходы: зарплаты, аренда, сырьё, реклама и т.д.',
  period: 'Один период — обычно один год. Добавляйте столько периодов, на сколько лет рассчитан ваш проект.',
}

// Хранение строковых значений для удобного ввода
interface LineItemRaw { name: string; amount: string }
interface PeriodRaw {
  period: number
  revenues: LineItemRaw[]
  expenses: LineItemRaw[]
  investment: string
}

const emptyPeriodRaw = (period: number): PeriodRaw => ({
  period,
  revenues: [{ name: 'Выручка от продаж', amount: '' }],
  expenses: [{ name: 'Операционные расходы', amount: '' }],
  investment: '',
})

const toApiPeriod = (p: PeriodRaw): CashFlowPeriod => ({
  period: p.period,
  revenues: p.revenues.map(r => ({ name: r.name, amount: parseFloat(r.amount) || 0 })),
  expenses: p.expenses.map(e => ({ name: e.name, amount: parseFloat(e.amount) || 0 })),
  investment: parseFloat(p.investment) || 0,
})

const fromApiPeriod = (p: CashFlowPeriod): PeriodRaw => ({
  period: p.period,
  revenues: p.revenues.map(r => ({ name: r.name, amount: r.amount === 0 ? '' : String(r.amount) })),
  expenses: p.expenses.map(e => ({ name: e.name, amount: e.amount === 0 ? '' : String(e.amount) })),
  investment: p.investment === 0 ? '' : String(p.investment),
})

export default function ProjectNew() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [discountRate, setDiscountRate] = useState('10')
  const [taxRate, setTaxRate] = useState('20')
  const [periods, setPeriods] = useState<PeriodRaw[]>([emptyPeriodRaw(1)])
  const [inflationRates, setInflationRates] = useState<InflationRate[]>([])
  const [openPeriods, setOpenPeriods] = useState<Set<number>>(new Set([0]))

  const { data: existing } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(Number(id)),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setDescription(existing.description || '')
      setDiscountRate(String(existing.discount_rate * 100))
      setTaxRate(String(existing.tax_rate * 100))
      setPeriods(existing.cash_flows.map(fromApiPeriod))
      setInflationRates(existing.inflation_rates)
    }
  }, [existing])

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? projectsApi.update(Number(id), data) : projectsApi.create(data),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      navigate(`/projects/${project.id}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate({
      name,
      description: description || null,
      discount_rate: parseFloat(discountRate) / 100 || 0.1,
      tax_rate: parseFloat(taxRate) / 100 || 0.2,
      cash_flows: periods.map(toApiPeriod),
      inflation_rates: inflationRates,
    })
  }

  const addPeriod = () => {
    const next = periods.length + 1
    setPeriods(p => [...p, emptyPeriodRaw(next)])
    setOpenPeriods(p => new Set([...p, periods.length]))
  }

  const removePeriod = (idx: number) => {
    setPeriods(p => p.filter((_, i) => i !== idx).map((cf, i) => ({ ...cf, period: i + 1 })))
  }

  const togglePeriod = (idx: number) => {
    setOpenPeriods(p => { const s = new Set(p); s.has(idx) ? s.delete(idx) : s.add(idx); return s })
  }

  const updateInvestment = (idx: number, value: string) => {
    setPeriods(p => p.map((cf, i) => i === idx ? { ...cf, investment: value } : cf))
  }

  const addLineItem = (periodIdx: number, type: 'revenues' | 'expenses') => {
    setPeriods(p => p.map((cf, i) => i === periodIdx
      ? { ...cf, [type]: [...cf[type], { name: '', amount: '' }] } : cf))
  }

  const updateLineItem = (periodIdx: number, type: 'revenues' | 'expenses', itemIdx: number, field: 'name' | 'amount', value: string) => {
    setPeriods(p => p.map((cf, i) => i === periodIdx
      ? { ...cf, [type]: cf[type].map((item, j) => j === itemIdx ? { ...item, [field]: value } : item) }
      : cf))
  }

  const removeLineItem = (periodIdx: number, type: 'revenues' | 'expenses', itemIdx: number) => {
    setPeriods(p => p.map((cf, i) => i === periodIdx
      ? { ...cf, [type]: cf[type].filter((_, j) => j !== itemIdx) } : cf))
  }

  const addInflation = () => {
    setInflationRates(p => [...p, { year: p.length + 1, rate: 5 }])
  }

  return (
    <>
      {!isEdit && <ProjectOnboarding />}
      <div className="max-w-3xl mx-auto animate-fade-up px-4 sm:px-6 lg:px-0" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <button onClick={() => navigate(-1)} className="btn btn-ghost py-2 px-2">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
              {isEdit ? 'Редактировать проект' : 'Новый проект'}
            </h1>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Заполните данные — подсказки помогут разобраться с каждым полем
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Основная информация */}
          <div className="card p-4 sm:p-6" data-tour="name">
            <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Основная информация</h2>
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Название проекта *</label>
                  <Tooltip text={TIPS.name} />
                </div>
                <input className="input" placeholder="Например: Открытие кофейни" value={name}
                  onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Описание</label>
                  <Tooltip text={TIPS.description} />
                </div>
                <textarea className="input" rows={2} placeholder="Краткое описание проекта (необязательно)"
                  value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Параметры */}
          <div className="card p-4 sm:p-6">
            <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>Параметры расчёта</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Эти параметры влияют на то, как система оценивает ценность денег во времени
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div data-tour="discount-rate">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Ставка дисконтирования, %</label>
                  <Tooltip text={TIPS.discountRate} />
                </div>
                <input type="number" className="input" min={0} max={100} step={0.1}
                  value={discountRate}
                  onChange={e => setDiscountRate(e.target.value)}
                  onFocus={e => e.target.select()} />
              </div>
              <div data-tour="tax-rate">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text)' }}>Ставка налога на прибыль, %</label>
                  <Tooltip text={TIPS.taxRate} />
                </div>
                <input type="number" className="input" min={0} max={100} step={0.1}
                  value={taxRate}
                  onChange={e => setTaxRate(e.target.value)}
                  onFocus={e => e.target.select()} />
              </div>
            </div>
          </div>

          {/* Инфляция */}
          <div className="card p-4 sm:p-6" data-tour="inflation">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Инфляция по годам</h2>
                <Tooltip text={TIPS.inflation} />
              </div>
              <button type="button" onClick={addInflation} className="btn btn-ghost py-1.5 px-3 text-xs">
                <PlusCircle size={13} /> Добавить год
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Необязательно. Учитывается при расчёте реальной стоимости доходов и расходов
            </p>
            {inflationRates.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Инфляция не задана — расчёт без поправки на инфляцию</p>
            )}
            <div className="flex flex-col gap-2">
              {inflationRates.map((ir, idx) => (
                <div key={idx} className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Год</label>
                    <input type="number" className="input" value={ir.year}
                      onFocus={e => e.target.select()}
                      onChange={e => setInflationRates(p => p.map((r, i) => i === idx ? { ...r, year: Number(e.target.value) } : r))} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Ставка, %</label>
                    <input type="number" className="input" min={0} step={0.1} value={ir.rate}
                      onFocus={e => e.target.select()}
                      onChange={e => setInflationRates(p => p.map((r, i) => i === idx ? { ...r, rate: Number(e.target.value) } : r))} />
                  </div>
                  <button type="button" onClick={() => setInflationRates(p => p.filter((_, i) => i !== idx))}
                    className="btn btn-danger py-2 px-2.5 mb-0.5">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Денежные потоки */}
          <div className="card p-4 sm:p-6" data-tour="cashflows">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                  Денежные потоки ({periods.length} {periods.length === 1 ? 'период' : periods.length < 5 ? 'периода' : 'периодов'})
                </h2>
                <Tooltip text={TIPS.period} />
              </div>
              <button type="button" onClick={addPeriod} className="btn btn-ghost py-1.5 px-3 text-xs">
                <PlusCircle size={13} /> Добавить период
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Каждый период — обычно один год. Укажите доходы, расходы и инвестиции для каждого года проекта
            </p>

            <div className="flex flex-col gap-3">
              {periods.map((cf, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--border)' }}>
                  <div
                    className="flex items-center justify-between px-3 sm:px-4 py-3 cursor-pointer"
                    style={{ background: openPeriods.has(idx) ? 'var(--primary-light)' : 'var(--bg)' }}
                    onClick={() => togglePeriod(idx)}
                  >
                    <span className="font-medium text-sm" style={{ color: openPeriods.has(idx) ? 'var(--primary)' : 'var(--text)' }}>
                      Период {cf.period} {idx === 0 ? '— год вложений' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      {periods.length > 1 && (
                        <button type="button"
                          onClick={e => { e.stopPropagation(); removePeriod(idx) }}
                          className="btn btn-danger py-1 px-2 text-xs">
                          <Trash2 size={12} />
                        </button>
                      )}
                      {openPeriods.has(idx) ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </div>

                  {openPeriods.has(idx) && (
                    <div className="px-3 sm:px-4 pb-4 pt-3 flex flex-col gap-5">
                      {/* Инвестиции */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Инвестиционные затраты</label>
                          <Tooltip text={TIPS.investment} />
                        </div>
                        <input
                          type="number"
                          className="input"
                          min={0}
                          step={0.01}
                          placeholder="0"
                          value={cf.investment}
                          onFocus={e => e.target.select()}
                          onChange={e => updateInvestment(idx, e.target.value)}
                        />
                      </div>

                      {/* Доходы */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Статьи доходов</label>
                            <Tooltip text={TIPS.revenue} />
                          </div>
                          <button type="button" onClick={() => addLineItem(idx, 'revenues')}
                            className="text-xs flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                            <PlusCircle size={12} /> Добавить
                          </button>
                        </div>
                        {cf.revenues.map((r, ri) => (
                          <div key={ri} className="flex gap-2 mb-2">
                            <input
                              className="input flex-1 min-w-0"
                              placeholder="Название статьи дохода"
                              value={r.name}
                              onChange={e => updateLineItem(idx, 'revenues', ri, 'name', e.target.value)}
                            />
                            <input
                              type="number"
                              className="input w-28 sm:w-36 flex-shrink-0"
                              placeholder="Сумма"
                              min={0}
                              step={0.01}
                              value={r.amount}
                              onFocus={e => e.target.select()}
                              onChange={e => updateLineItem(idx, 'revenues', ri, 'amount', e.target.value)}
                            />
                            {cf.revenues.length > 1 && (
                              <button type="button" onClick={() => removeLineItem(idx, 'revenues', ri)}
                                className="btn btn-danger py-1.5 px-2 flex-shrink-0"><Trash2 size={12} /></button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Расходы */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Статьи расходов</label>
                            <Tooltip text={TIPS.expense} />
                          </div>
                          <button type="button" onClick={() => addLineItem(idx, 'expenses')}
                            className="text-xs flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                            <PlusCircle size={12} /> Добавить
                          </button>
                        </div>
                        {cf.expenses.map((ex, ei) => (
                          <div key={ei} className="flex gap-2 mb-2">
                            <input
                              className="input flex-1 min-w-0"
                              placeholder="Название статьи расхода"
                              value={ex.name}
                              onChange={e => updateLineItem(idx, 'expenses', ei, 'name', e.target.value)}
                            />
                            <input
                              type="number"
                              className="input w-28 sm:w-36 flex-shrink-0"
                              placeholder="Сумма"
                              min={0}
                              step={0.01}
                              value={ex.amount}
                              onFocus={e => e.target.select()}
                              onChange={e => updateLineItem(idx, 'expenses', ei, 'amount', e.target.value)}
                            />
                            {cf.expenses.length > 1 && (
                              <button type="button" onClick={() => removeLineItem(idx, 'expenses', ei)}
                                className="btn btn-danger py-1.5 px-2 flex-shrink-0"><Trash2 size={12} /></button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {saveMutation.isError && (
            <div className="text-sm px-4 py-3 rounded-lg" style={{ background: '#fef2f2', color: 'var(--danger)' }}>
              Ошибка сохранения. Проверьте данные и попробуйте снова.
            </div>
          )}
          <div className="flex gap-3 justify-end pb-8">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost">Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
              <Save size={15} />
              {saveMutation.isPending ? 'Сохранение...' : 'Сохранить проект'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
