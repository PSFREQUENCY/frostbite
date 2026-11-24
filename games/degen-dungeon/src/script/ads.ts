// The commercial on the island's TVs and on ADOR's big screen (`view/tvs.ts`): the owner's slogan, and the small print under it. Written
// once here.
export const moonSlogan = "Only Masters can make it to the moon";
export const shuttlePrint = "Moon Tower shuttle · 500,000 DUN · leaves nightly";

// The slogan broken into lines of about `width` letters, for a screen.
export function linesOf(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const last = lines[lines.length - 1];
    if (last !== undefined && last.length + word.length + 1 <= width)
      lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}
