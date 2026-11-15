import {
  CarFront,
  Orbit,
  GitCompareArrows,
  House,
  Landmark,
  MountainSnow,
  ThermometerSnowflake,
  Telescope,
  Users,
  DropletOff,
  Earth,
  Footprints,
  Gem,
  ListChecks,
  Microscope,
  Mountain,
  Pickaxe,
  Satellite,
  Snowflake,
  Tent,
  Thermometer,
  ThermometerSun,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import type { FactorId } from './similarity'

/** One icon per page, keyed by route (phone tab bar). */
export const PAGE_ICONS: Record<string, LucideIcon> = {
  '/': House,
  '/discover': Telescope,
  '/mars': Orbit,
  '/compare': GitCompareArrows,
  '/analogs': Earth,
  '/about': Users,
}

/** One icon per purpose, keyed by purpose id. */
export const PURPOSE_ICONS: Record<string, LucideIcon> = {
  rover: CarFront,
  base: Tent,
  moonBase: Landmark,
  isru: Pickaxe,
  life: Microscope,
  training: Footprints,
}

export const FACTOR_ICONS: Record<FactorId, LucideIcon> = {
  slope: TrendingUp,
  rock: Gem,
  landform: Mountain,
  meanTemp: Thermometer,
  aridity: DropletOff,
  ice: Snowflake,
  dailyRange: ThermometerSun,
  frozenGround: ThermometerSnowflake,
  groundIce: MountainSnow,
}
export { ListChecks, Satellite }
