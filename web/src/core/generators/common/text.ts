/**
 * Text helpers shared by the generators: joining lines while skipping the ones that do not apply, and
 * indenting blocks of code.
 */

/** A line, or `false` / `null` / `undefined` for a line that does not apply. */
export type Line = string | false | null | undefined

/** Joins the lines that apply with line breaks. */
export function lines(...items: (Line | Line[])[]): string {
  return items
    .flat()
    .filter((item): item is string => typeof item === 'string')
    .join('\n')
}

/** Indents every non-empty line of a block. */
export function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return text
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : pad + line))
    .join('\n')
}

/** Ends a file with exactly one line break, as editors and linters expect. */
export function fileText(text: string): string {
  return `${text.replace(/\s+$/, '')}\n`
}
