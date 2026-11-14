import { Moon, Snowflake, Sun, Thermometer } from 'lucide-react'
import type { MoonEnvironment as Environment } from '../lib/similarity'
import { SourceLink } from './FactorEvidence'

const MOON_DATA = {
  lola: {
    title: 'LOLA average illumination, south pole, 120 m (NASA LRO; Mazarico et al. 2011, Icarus)',
    url: 'https://imbrium.mit.edu/EXTRAS/ILLUMINATION/',
  },
  diviner: {
    title: 'Diviner Polar Resource Product, south pole (NASA LRO; Paige et al. 2010, Science)',
    url: 'https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/',
  },
}

const celsius = (kelvin: number) => `${Math.round(kelvin - 273.15)}\u00a0°C`

/**
 * What NASA's Lunar Reconnaissance Orbiter measured around an Artemis region: sunlight, shadow,
 * temperature and stable ice. Shown for the region, not scored against Earth sites.
 */
export function MoonEnvironment({ environment: e }: { environment: Environment }) {
  const items = [
    {
      icon: Sun,
      label: 'Sunlight',
      value: `${e.sunlitBestPct}% of the time`,
      detail: `at the best-lit spot; ${e.sunlitMedianPct}% at a typical spot`,
    },
    {
      icon: Moon,
      label: 'Permanent shadow',
      value: `${e.permanentShadowPct}% of the area`,
      detail: 'never sees the Sun',
    },
    {
      icon: Thermometer,
      label: 'Surface temperature',
      value: `${celsius(e.tempAvgMedianK)} on average`,
      detail: `coldest spot ${celsius(e.tempAvgMinK)} on average; hottest moment ${celsius(e.tempMaxK)}`,
    },
    {
      icon: Snowflake,
      label: 'Ice could stay stable',
      value: `${e.iceWithin1mPct}% of the area`,
      detail: 'within 1 m of the surface',
    },
  ]
  return (
    <section className="mt-4 w-full rounded-xl border border-border bg-bg/60 p-4">
      <h3 className="text-sm font-semibold">
        Measured by NASA&apos;s Lunar Reconnaissance Orbiter
      </h3>
      <p className="mt-0.5 text-xs text-muted">
        Everything within {e.radiusKm} km of the region centre.
      </p>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(({ icon: Icon, label, value, detail }) => (
          <div key={label} className="flex gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <div>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-medium">{value}</dd>
              <dd className="text-xs text-fg-2">{detail}</dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted">
        Shown, not scored: Earth sites have air temperatures and no comparable sunlight value, so
        there is nothing to compare these with on Earth.
      </p>
      <ul className="mt-2 space-y-0.5 text-xs">
        {Object.values(MOON_DATA).map((s) => (
          <li key={s.url}>
            <SourceLink title={s.title} url={s.url} />
          </li>
        ))}
      </ul>
    </section>
  )
}
