// The pills' colours (charts/pill): bright, light fills that dark text reads well on. Picked by name, so a pill's colour
// can say what kind of name it is later on. More to come.
export const PILL_COLOURS = {
  yellow: '#ffd05b',
  blue: '#5ba6ff',
  red: '#ff758a',
  green: '#a4fb49',
  orange: '#ffa64d' // not from the original four: picked to sit with them (as bright and as light)
} as const;

export type PillColour = keyof typeof PILL_COLOURS;
