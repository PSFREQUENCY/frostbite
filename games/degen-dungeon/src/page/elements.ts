// The element with an id, checked to be the tag the page expects, or a clear error naming what is missing.
export function element<Tag extends keyof HTMLElementTagNameMap>(
  id: string,
  tag: Tag,
): HTMLElementTagNameMap[Tag] {
  const found = document.getElementById(id);
  if (found?.tagName.toLowerCase() !== tag) throw new Error(`Missing #${id}`);
  return found as HTMLElementTagNameMap[Tag];
}
