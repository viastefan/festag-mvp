/**
 * /blog layout — bewusst minimal, weil BlogShell auf jeder Article-Page
 * den eigentlichen Aufbau übernimmt. Hier nur HTML-Hülle, kein Auth-Gate
 * (der Blog ist öffentlich, taugt auch für die Marketing-Website).
 */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
