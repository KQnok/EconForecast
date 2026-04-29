import { useState, useEffect } from 'react'
import { ArrowRight, ArrowLeft, X } from 'lucide-react'

interface Step {
  selector: string
  title: string
  description: string
  hint?: string
  position?: 'top' | 'bottom'
}

const STEPS: Step[] = [
  {
    selector: '[data-tour="name"]',
    title: 'Название проекта',
    description: 'Дайте проекту понятное название. Например: «Открытие кофейни» или «Покупка оборудования». Это имя будет отображаться в архиве.',
    hint: 'Описание — необязательно, но помогает не запутаться если проектов много.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="discount-rate"]',
    title: 'Ставка дисконтирования',
    description: 'Показывает «цену» денег для вас во времени. Берёте кредит — ставьте процент по кредиту. Вкладываете своё — желаемую доходность или ставку депозита.',
    hint: 'Не знаете что поставить? Оставьте 10% — стандартное значение.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="tax-rate"]',
    title: 'Ставка налога на прибыль',
    description: 'В Беларуси стандартная ставка — 20%. Влияет на расчёт чистой прибыли в каждом периоде. Можно оставить по умолчанию.',
    hint: 'Налог применяется только к положительной прибыли (доходы минус расходы).',
    position: 'bottom',
  },
  {
    selector: '[data-tour="inflation"]',
    title: 'Инфляция по годам',
    description: 'Необязательное поле. Если заполнить — доходы и расходы будут скорректированы на рост цен. Для учебного проекта можно пропустить.',
    hint: 'Стандартный уровень инфляции в Беларуси — около 5-7% в год.',
    position: 'bottom',
  },
  {
    selector: '[data-tour="cashflows"]',
    title: 'Денежные потоки по периодам',
    description: 'Каждый период — обычно один год. В первом периоде обычно только инвестиции. В следующих — доходы и расходы. Добавляйте столько периодов, на сколько лет рассчитан проект.',
    hint: 'Пример: 3-летний проект = 3 периода. Год 1 — вложения, годы 2-3 — прибыль.',
    position: 'top',
  },
]

const STORAGE_KEY = 'project_onboarding_seen'

interface Rect { top: number; left: number; width: number; height: number }

export default function ProjectOnboarding() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [opacity, setOpacity] = useState(0)
  const tooltipWidth = 320
  const pad = 10

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [visible])

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) setTimeout(() => setVisible(true), 600)
  }, [])

  useEffect(() => {
    if (!visible) return
    updateRect(step)
  }, [step, visible])

  const updateRect = (stepIdx: number) => {
    setOpacity(0)
    const selector = STEPS[stepIdx].selector
    const el = document.querySelector(selector)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      setTimeout(() => setOpacity(1), 50)
    }, 450)
  }

  const close = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    document.body.style.overflow = ''
    setVisible(false)
  }

  if (!visible || !rect) return null

  const current = STEPS[step]
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1

  const highlight = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  }

  let tooltipTop = highlight.top + highlight.height + 14
  let tooltipLeft = highlight.left + highlight.width / 2 - tooltipWidth / 2

  if (current.position === 'top') {
    tooltipTop = highlight.top - 14 - 240
  }

  tooltipLeft = Math.max(16, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - 16))
  tooltipTop = Math.max(16, tooltipTop)

  return (
    <div className="fixed inset-0 z-50" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Затемнение — 4 полосы */}
      {[
        { top: 0, left: 0, right: 0, height: highlight.top },
        { top: highlight.top + highlight.height, left: 0, right: 0, bottom: 0 },
        { top: highlight.top, left: 0, width: highlight.left, height: highlight.height },
        { top: highlight.top, left: highlight.left + highlight.width, right: 0, height: highlight.height },
      ].map((style, i) => (
        <div key={i} className="absolute"
          style={{ ...style, background: 'rgba(0,0,0,0.55)', transition: 'all 0.4s ease', opacity, cursor: 'default' }}
          onClick={close}
        />
      ))}

      {/* Рамка подсветки */}
      <div className="absolute rounded-xl"
        style={{
          top: highlight.top, left: highlight.left,
          width: highlight.width, height: highlight.height,
          boxShadow: '0 0 0 3px #6366f1',
          border: '2px solid #6366f1',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity,
          pointerEvents: 'none',
        }}
      />

      {/* Тултип */}
      <div className="absolute bg-white rounded-2xl shadow-2xl"
        style={{
          top: tooltipTop, left: tooltipLeft, width: tooltipWidth,
          border: '1px solid var(--border)',
          transition: 'opacity 0.3s ease, top 0.4s cubic-bezier(0.4,0,0.2,1), left 0.4s cubic-bezier(0.4,0,0.2,1)',
          opacity, zIndex: 60,
        }}
      >
        {/* Прогресс */}
        <div className="flex items-center justify-between px-4 pt-4 pb-0">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className="rounded-full"
                style={{ width: i === step ? 16 : 5, height: 5, background: i === step ? 'var(--primary)' : '#e5e7eb', transition: 'all 0.3s ease' }} />
            ))}
          </div>
          <button onClick={close}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={14} />
          </button>
        </div>

        <div className="px-4 py-3">
          <p className="font-semibold text-sm mb-1.5" style={{ color: 'var(--text)' }}>{current.title}</p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>{current.description}</p>
          {current.hint && (
            <div className="text-xs rounded-lg px-2.5 py-2"
              style={{ background: 'var(--primary-light)', color: 'var(--primary)', lineHeight: '1.5' }}>
              💡 {current.hint}
            </div>
          )}
        </div>

        {/* Две кнопки */}
        <div className="flex items-center gap-2 px-4 pb-4">
          {isFirst ? (
            <button onClick={close} className="btn btn-ghost text-xs py-2" style={{ flex: 1, justifyContent: 'center' }}>
              Пропустить
            </button>
          ) : (
            <button onClick={() => setStep(s => s - 1)} className="btn btn-ghost text-xs py-2" style={{ flex: 1, justifyContent: 'center' }}>
              <ArrowLeft size={12} /> Назад
            </button>
          )}
          {isLast ? (
            <button onClick={close} className="btn btn-primary text-xs py-2" style={{ flex: 1, justifyContent: 'center' }}>
              Готово <ArrowRight size={12} />
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} className="btn btn-primary text-xs py-2" style={{ flex: 1, justifyContent: 'center' }}>
              Далее <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
