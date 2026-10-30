/** System Confidence items (spec §2.4): Here-and-now only, ideology-neutral, balanced 3:3. */
export interface ScItem {
  id: string
  key: 1 | -1
  text: string
}

export const SC_ITEMS: readonly ScItem[] = [
  { id: 'sc-1', key: 1, text: 'Rules here are applied to powerful people the same way as to everyone else.' },
  { id: 'sc-2', key: -1, text: 'Here, people with the right connections can get around the rules.' },
  { id: 'sc-3', key: 1, text: 'Officials here mostly do their jobs honestly.' },
  { id: 'sc-4', key: -1, text: 'Here, getting things done often takes a bribe.' },
  { id: 'sc-5', key: 1, text: 'When something goes seriously wrong here, it can be fixed through the system’s own channels.' },
  { id: 'sc-6', key: -1, text: 'Here, those in charge are protected from consequences when they abuse their power.' },
]
