import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { site, type Photo } from '../config/site'
import { useAsync } from '../hooks/useAsync'
import { usePageTitle } from '../hooks/usePageTitle'
import { useReveal } from '../hooks/useReveal'
import { EARTH_URL, TARGETS_URL, loadOrbitalImages } from '../lib/orbitalImages'
import { PhotoCredit, PhotoFill } from '../components/Photo'

const stats = __HOME_STATS__
const example = stats.example
const exampleLink = `/compare?target=${example.targetId}&purpose=${example.purposeId}&site=${example.siteId}`
const discovery = stats.discovery
const discoveryLink = `/discover?from=${discovery.fromId}&region=${discovery.cell}`
const check = stats.check

export default function Home() {
  usePageTitle()
  const { home, discover, compare, analogs } = site

  return (
    <div className="bg-black text-white">
      <Hero />

      <Impact />

      <Panel
        photo={site.photos.discover}
        eyebrow="01 · Discover"
        title={discover.title}
        body={discover.intro}
        cta={home.primaryCta}
      >
        <Stats
          items={[
            { value: stats.landCells, label: 'Patches of land compared' },
            { value: stats.discoverTraits, label: 'Traits, measured the same way' },
          ]}
        />
      </Panel>

      <Discovery />

      <Panel
        photo={site.photos.compare}
        eyebrow="02 · Compare"
        title={compare.title}
        body={compare.intro}
        cta={home.secondaryCta}
        side="right"
      >
        <Stats
          items={[
            { value: stats.targets, label: 'Places on the Moon and Mars' },
            { value: stats.earthSites, label: 'Earth sites scored' },
            { value: stats.purposes, label: 'Purposes' },
          ]}
        />
      </Panel>

      <Example />

      <Panel
        photo={site.photos.analogs}
        eyebrow="03 · Earth Analogs"
        title={analogs.title}
        body={analogs.intro}
        cta={{ label: 'Explore Earth Analogs', to: '/analogs' }}
      >
        <Stats
          items={[
            { value: stats.analogSites, label: 'Analog sites, each with sources' },
            { value: stats.landforms.length, label: 'Landforms' },
          ]}
        />
      </Panel>

      <Sources />
    </div>
  )
}

function Hero() {
  const { home, event, pitch, name } = site
  const [first, ...rest] = name.split(' ')
  const photo = site.photos.hero
  return (
    <section className="relative flex h-svh min-h-[40rem] items-end overflow-hidden">
      <PhotoFill photo={photo} priority className="kenburns" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />

      <div className="relative mx-auto w-full max-w-[90rem] px-5 pb-28 sm:px-8 sm:pb-32">
        <p className="fade-in font-display text-sm font-semibold tracking-[0.3em] text-white/80 uppercase">
          {event.name} · {event.dates}
        </p>
        <h1 className="mt-4 bg-none font-display text-white text-[clamp(4rem,13vw,11rem)] leading-[0.85] font-bold tracking-tight uppercase">
          <span className="rise">
            <span>{first}</span>
          </span>
          <span className="rise">
            <span>{rest.join(' ')}</span>
          </span>
        </h1>
        <p className="fade-in mt-6 max-w-xl text-lg text-white/85 sm:text-xl">{pitch}</p>
        <div className="fade-in mt-9 flex flex-wrap gap-4">
          <Link to={home.primaryCta.to} className="btn-line solid">
            {home.primaryCta.label}
          </Link>
          <Link to={home.secondaryCta.to} className="btn-line">
            {home.secondaryCta.label}
          </Link>
        </div>
      </div>

      <PhotoCredit photo={photo} />
      <ChevronDown
        className="absolute bottom-6 left-1/2 hidden size-7 -translate-x-1/2 animate-bounce lg:block text-white/70 motion-reduce:animate-none"
        aria-hidden
      />
    </section>
  )
}

type Cta = { label: string; to: string } | { label: string; href: string }

