import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

interface TooltipProps {
  text: string
}

export default function Tooltip({ text }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        style={{ color: 'var(--text-muted)', lineHeight: 1 }}
      >
        <HelpCircle size={14} />
      </button>
      {visible && (
        <div
          className="absolute z-50 bottom-6 left-1/2 -translate-x-1/2 rounded-lg px-3 py-2 text-xs text-white shadow-lg"
          style={{
            background: '#1f2937',
            width: '220px',
            lineHeight: '1.5',
            pointerEvents: 'none',
          }}
        >
          {text}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2"
            style={{
              width: 0, height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #1f2937',
            }}
          />
        </div>
      )}
    </div>
  )
}
