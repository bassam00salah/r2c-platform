import logoSrc from '../assets/logo.png'

export default function Logo({ className = '' }) {
  return (
    <img
      src={logoSrc}
      alt="R2C Logo"
      className={className}
      style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
    />
  )
}
