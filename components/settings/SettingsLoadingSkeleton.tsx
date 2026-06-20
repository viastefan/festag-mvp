export default function SettingsLoadingSkeleton() {
  return (
    <div className="set-loading" aria-busy="true" aria-label="Einstellungen werden geladen">
      <div className="set-load-block">
        <div className="set-load-line w40" />
        <div className="set-load-line w100" />
        <div className="set-load-line w100" />
        <div className="set-load-line w70" />
      </div>
      <div className="set-load-block">
        <div className="set-load-line w55" />
        <div className="set-load-line w100" />
        <div className="set-load-line w100" />
      </div>
    </div>
  )
}
