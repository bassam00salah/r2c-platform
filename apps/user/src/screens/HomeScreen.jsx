import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import FeedScreen from './FeedScreen'
import ExperimentalHomeScreen from './home-experiments/ExperimentalHomeScreen'
import './home-experiments/homeExperiments.css'

const STORAGE_KEY = 'r2c_home_design_variant'

const HOME_VARIANTS = [
  {
    id: 'original',
    shortLabel: 'الأصلية',
    title: 'الشاشة الحالية',
    description: 'النسخة الموجودة حاليا.',
    accent: '#15487d',
  },
  {
    id: 'direct',
    shortLabel: 'Direct',
    title: 'R2C Direct',
    description: 'تجربة 1',
    accent: '#ee3d37',
  },
  {
    id: 'discover',
    shortLabel: 'Discover',
    title: 'R2C Discover',
    description: 'تجربة 2',
    accent: '#00a88f',
  },
  {
    id: 'smart',
    shortLabel: 'Smart',
    title: 'R2C Smart List',
    description: 'تجربة 3',
    accent: '#ff7a00',
  },
]

function readSavedVariant() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return HOME_VARIANTS.some(item => item.id === saved) ? saved : 'direct'
  } catch {
    return 'direct'
  }
}

function DesignLabSwitcher({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const active = HOME_VARIANTS.find(item => item.id === value) || HOME_VARIANTS[1]

  useEffect(() => {
    if (!isOpen) return undefined
    const handleKey = event => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  const overlay = isOpen ? (
    <div className="r2c-lab-overlay" role="presentation" onClick={() => setIsOpen(false)}>
      <section
        className="r2c-lab-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="اختيار تصميم الشاشة الرئيسية"
        onClick={event => event.stopPropagation()}
      >
        <div className="r2c-lab-handle" />
        <div className="r2c-lab-heading">
          <div>
            <span>Home Design Lab</span>
            <h2>اختر الشاشة التي تريد تجربتها</h2>
          </div>
          <button type="button" className="r2c-lab-close" onClick={() => setIsOpen(false)} aria-label="إغلاق">×</button>
        </div>

        <div className="r2c-lab-options">
          {HOME_VARIANTS.map(option => {
            const selected = option.id === value
            return (
              <button
                type="button"
                key={option.id}
                className={`r2c-lab-option${selected ? ' is-selected' : ''}`}
                style={{ '--lab-accent': option.accent }}
                onClick={() => {
                  onChange(option.id)
                  setIsOpen(false)
                }}
              >
                <span className="r2c-lab-option-mark">{selected ? '✓' : ''}</span>
                <span className="r2c-lab-option-copy">
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
                <span className="r2c-lab-option-accent" />
              </button>
            )
          })}
        </div>

        <p className="r2c-lab-note">الاختيار لا يغيّر بيانات المستخدم أو إعدادات اللوحة الإدارية.</p>
      </section>
    </div>
  ) : null

  return (
    <>
      <button
        type="button"
        className="r2c-lab-trigger"
        style={{ '--lab-accent': active.accent }}
        onClick={() => setIsOpen(true)}
        aria-label="فتح معمل تصميم الشاشة الرئيسية"
      >
        <span className="r2c-lab-trigger-dot" />
        <span>تجربة: {active.shortLabel}</span>
      </button>
      {isOpen && typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay}
    </>
  )
}

export default function HomeScreen() {
  const [variant, setVariant] = useState(readSavedVariant)

  const changeVariant = nextVariant => {
    setVariant(nextVariant)
    try { localStorage.setItem(STORAGE_KEY, nextVariant) } catch { /* التخزين المحلي اختياري */ }
  }

  return (
    <>
      {variant === 'original' ? <FeedScreen /> : <ExperimentalHomeScreen variant={variant} />}
      <DesignLabSwitcher value={variant} onChange={changeVariant} />
    </>
  )
}
