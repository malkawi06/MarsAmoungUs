import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ListOrdered, Map, MousePointerClick, Sparkles, MapPin } from 'lucide-react'
import { DiscoverLegend, DiscoverMap } from '../components/DiscoverMap'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { PageHeader } from '../components/PageHeader'
import { SheetOnPhone } from '../components/SheetOnPhone'
import { site } from '../config/site'
import { ANALOG_SITES } from '../data/analogs'
import { EARTH_SITES } from '../data/compare'
import { useAsync } from '../hooks/useAsync'
import { DESKTOP, useMediaQuery } from '../hooks/useMediaQuery'
import { usePageTitle } from '../hooks/usePageTitle'
import { cellAt, cellLat, cellLon, knownPlaceNear, topRegions, type Cells } from '../lib/discover'
import { loadCells } from '../lib/loadCells'
import { MARS_AXES, marsIndex, placeOf, topShare, type MarsIndex } from '../lib/marsIndex'

/** Patches below this index are left clear, so the map shows only the most Mars-like land. */
const SHOW_FROM = 80

const KNOWN_PLACES = [...EARTH_SITES, ...ANALOG_SITES, ...site.mars.checks].map((s) => ({
  name: s.name,
  lat: s.lat,
  lon: s.lon,
}))

const formatLat = (v: number) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? 'N' : 'S'}`
const formatLon = (v: number) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? 'E' : 'W'}`
const top = (share: number) => `top ${share < 1 ? share.toFixed(2) : share.toFixed(1)}%`

export default function Mars() {
  const page = site.mars
  usePageTitle(page.title)
  const { data: cells, error, reload } = useAsync('discover-cells', loadCells)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        eyebrow="Mars itself"
        title={page.title}
        intro={page.intro}
        photo={site.photos.discover}
        steps={[
          { icon: ListOrdered, text: 'All ice-free land is ranked on four Mars conditions' },
          { icon: Map, text: 'The most Mars-like places light up' },
          { icon: MousePointerClick, text: 'Open one to compare it with Mars' },
        ]}
      />
      {error ? (
        <ErrorState title="The land grid did not load" error={error} onRetry={reload} />
      ) : !cells ? (
        <LoadingState label="Ranking every patch of land on Earth…" className="py-24" />
      ) : (
        <Ranking cells={cells} />
      )}
    </div>
  )
}

