import { Moon, Radar, Snowflake, Sun, Thermometer } from 'lucide-react'
import { Link } from 'react-router'
import { EARTH_SITES } from '../data/compare'
import type { MoonEnvironment as Environment } from '../lib/similarity'
import { InfoTip } from './InfoTip'
import { MoreDetails } from './MoreDetails'

const MOON_DATA = {
  lola: {
    short: 'LOLA (Mazarico et al. 2011)',
    title: 'LOLA average illumination, south pole, 120 m (NASA LRO; Mazarico et al. 2011, Icarus)',
    url: 'https://imbrium.mit.edu/EXTRAS/ILLUMINATION/',
  },
  diviner: {
    short: 'Diviner (Paige et al. 2010)',
    title: 'Diviner Polar Resource Product, south pole (NASA LRO; Paige et al. 2010, Science)',
    url: 'https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_prp/',
  },
  minirf: {
    short: 'Mini-RF',
    title: 'Mini-RF global radar mosaic, CPR, 32 pixels/degree (NASA LRO, PDS)',
    url: 'https://pds-geosciences.wustl.edu/lro/lro-l-mrflro-5-global-mosaic-v1/lromrf_1001/data/32ppd/',
  },
}

const celsius = (kelvin: number) => `${Math.round(kelvin - 273.15)}\u00a0°C`

const { coldestLand } = __HOME_STATS__
/** Our Earth sites with ground ice, coldest first. */
const ICY_SITES = EARTH_SITES.filter((s) => s.materials.includes('ice')).sort(
  (a, b) => a.meanTempC - b.meanTempC,
)
const latLon = (lat: number, lon: number) =>
  `${Math.abs(lat)}°${lat < 0 ? 'S' : 'N'} ${Math.abs(lon)}°${lon < 0 ? 'W' : 'E'}`

/**
 * What NASA's Lunar Reconnaissance Orbiter measured around an Artemis region: sunlight, shadow,
 * temperature and stable ice. Temperature and ice feed the Permanent Moon base purpose; the rest is shown only.
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
    {
      icon: Radar,
      label: 'Radar (Mini-RF)',
      value: `${e.radarCprAbove1Pct}% of the area above 1`,
      detail: `circular polarization ratio, ${e.radarCprMedian} at a typical spot. Above 1 can mean ice, or rough, rocky ground`,
    },
  ]
  return (
    <section className="mt-4 w-full rounded-xl border border-border bg-bg/60 p-4">
      <div className="flex items-center gap-1">
        <h3 className="text-sm font-semibold">
          Measured by NASA&apos;s Lunar Reconnaissance Orbiter
        </h3>
        <InfoTip label="Measured over what area">
          <p>Everything within {e.radiusKm} km of the region centre.</p>
        </InfoTip>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(({ icon: Icon, label, value, detail }) => (
          <div key={label}>
            <dt className="flex items-center gap-2 text-xs text-muted">
              <Icon className="size-4 shrink-0 text-accent" aria-hidden />
              {label}
              <InfoTip label={`${label}: details`}>
                <p>{detail}</p>
              </InfoTip>
            </dt>
            <dd className="pl-6 font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 border-t border-border pt-3 text-sm text-fg-2">
        <MoreDetails
          label="Compare with Earth’s coldest, icy places"
          summary={
            <>
              <span className="font-medium text-fg">
                {Math.round(coldestLand.tempC) - Math.round(e.tempAvgMedianK - 273.15)}&nbsp;°C
                colder
              </span>{' '}
              than the coldest land on Earth: no place on Earth is this cold.
            </>
          }
        >
          <p>
            The coldest land in our NASA POWER grid averages {Math.round(coldestLand.tempC)}&nbsp;°C
            ({latLon(coldestLand.lat, coldestLand.lon)}
            {coldestLand.lat < -60 && ', Antarctica'}). Our Earth sites with ground ice come
            closest:
          </p>
          <ul className="space-y-0.5">
            {ICY_SITES.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/discover?from=${s.id}&climate=cold`}
                  className="text-accent hover:underline"
                >
                  {s.name}
                </Link>{' '}
                <span className="text-muted">
                  · {Math.round(s.meanTempC)}&nbsp;°C · {s.country}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            A sense of scale, not an exact match: Diviner measures the ground&apos;s surface, NASA
            POWER the air 2 m up. The Permanent Moon base purpose compares the ground itself, with
            MODIS on Earth. These ice sites are studied as Mars analogs.
          </p>
          <p>
            <Link
              to="/discover?from=tuktoyaktuk&climate=permafrost"
              className="text-accent hover:underline"
            >
              Find Earth&apos;s permafrost (ESA Permafrost_cci)
            </Link>
          </p>
        </MoreDetails>
      </div>
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        Sources:
        {Object.values(MOON_DATA).map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            title={s.title}
            className="text-accent hover:underline"
          >
            {s.short}
          </a>
        ))}
      </p>
    </section>
  )
}
