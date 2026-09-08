export default function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <span className="brand__mark" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className="brand__name">Word<span>Flow</span></span>
      {!compact && <span className="brand__tagline">实时互动词云</span>}
    </div>
  )
}