function Ranking({ cells }: { cells: Cells }) {
  const page = site.mars
  const index = useMemo(() => marsIndex(cells), [cells])
  const picks = useMemo(() => topRegions(cells, index.score, undefined, 10), [cells, index])
  const knownName = useCallback(
    (i: number) => knownPlaceNear(cells, i, KNOWN_PLACES)?.name,
    [cells],
  )
  const known = useMemo(() => new Set(picks.filter((i) => knownName(i))), [picks, knownName])
  const checks = useMemo(
    () => page.checks.map((c) => ({ ...c, share: topShare(index, cellAt(cells, c.lat, c.lon)) })),
    [page.checks, index, cells],
  )

  const [params, setParams] = useSearchParams()
  const desktop = useMediaQuery(DESKTOP)
  const regionParam = Number(params.get('region'))
  const chosen = picks.includes(regionParam) ? regionParam : undefined
  const selected = chosen ?? (desktop ? picks[0] : undefined)
  const [sheetOpen, setSheetOpen] = useState(
    () => selected !== undefined && !window.matchMedia(DESKTOP).matches,
  )
  const closeSheet = useCallback(() => setSheetOpen(false), [])
  const select = (i: number) => {
    setParams({ region: String(i) }, { replace: true })
    setSheetOpen(true)
  }

  return (
    <>
      <section
        aria-label="Mars’s four conditions"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {MARS_AXES.map((axis) => (
          <div key={axis.id} className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm font-medium">{axis.label}</p>
            <p className="mt-1 text-sm text-fg-2">
              Mars: <span className="text-fg">{axis.mars}</span>
            </p>
          </div>
        ))}
      </section>
      <p className="mt-2 text-xs text-muted">
        Mars values:{' '}
        <a href={page.marsSource.url} target="_blank" rel="noreferrer" className="underline">
          {page.marsSource.title}
        </a>
        .
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="-mx-4 lg:col-span-3 lg:mx-0">
          <DiscoverMap
            cells={cells}
            scores={index.score}
            picks={picks}
            selected={chosen}
            known={known}
            onSelect={select}
            showFrom={SHOW_FROM}
            className="h-[58svh] min-h-80 lg:h-[640px]"
          />
          <DiscoverLegend
            colour="how far each patch goes toward Mars"
            showFrom={SHOW_FROM}
            className="mt-3 px-4 lg:px-0"
          />
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-medium text-muted">
            Most Mars-like regions, at least 400 km apart
          </h2>
          <ol className="space-y-2">
            {picks.map((i, n) => {
              const name = knownName(i)
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => select(i)}
                    aria-current={i === selected}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-accent ${
                      i === selected ? 'border-accent bg-accent/5' : 'border-border bg-surface'
                    }`}
                  >
                    <span className="w-5 shrink-0 text-center text-sm text-muted tabular-nums">
                      {n + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {cells.country?.[i] ?? 'Region'}{' '}
                        <span className="font-normal text-muted tabular-nums">
                          · {formatLat(cellLat(cells, i))} {formatLon(cellLon(cells, i))}
                        </span>
                      </span>
                      <span className="block truncate text-xs">
                        {name ? (
                          <span className="text-muted">Known: {name}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-accent">
                            <Sparkles className="size-3" aria-hidden /> Not on our list of analogs
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="w-12 shrink-0 text-right font-semibold tabular-nums">
                      {Math.round(index.score[i])}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <p className="mt-2 text-xs text-muted">
            Score: how much of Earth&apos;s ice-free land each region beats, on average, across the
            four conditions (0–100).
          </p>
        </div>

        {selected !== undefined && (
          <SheetOnPhone
            open={sheetOpen}
            onClose={closeSheet}
            label="This region against Mars"
            className="lg:static lg:col-span-5"
          >
            <RegionAgainstMars
              cells={cells}
              index={index}
              cell={selected}
              rank={picks.indexOf(selected) + 1}
            />
          </SheetOnPhone>
        )}
      </div>

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="text-lg font-semibold">Does it find real Mars analogs?</h2>
        <p className="mt-1 text-sm text-fg-2">
          The ranking never sees a list of analogs. Where it puts places that space agencies and
          published studies chose to study Mars:
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {checks.map((c) => (
            <li key={c.name} className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-3xl font-semibold tabular-nums text-accent">{top(c.share)}</p>
              <p className="mt-1 text-xs text-muted">of Earth&apos;s ice-free land</p>
              <p className="mt-3 font-medium">{c.name}</p>
              <p className="text-sm text-fg-2">
                {c.who} ·{' '}
                <a href={c.source.url} target="_blank" rel="noreferrer" className="underline">
                  Source
                </a>
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-fg-2">
          A place picked at random would land, on average, in the top 50%.
        </p>
      </section>

      <section className="mt-10 border-t border-border pt-6 text-sm text-fg-2">
        <h2 className="text-lg font-semibold text-fg">Where the comparison stops</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {page.limits.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="mt-3">{page.whyNotMoon}</p>
      </section>
    </>
  )
}

function RegionAgainstMars({
  cells,
  index,
  cell,
  rank,
}: {
  cells: Cells
  index: MarsIndex
  cell: number
  rank: number
}) {
  const show = (v: number | null, unit: string) =>
    v === null ? 'no data' : `${v.toLocaleString('en')} ${unit}`
  return (
    <section className="border-border bg-surface lg:rounded-2xl lg:border">
      <header className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-accent uppercase">
            #{rank} most Mars-like region
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold tabular-nums">
            <MapPin className="size-5 text-accent" aria-hidden />
            {cells.country?.[cell] ?? 'Region'}
            <span className="text-base font-normal text-muted">
              {formatLat(cellLat(cells, cell))} {formatLon(cellLon(cells, cell))}
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            A patch about 50 km across · #{placeOf(index, cell).toLocaleString('en')} of{' '}
            {index.ranked.toLocaleString('en')} patches of ice-free land
          </p>
        </div>
        <p className="shrink-0 text-4xl font-semibold tabular-nums">
          {Math.round(index.score[cell])}
        </p>
      </header>
      <div className="overflow-x-auto border-t border-border px-5 py-4">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1 font-medium">Condition</th>
              <th className="py-1 font-medium">This region</th>
              <th className="py-1 font-medium">Mars</th>
              <th className="py-1 text-right font-medium">More Mars-like than</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MARS_AXES.map((axis) => {
              const p = index.percentiles[axis.id][cell]
              return (
                <tr key={axis.id}>
                  <td className="py-2 font-medium">{axis.label}</td>
                  <td className="py-2">{show(axis.value(cells, cell), axis.unit)}</td>
                  <td className="py-2 text-fg-2">{axis.mars}</td>
                  <td className="py-2 text-right tabular-nums">{Math.round(p * 100)}% of land</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">
          Score = the average of the four shares. Climate: NASA POWER (2001–2020); elevation:
          SRTM-based terrain tiles.
        </p>
      </div>
    </section>
  )
}
