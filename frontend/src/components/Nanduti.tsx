/**
 * Ñandutí — el encaje radial paraguayo (en guaraní, "telaraña").
 * Filigrana generada de forma determinística: anillos concéntricos, radios,
 * nodos en las intersecciones y festones en el borde. Dibuja con `currentColor`,
 * así que el color se controla con clases de texto (text-brass-400, etc.).
 */
export default function Nanduti({
  size = 120,
  spokes = 16,
  rings = 4,
  strokeWidth = 0.5,
  className = '',
}: {
  size?: number
  spokes?: number
  rings?: number
  strokeWidth?: number
  className?: string
}) {
  const c = 50
  const R = 47
  const ringRadii = Array.from({ length: rings }, (_, i) => (R * (i + 1)) / rings)
  const angles = Array.from({ length: spokes }, (_, i) => (i * 360) / spokes)
  const pt = (ang: number, r: number): [number, number] => [
    c + r * Math.cos(((ang - 90) * Math.PI) / 180),
    c + r * Math.sin(((ang - 90) * Math.PI) / 180),
  ]

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      {/* anillos concéntricos */}
      {ringRadii.map((r, i) => (
        <circle key={`r${i}`} cx={c} cy={c} r={r} opacity={0.32 + i * 0.12} />
      ))}
      {/* radios */}
      {angles.map((a, i) => {
        const [x, y] = pt(a, R)
        return <line key={`s${i}`} x1={c} y1={c} x2={x} y2={y} opacity={0.28} />
      })}
      {/* festones en el borde exterior */}
      {angles.map((a, i) => {
        const a2 = a + 360 / spokes
        const [x1, y1] = pt(a, R)
        const [x2, y2] = pt(a2, R)
        const [mx, my] = pt((a + a2) / 2, R * 1.05)
        return <path key={`f${i}`} d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} opacity={0.42} />
      })}
      {/* rombos en el anillo intermedio */}
      {angles.map((a, i) => {
        const mid = ringRadii[Math.max(0, rings - 2)]
        const [x, y] = pt(a, mid)
        const s = 1.5
        return (
          <path
            key={`d${i}`}
            d={`M ${x} ${y - s} L ${x + s} ${y} L ${x} ${y + s} L ${x - s} ${y} Z`}
            opacity={0.5}
          />
        )
      })}
      {/* nodos en las intersecciones */}
      {ringRadii.map((r, ri) =>
        angles.map((a, si) => {
          const [x, y] = pt(a, r)
          return (
            <circle
              key={`n${ri}-${si}`}
              cx={x}
              cy={y}
              r={0.6}
              fill="currentColor"
              stroke="none"
              opacity={0.55}
            />
          )
        })
      )}
      {/* corazón del sello */}
      <circle cx={c} cy={c} r={2} fill="currentColor" stroke="none" opacity={0.7} />
    </svg>
  )
}
