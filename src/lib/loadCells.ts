import type { Cells } from './discover'

/**
 * The grid built by scripts/build_discover.py (every 0.5° land cell, about 3 MB), with each cell's
 * country from scripts/build_countries.py. Without the countries file the pages show coordinates only.
 */
export async function loadCells(): Promise<Cells> {
  const base = import.meta.env.BASE_URL
  const [grid, countries] = await Promise.all([
    fetch(`${base}discover/cells.json`),
    fetch(`${base}discover/countries.json`).catch(() => null),
  ])
  if (!grid.ok) throw new Error(`Could not load the Discover grid (HTTP ${grid.status}).`)
  const cells = (await grid.json()) as Cells
  if (countries?.ok) {
    const { names, cell } = (await countries.json()) as { names: string[]; cell: number[] }
    cells.country = cell.map((i) => names[i] ?? null)
  }
  return cells
}
