import { PROPERTY_TYPE_LABELS } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'
import type { Property } from '@/types'

function Row({
  label,
  values,
  format = 'text',
}: {
  label: string
  values: (string | number | undefined)[]
  format?: 'text' | 'price' | 'number'
}) {
  return (
    <tr className="border-b border-[var(--color-border)]">
      <td className="py-2.5 pr-4 text-xs font-medium text-[var(--color-text-muted)]">{label}</td>
      {values.map((value, i) => (
        <td key={i} className="px-4 py-2.5 text-xs font-mono text-[var(--color-text-secondary)]">
          {value === undefined || value === null
            ? '\u2014'
            : format === 'price'
              ? formatPrice(value as number)
              : format === 'number'
                ? new Intl.NumberFormat('sv-SE').format(value as number)
                : String(value)}
        </td>
      ))}
    </tr>
  )
}

export function ComparisonTable({ properties }: { properties: Property[] }) {
  if (properties.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border-light)]">
            <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Attribute
            </th>
            {properties.map((p) => (
              <th key={p.id} className="px-4 pb-2 text-left">
                <div className="text-xs font-semibold text-[var(--color-text-primary)] truncate max-w-[180px]">
                  {p.address}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">{p.area}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Row
            label="Price"
            values={properties.map((p) => p.price)}
            format="price"
          />
          <Row
            label="Price/m\u00B2"
            values={properties.map((p) => p.pricePerSqm)}
            format="price"
          />
          <Row
            label="Living area"
            values={properties.map((p) => `${p.livingArea} m\u00B2`)}
          />
          <Row
            label="Rooms"
            values={properties.map((p) => p.rooms)}
            format="number"
          />
          <Row
            label="Floor"
            values={properties.map((p) =>
              p.floor ? `${p.floor}${p.totalFloors ? ` of ${p.totalFloors}` : ''}` : undefined,
            )}
          />
          <Row
            label="Built"
            values={properties.map((p) => p.constructionYear)}
            format="number"
          />
          <Row
            label="Monthly fee"
            values={properties.map((p) => p.monthlyFee)}
            format="price"
          />
          <Row
            label="Type"
            values={properties.map((p) => PROPERTY_TYPE_LABELS[p.propertyType])}
          />
          <Row
            label="Days on market"
            values={properties.map((p) => p.daysOnMarket)}
            format="number"
          />
          <Row
            label="Municipality"
            values={properties.map((p) => p.municipality)}
          />
        </tbody>
      </table>
    </div>
  )
}
