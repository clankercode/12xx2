import type { AxisId, GroupId } from '../engine/types'

export interface AxisMeta {
  id: AxisId
  group: GroupId
  title: string
  /** − pole (score −100). */
  neg: string
  /** + pole (score +100). */
  pos: string
  /** Original MIT 12axes pole names, for the crosswalk. */
  mit: [string, string]
  construct: string
}

export const AXES: Record<AxisId, AxisMeta> = {
  fed: { id: 'fed', group: 'governance', title: 'Power distribution', neg: 'Decentralized', pos: 'Centralized', mit: ['Federal', 'Unitary'], construct: 'Where authority sits: dispersed to regions and communities, or concentrated at the centre.' },
  dem: { id: 'dem', group: 'governance', title: 'Decision-making', neg: 'Democratic', pos: 'Hierarchical', mit: ['Democratic', 'Autocratic'], construct: 'Broad participation and contestable power, or decisions reserved to a few (a monarch, council, party, experts or clergy).' },
  lib: { id: 'lib', group: 'governance', title: 'Liberty vs security', neg: 'Liberty', pos: 'Security', mit: ['Freedom', 'Security'], construct: 'When they conflict: individual freedoms, or collective safety, order and policing.' },
  col: { id: 'col', group: 'economy', title: 'Ownership', neg: 'Collective', pos: 'Private', mit: ['Collectivize', 'Privatize'], construct: 'Who owns productive assets, and how evenly wealth should be spread.' },
  pla: { id: 'pla', group: 'economy', title: 'Coordination', neg: 'Planned', pos: 'Market', mit: ['Planned', 'Markets'], construct: 'Deliberate allocation, or prices and competition — whoever owns.' },
  glo: { id: 'glo', group: 'economy', title: 'Trade', neg: 'Open', pos: 'Protected', mit: ['Globalism', 'Protectionism'], construct: 'Openness of trade, capital and supply chains, or protection of domestic production.' },
  int: { id: 'int', group: 'world', title: 'Sovereignty', neg: 'Internationalist', pos: 'Sovereigntist', mit: ['Internationalism', 'Nationalism'], construct: 'Pooled authority and loyalty beyond the nation, or national primacy.' },
  mil: { id: 'mil', group: 'world', title: 'Use of force', neg: 'Hawkish', pos: 'Dovish', mit: ['Militarist', 'Pacifist'], construct: 'Willingness to build military power and use force abroad.' },
  mul: { id: 'mul', group: 'world', title: 'Newcomers', neg: 'Pluralist', pos: 'Assimilationist', mit: ['Multicultural', 'Assimilationist'], construct: 'Openness to immigration and plural identities, or a shared common culture.' },
  rel: { id: 'rel', group: 'culture', title: 'Religion & state', neg: 'Secular', pos: 'Religious', mit: ['Irreligious', 'Religious'], construct: 'The role of religion in law and public institutions — not personal faith.' },
  pro: { id: 'pro', group: 'culture', title: 'Social norms', neg: 'Progressive', pos: 'Traditional', mit: ['Progressive', 'Traditional'], construct: 'Permissive and egalitarian, or traditional norms on family, sexuality, gender and custom.' },
  tec: { id: 'tec', group: 'culture', title: 'Technology', neg: 'Transhumanist', pos: 'Bioconservative', mit: ['Technology', 'Biology'], construct: 'Embracing or restraining transformative technology: enhancement, gene editing, advanced AI, life extension.' },
}

export const GROUP_TITLES: Record<GroupId, string> = {
  governance: 'Governance',
  economy: 'Economy',
  world: 'World',
  culture: 'Culture',
}
