/** Sentence-case action labels for UI copy; stored event types remain unchanged. */
export function eventLabel(type: string) {
  const label = type.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}
