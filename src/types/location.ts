import type { Coordinates } from './common'

export type LocationType =
  | 'kommun'
  | 'stadsdel'
  | 'stad'
  | 'lan'
  | 'omrade'
  | 'adress'

export type Location = {
  id: string
  name: string
  type: LocationType
  slug?: string
  coordinates?: Coordinates
  parentName?: string
}
