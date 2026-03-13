export default function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span style={{ color: '#ee7b26' }} className="font-black text-xl">R</span>
      <span style={{ color: '#15487d' }} className="font-black text-xl">2C</span>
    </div>
  )
}
