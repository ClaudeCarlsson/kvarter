import { Badge } from '@/components/ui/badge'
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
    <tr className="border-b border-gray-100">
      <td className="py-3 pr-4 text-sm font-medium text-gray-500">{label}</td>
      {values.map((value, i) => (
        <td key={i} className="px-4 py-3 text-sm text-gray-900">
          {value === undefined || value === null
            ? '—'
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
          <tr className="border-b-2 border-gray-200">
            <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
              Attribute
            </th>
            {properties.map((p) => (
              <th key={p.id} className="px-4 pb-3 text-left">
                <div className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
                  {p.address}
                </div>
                <div className="text-xs text-gray-500">{p.area}</div>
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
            label="Price/m²"
            values={properties.map((p) => p.pricePerSqm)}
            format="price"
          />
          <Row
            label="Living area"
            values={properties.map((p) => `${p.livingArea} m²`)}
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
