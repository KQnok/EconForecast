import { useState, useEffect } from 'react'
import { X, ArrowRight, ArrowLeft, TrendingUp, LayoutDashboard, PlusCircle, BarChart2, FileDown } from 'lucide-react'

const STEPS = [
  {
    icon: TrendingUp,
    title: 'Добро пожаловать в EconForecast',
    description: 'Это приложение помогает оценить, выгоден ли ваш проект с финансовой точки зрения — ещё до того, как вы вложите в него деньги.',
    hint: 'Подходит для анализа любых проектов: бизнес, стартап, производство, недвижимость.',
  },
  {
    icon: LayoutDashboard,
    title: 'Архив ваших проектов',
    description: 'На главной странице хранятся все ваши проекты. Вы можете вернуться к любому из них в любое время и посмотреть результаты.',
    hint: 'Каждый проект сохраняется автоматически после создания.',
  },
  {
    icon: PlusCircle,
    title: 'Создание проекта',
    description: 'При создании проекта вы вводите финансовые данные по периодам (обычно годам): сколько планируете зарабатывать, тратить и инвестировать.',
    hint: 'Данные можно взять из бизнес-плана, таблицы расходов или просто оценить приблизительно.',
  },
  {
    icon: BarChart2,
    title: 'Что означают результаты',
    description: (
      <div className="flex flex-col gap-2 text-sm">
        <div><span className="font-semibold">NPV</span> — если больше 0, проект прибыльный</div>
        <div><span className="font-semibold">IRR</span> — минимальная доходность проекта. Должна быть выше ставки дисконтирования</div>
        <div><span className="font-semibold">Срок окупаемости</span> — через сколько лет вернутся вложения</div>
        <div><span className="font-semibold">PI</span> — если больше 1, проект эффективен</div>
      </div>
    ),
    hint: 'Не пугайтесь терминов — у каждого поля есть подсказка с объяснением.',
  },
  {
    icon: FileDown,
    title: 'Экспорт и отчёты',
    description: 'После расчёта вы можете скачать готовый отчёт в формате PDF или Excel — с таблицами, графиками и всеми показателями.',
    hint: 'Отчёт можно использовать для презентации инвесторам или в учебных целях.',
  },
]

export default function WelcomeModal() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const seen = localStorage.getItem('onboarding_seen')
    if (!seen) setVisible(true)
  }, [])

  const close = () => {
    localStorage.setItem('onboarding_seen', '1')
    setVisible(false)
  }

  if (!visible) return null

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-up"
        style={{ border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  background: i === step ? 'var(--primary)' : '#e5e7eb',
                }}
              />
            ))}
          </div>
          <button onClick={close} className="btn btn-ghost py-1.5 px-2">
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ background: 'var(--primary-light)' }}
          >
            <Icon size={22} style={{ color: 'var(--primary)' }} />
          </div>

          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text)', fontFamily: 'DM Sans' }}>
            {current.title}
          </h2>

          <div className="text-sm mb-4" style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
            {typeof current.description === 'string' ? current.description : current.description}
          </div>

          {current.hint && (
            <div
              className="text-xs rounded-lg px-3 py-2.5"
              style={{ background: 'var(--primary-light)', color: 'var(--primary)', lineHeight: '1.5' }}
            >
              💡 {current.hint}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="btn btn-ghost text-sm py-2"
            style={{ opacity: step === 0 ? 0 : 1 }}
          >
            <ArrowLeft size={14} /> Назад
          </button>

          {isLast ? (
            <button onClick={close} className="btn btn-primary text-sm py-2">
              Начать работу <ArrowRight size={14} />
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} className="btn btn-primary text-sm py-2">
              Далее <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