/** One full-screen section: a photo, a dark fade toward the text, and the text on one side. */
function Panel({
  photo,
  eyebrow,
  title,
  body,
  cta,
  side = 'left',
  children,
}: {
  photo: Photo
  eyebrow: string
  title: string
  body: string
  cta: Cta
  side?: 'left' | 'right'
  children?: ReactNode
}) {
  const ref = useReveal<HTMLElement>()
  const right = side === 'right'
  return (
    // Phones: the photo on top, clear, and the text below it. Desktop: text over a full-screen photo.
    <section ref={ref} className="relative overflow-hidden lg:flex lg:min-h-svh lg:items-center">
      <div className="relative h-[48svh] overflow-hidden lg:absolute lg:inset-0 lg:h-auto">
        <PhotoFill photo={photo} className="settle" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent lg:hidden" />
        <div
          className={`absolute inset-0 hidden lg:block ${
            right
              ? 'bg-gradient-to-l from-black/90 via-black/50 to-transparent'
              : 'bg-gradient-to-r from-black/90 via-black/50 to-transparent'
          }`}
        />
        <div className="absolute inset-x-0 bottom-0 hidden h-40 bg-gradient-to-t from-black to-transparent lg:block" />
        {/* Phones: under the top bar, clear of the heading that overlaps the photo's foot. */}
        <PhotoCredit photo={photo} className="top-[4.5rem] lg:top-auto lg:bottom-3" />
      </div>

      <div
        className={`relative mx-auto -mt-20 flex w-full max-w-[90rem] px-5 pb-20 sm:px-8 lg:mt-0 lg:py-24 ${right ? 'lg:justify-end' : ''}`}
      >
        <div className="reveal flex min-w-0 max-w-xl flex-col gap-6">
          <p className="font-display text-sm font-semibold tracking-[0.3em] text-white/70 uppercase">
            {eyebrow}
          </p>
          <h2 className="font-display text-[2.75rem] leading-[0.95] font-bold uppercase sm:text-6xl">
            {title}
          </h2>
          <p className="text-base text-white/85 sm:text-lg">{body}</p>
          {children}
          <div>
            {'to' in cta ? (
              <Link to={cta.to} className="btn-line">
                {cta.label}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            ) : (
              <a href={cta.href} target="_blank" rel="noreferrer" className="btn-line">
                {cta.label}
                <ArrowRight className="size-4" aria-hidden />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Stats({ items }: { items: { value: number; label: string }[] }) {
  return (
    <dl className="grid grid-cols-3 gap-4 sm:flex sm:flex-wrap sm:gap-x-10 sm:gap-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="sr-only">{item.label}</dt>
          <dd className="font-display text-5xl leading-none font-bold tabular-nums sm:text-6xl">
            {item.value.toLocaleString('en')}
          </dd>
          <dd className="mt-2 max-w-[11rem] font-display text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">
            {item.label}
          </dd>
        </div>
      ))}
    </dl>
  )
}

const coord = (v: number, pos: string, neg: string) =>
  `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`
const show = (v: number | string | null, unit: string) =>
  v === null ? '—' : typeof v === 'number' ? `${v.toLocaleString('en')} ${unit}`.trim() : v

/** One region Discover found that is not on any of our analog lists, worked out at build time. */
function Impact() {
  const ref = useReveal<HTMLElement>()
  const { impact } = site.home
  return (
    <section ref={ref} className="border-b border-white/10 bg-black">
      <div className="mx-auto max-w-[90rem] px-5 py-16 sm:px-8 sm:py-24">
        <div className="reveal max-w-3xl">
          <p className="font-display text-sm font-semibold tracking-[0.3em] text-white/70 uppercase">
            {impact.eyebrow}
          </p>
          <h2 className="mt-4 font-display text-3xl leading-tight font-bold uppercase sm:text-5xl">
            {impact.title}
          </h2>
          <p className="mt-6 text-lg text-white/80">{impact.intro}</p>
        </div>
        <ol className="reveal mt-10 grid gap-6 md:grid-cols-3">
          {impact.steps.map((step, i) => (
            <li key={step} className="flex gap-4">
              <span className="font-display text-5xl leading-none font-bold text-accent tabular-nums">
                {i + 1}
              </span>
              <p className="text-white/85">{step}</p>
            </li>
          ))}
        </ol>
        <h3 className="reveal mt-14 font-display text-sm font-semibold tracking-[0.3em] text-white/70 uppercase">
          {impact.audiencesTitle}
        </h3>
        <ul className="reveal mt-4 grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-3">
          {impact.audiences.map((a) => (
            <li key={a.who} className="bg-black p-6">
              <h3 className="font-display text-sm font-semibold tracking-[0.2em] text-accent uppercase">
                {a.who}
              </h3>
              <p className="mt-3 text-white/80">{a.what}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Discovery() {
  const ref = useReveal<HTMLElement>()
  return (
    <section ref={ref} className="border-y border-white/10 bg-black">
      <div className="mx-auto grid max-w-[90rem] gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:items-center lg:py-32">
        <div className="reveal flex flex-col gap-6">
          <p className="font-display text-sm font-semibold tracking-[0.3em] text-white/70 uppercase">
            New twins · found by Discover
          </p>
          <h2 className="font-display text-3xl leading-tight font-bold uppercase sm:text-5xl">
            Start from {discovery.fromName}
            <span className="block text-white/50">Discover finds {discovery.place}</span>
          </h2>
          <p className="font-display text-[clamp(6rem,16vw,12rem)] leading-none font-bold tabular-nums">
            {discovery.percent}%
          </p>
          <p className="text-sm text-white/60 tabular-nums">
            {coord(discovery.lat, 'N', 'S')} {coord(discovery.lon, 'E', 'W')} · stable in{' '}
            {site.home.discovery.holds}/40 runs
          </p>
          <p className="border-l-2 border-accent pl-3 text-white/80">
            <span className="font-semibold text-accent">Confirmed. </span>
            {site.home.discovery.check.text}{' '}
            <a
              href={site.home.discovery.check.source.url}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Source
            </a>
          </p>
          <div>
            <Link to={discoveryLink} className="btn-line">
              See it on the map
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
        <div className="reveal flex flex-col gap-4">
          <table className="w-full text-left text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/20">
                <th className="py-2 font-medium">Trait</th>
                <th className="py-2 font-medium">{discovery.fromName}</th>
                <th className="py-2 font-medium">New region</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {discovery.traits.map((t) => (
                <tr key={t.label}>
                  <td className="py-2.5 pr-3">{t.label}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{show(t.from, t.unit)}</td>
                  <td className="py-2.5 tabular-nums">{show(t.here, t.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-white/60">
            Known analogs rank in the top {check.medianTopPct.toFixed(1)}% of Earth&apos;s land;
            random places, {check.randomMedianTopPct.toFixed(1)}%.
          </p>
        </div>
      </div>
      <MoreDiscoveries />
    </section>
  )
}

/** The other new regions, one card each: where it starts, where it lands, and its weakest trait. */
function MoreDiscoveries() {
  return (
    <div className="reveal mx-auto max-w-[90rem] px-5 pb-16 sm:px-8 sm:pb-24 lg:pb-32">
      <h3 className="font-display text-2xl font-bold uppercase sm:text-3xl">
        {stats.moreDiscoveries.length} more new twins
      </h3>
      <p className="mt-2 max-w-3xl text-white/70">
        Confirmed: published work finds the same process there. Lead: not studied yet.
      </p>
      <ul className="mt-8 grid border-t border-l border-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {stats.moreDiscoveries.map((d, n) => {
          const check = site.home.moreDiscoveries[n].check
          return (
            <li
              key={d.fromId}
              className="flex flex-col gap-3 border-r border-b border-white/10 p-6"
            >
              <p className="text-sm text-white/60">From {d.fromName}</p>
              <p className="font-display text-xl leading-tight font-bold uppercase">{d.place}</p>
              <p className="font-display text-5xl leading-none font-bold tabular-nums">
                {d.percent}%
              </p>
              <p className="text-sm text-white/60 tabular-nums">
                {coord(d.lat, 'N', 'S')} {coord(d.lon, 'E', 'W')} · stable in{' '}
                {site.home.moreDiscoveries[n].holds}/40 runs
              </p>
              {check ? (
                <p className="border-l-2 border-accent pl-3 text-sm text-white/80">
                  <span className="font-semibold text-accent">Confirmed. </span>
                  {check.text}{' '}
                  <a href={check.source.url} target="_blank" rel="noreferrer" className="underline">
                    Source
                  </a>
                </p>
              ) : (
                <p className="border-l-2 border-white/30 pl-3 text-sm text-white/70">
                  <span className="font-semibold text-white">Lead. </span>
                  No study yet: a place to check next.
                </p>
              )}
              <Link
                to={`/discover?from=${d.fromId}&region=${d.cell}`}
                className="btn-line mt-auto self-start"
              >
                See it on the map
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** One real comparison, computed from the data at build time, with both orbital images when available. */
function Example() {
  const ref = useReveal<HTMLElement>()
  const { data: images } = useAsync('orbital-images', loadOrbitalImages)
  const targetImage = images?.targets[example.targetId]
  const siteImage = images?.earth[example.siteId]

  return (
    <section ref={ref} className="border-y border-white/10 bg-black">
      <div
        className={`mx-auto grid gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:items-center lg:py-32 ${
          targetImage && siteImage ? 'max-w-[90rem] lg:grid-cols-2' : 'max-w-4xl'
        }`}
      >
        <div className="reveal flex flex-col gap-6">
          <p className="font-display text-sm font-semibold tracking-[0.3em] text-white/70 uppercase">
            A worked example · {example.purposeLabel}
          </p>
          <h2 className="font-display text-3xl leading-tight font-bold uppercase sm:text-5xl">
            A base at {example.targetName}
            <span className="block text-white/50">Where should the crew train?</span>
          </h2>
          <ol className="divide-y divide-white/15 border-y border-white/15">
            {example.shortlist.map((s) => (
              <li key={s.name} className="flex items-baseline gap-4 py-3">
                <span className="font-display text-2xl font-bold tabular-nums text-white/50">
                  {s.place}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{s.name}</span>
                  <span className="block text-sm text-white/60">{s.country}</span>
                </span>
                <span className="font-display text-2xl font-bold tabular-nums">
                  {s.percent === null ? '—' : `${s.percent}%`}
                </span>
              </li>
            ))}
          </ol>
          <p className="font-display text-sm font-semibold tracking-[0.2em] text-white/70 uppercase">
            Why {example.siteName} comes first
          </p>
          <ul className="divide-y divide-white/15 border-y border-white/15">
            {example.factors.map((factor) => (
              <li key={factor.label} className="flex items-center justify-between gap-6 py-3">
                <span className="min-w-0">
                  <span className="font-medium">{factor.label}</span>
                  <span className="block text-sm text-white/60">{factor.reason}</span>
                </span>
                <span
                  className="flex shrink-0 gap-1"
                  role="img"
                  aria-label={`${factor.score} of 3`}
                >
                  {[1, 2, 3].map((n) => (
                    <span
                      key={n}
                      className={`h-1.5 w-6 ${n <= factor.score ? 'bg-white' : 'bg-white/20'}`}
                    />
                  ))}
                </span>
              </li>
            ))}
          </ul>
          {example.notScored.length > 0 && (
            <p className="text-sm text-white/60">
              Not scored, no data yet: {example.notScored.join(', ').toLowerCase()}.
            </p>
          )}
          {example.notComparable.length > 0 && (
            <p className="text-sm text-white/60">
              No match anywhere on Earth: {example.notComparable.join(', ').toLowerCase()}.
            </p>
          )}
          <div>
            <Link to={exampleLink} className="btn-line">
              Open the full shortlist
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        {targetImage && siteImage && (
          <figure className="reveal grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { src: TARGETS_URL + targetImage.file, label: 'Moon', name: example.targetName },
                { src: EARTH_URL + siteImage.file, label: 'Earth', name: example.siteName },
              ].map((image) => (
                <div key={image.label} className="relative overflow-hidden">
                  <img
                    src={image.src}
                    alt={`${image.name} from orbit`}
                    className="settle aspect-[3/4] w-full object-cover"
                  />
                  <span className="absolute top-3 left-3 font-display text-xs font-semibold tracking-[0.2em] uppercase">
                    {image.label}
                  </span>
                </div>
              ))}
            </div>
            <figcaption className="text-sm text-white/60">
              Both orbital images about 6 km across.
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  )
}

function Sources() {
  const ref = useReveal<HTMLElement>()
  return (
    <section ref={ref} className="bg-black">
      <div className="mx-auto max-w-[90rem] px-5 py-24 sm:px-8">
        <div className="reveal flex flex-col gap-4">
          <p className="font-display text-sm font-semibold tracking-[0.3em] text-white/70 uppercase">
            Data
          </p>
          <h2 className="font-display text-4xl font-bold uppercase sm:text-5xl">
            {site.home.methodTitle}
          </h2>
          <p className="max-w-2xl text-white/70">
            Every number links to its source. Missing values are left out, never guessed.
          </p>
        </div>
        <ul className="mt-10 flex flex-wrap gap-2">
          {[...site.about.nasaData, ...site.about.partnerData].map((source) => (
            <li key={source.name}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                title={source.howWeUseIt}
                className="block border border-white/30 px-3 py-1.5 text-sm text-white/85 transition-colors hover:border-white hover:bg-white hover:text-black"
              >
                {source.name}
              </a>
            </li>
          ))}
        </ul>
        <Link to="/about#sources" className="btn-line mt-10">
          What each source is used for
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
