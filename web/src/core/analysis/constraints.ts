/**
 * Validations declared on a field, read from what the input already says: annotations and decorators
 * (Jakarta Bean Validation, class-validator, DataAnnotations, Pydantic, Django, JPA, SQLAlchemy, Prisma,
 * Zod checks, Go `validate` tags) and JSON Schema keywords. Nothing is inferred from names or examples.
 *
 * Each notation is a reader (Strategy pattern) in `READERS`. To support a new one, write a reader that
 * turns one annotation into raw bounds and add it to the list; the normalization does the rest.
 */
import type { Annotation, FieldDef, TypeRef } from '../model/schema.ts'

/** String formats a generator can check with the framework's own validation. */
export type StringFormat = 'email' | 'uri' | 'uuid' | 'date' | 'date-time' | 'time'

/** Language-neutral validations of one field, with JSON Schema names and meanings. */
export interface Constraints {
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  pattern?: string
  format?: StringFormat
  minItems?: number
  maxItems?: number
}

/** The validations of a field and the declarations they come from, to explain them. */
export interface DeclaredConstraints {
  constraints: Constraints
  /** Each declaration as written (`@Size(min = 3, max = 80)`, `maxLength: 40`). */
  sources: string[]
}

/** What one declaration says before the field's type is known. `sizeMin` / `sizeMax` bound a length or a
 * number of items; `boundMin` / `boundMax` bound whatever the type has (value of a number, length of a
 * text, items of a list), as in Go tags and Zod. */
interface RawBounds {
  sizeMin?: number
  sizeMax?: number
  boundMin?: number
  boundMax?: number
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  pattern?: string
  format?: StringFormat
}

type Reader = (annotation: Annotation, name: string) => RawBounds | null

/** `Size`, `javax.validation.constraints.Size`, `field:Size`, `MaxLengthAttribute` → `size`, `maxlength`. */
function simpleName(name: string): string {
  return name
    .replace(/^[a-z]+:/, '')
    .split(/\.|::|\\/)
    .pop()!
    .replace(/Attribute$/, '')
    .toLowerCase()
}

/** Argument texts of an annotation, split on top-level commas. */
function splitArgs(args: string | undefined): string[] {
  if (!args?.trim()) return []
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let current = ''
  for (let index = 0; index < args.length; index++) {
    const char = args[index]
    if (quote) {
      if (char === '\\') {
        current += char + (args[index + 1] ?? '')
        index++
        continue
      }
      if (char === quote) quote = null
    } else if (char === '"' || char === "'" || char === '`') quote = char
    else if ('([{'.includes(char)) depth++
    else if (')]}'.includes(char)) depth--
    else if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

/** Named arguments (`min = 3`, `max_length=80`, `MinimumLength = 2`) by lower-case name, and positional ones. */
function readArgs(annotation: Annotation): { named: Map<string, string>; positional: string[] } {
  const named = new Map<string, string>()
  const positional: string[] = []
  const parts = splitArgs(annotation.args)
  // An options object (`@Column({ length: 80 })`, TypeORM and class-validator) holds the named arguments
  const only = parts.length === 1 ? /^\{([\s\S]*)\}$/.exec(parts[0]) : null
  for (const part of only ? splitArgs(only[1]) : parts) {
    const match = /^([A-Za-z_]\w*)\s*[=:]\s*([\s\S]+)$/.exec(part)
    if (match && !/^["'`/]/.test(part)) named.set(match[1].toLowerCase(), match[2].trim())
    else positional.push(part)
  }
  return { named, positional }
}

/** A number written in code: `3`, `-1.5`, `"9999.99"`, `100L`, `1_000`. */
function toNumber(text: string | undefined): number | undefined {
  if (text === undefined) return undefined
  const cleaned = text
    .trim()
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/_/g, '')
    .replace(/[lLfFdDmM]$/, '')
  if (!/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(cleaned)) return undefined
  return Number(cleaned)
}

/** The text of a string literal (`"^[A-Z]+$"`, `r"\d+"`, `@"\d+"`), unescaped as the language would. */
function toText(text: string | undefined): string | undefined {
  if (text === undefined) return undefined
  const match = /^(?:[rR]|@)?(["'`])([\s\S]*)\1$/.exec(text.trim())
  if (!match) return undefined
  const raw = /^[rR@]/.test(text.trim()) ? match[2] : match[2].replace(/\\\\/g, '\\')
  return raw
}

/** The source of a regular expression literal (`/^[a-z]+$/i` → `^[a-z]+$`), or a string literal. */
function toPattern(text: string | undefined): string | undefined {
  if (text === undefined) return undefined
  const literal = /^\/((?:\\.|[^/])+)\/[a-z]*$/.exec(text.trim())
  return literal ? literal[1] : toText(text)
}

const FORMAT_NAMES: Record<string, StringFormat> = {
  email: 'email',
  isemail: 'email',
  emailaddress: 'email',
  emailfield: 'email',
  url: 'uri',
  isurl: 'uri',
  urlfield: 'uri',
  isuuid: 'uuid',
  uuidfield: 'uuid',
  isdatestring: 'date-time',
  isiso8601: 'date-time',
}

/** Jakarta Bean Validation and Hibernate Validator (Java, Kotlin), class-validator (TypeScript) and
 * DataAnnotations (C#). Their names barely overlap, and where they do they mean the same. */
const annotationReader: Reader = (annotation, name) => {
  const { named, positional } = readArgs(annotation)
  const first = positional[0] ?? named.get('value')
  if (FORMAT_NAMES[name] && !name.endsWith('field')) return { format: FORMAT_NAMES[name] }
  switch (name) {
    case 'size':
    case 'length':
    case 'arraysize':
      return { sizeMin: toNumber(named.get('min') ?? positional[0]), sizeMax: toNumber(named.get('max') ?? positional[1]) }
    case 'minlength':
    case 'arrayminsize':
      return { sizeMin: toNumber(first) }
    case 'maxlength':
    case 'arraymaxsize':
      return { sizeMax: toNumber(first) }
    case 'stringlength':
      // C#: [StringLength(100, MinimumLength = 2)]
      return { sizeMax: toNumber(first), sizeMin: toNumber(named.get('minimumlength')) }
    case 'notblank':
    case 'notempty':
    case 'isnotempty':
      return { sizeMin: 1 }
    case 'min':
      return { minimum: toNumber(first) }
    case 'max':
      return { maximum: toNumber(first) }
    case 'decimalmin': {
      const value = toNumber(first)
      return named.get('inclusive') === 'false' ? { exclusiveMinimum: value } : { minimum: value }
    }
    case 'decimalmax': {
      const value = toNumber(first)
      return named.get('inclusive') === 'false' ? { exclusiveMaximum: value } : { maximum: value }
    }
    case 'range': {
      // C#: [Range(1, 10)] or [Range(typeof(decimal), "0.01", "100")]
      const values = positional[0]?.startsWith('typeof') ? positional.slice(1) : positional
      return { minimum: toNumber(values[0]), maximum: toNumber(values[1]) }
    }
    case 'positive':
    case 'ispositive':
      return { exclusiveMinimum: 0 }
    case 'positiveorzero':
      return { minimum: 0 }
    case 'negative':
    case 'isnegative':
      return { exclusiveMaximum: 0 }
    case 'negativeorzero':
      return { maximum: 0 }
    case 'pattern':
      return { pattern: toText(named.get('regexp') ?? first) }
    case 'matches':
    case 'regularexpression':
      return { pattern: toPattern(first) }
    default:
      return null
  }
}

/** Pydantic `Field(...)`, Django fields (`CharField(max_length=80)`, `EmailField()`), SQLAlchemy
 * `mapped_column(String(80))` and JPA `@Column(length = 80)`. */
const pythonAndOrmReader: Reader = (annotation, name) => {
  const { named, positional } = readArgs(annotation)
  switch (name) {
    case 'field':
      return {
        sizeMin: toNumber(named.get('min_length') ?? named.get('min_items')),
        sizeMax: toNumber(named.get('max_length') ?? named.get('max_items')),
        minimum: toNumber(named.get('ge')),
        maximum: toNumber(named.get('le')),
        exclusiveMinimum: toNumber(named.get('gt')),
        exclusiveMaximum: toNumber(named.get('lt')),
        pattern: toText(named.get('pattern') ?? named.get('regex')),
      }
    case 'column':
      return { sizeMax: toNumber(named.get('length')) }
    case 'mapped_column':
    case 'column_property': {
      const length = positional.map((arg) => /^String\((\d+)\)$/.exec(arg)?.[1]).find(Boolean)
      return { sizeMax: toNumber(length) }
    }
    default:
      if (name.endsWith('field')) {
        return { sizeMax: toNumber(named.get('max_length')), format: FORMAT_NAMES[name] }
      }
      return null
  }
}

/** Prisma native types with a size: `@db.VarChar(80)`, `@db.Char(3)`. */
const prismaReader: Reader = (annotation) => {
  const match = /^db\.(?:VarChar|Char|NVarChar|NChar)$/i.exec(annotation.name)
  return match ? { sizeMax: toNumber(annotation.args) } : null
}

/** Zod checks, kept by the importer as `z.<method>` annotations. */
const zodReader: Reader = (annotation) => {
  if (!annotation.name.startsWith('z.')) return null
  const method = annotation.name.slice(2)
  const value = toNumber(splitArgs(annotation.args)[0])
  switch (method) {
    case 'min':
    case 'gte':
      return method === 'min' ? { boundMin: value } : { minimum: value }
    case 'max':
    case 'lte':
      return method === 'max' ? { boundMax: value } : { maximum: value }
    case 'length':
      return { boundMin: value, boundMax: value }
    case 'gt':
      return { exclusiveMinimum: value }
    case 'lt':
      return { exclusiveMaximum: value }
    case 'positive':
      return { exclusiveMinimum: 0 }
    case 'nonnegative':
      return { minimum: 0 }
    case 'negative':
      return { exclusiveMaximum: 0 }
    case 'nonpositive':
      return { maximum: 0 }
    case 'nonempty':
      return { sizeMin: 1 }
    case 'email':
      return { format: 'email' }
    case 'url':
      return { format: 'uri' }
    case 'uuid':
      return { format: 'uuid' }
    case 'datetime':
      return { format: 'date-time' }
    case 'regex':
      return { pattern: toPattern(annotation.args) }
    default:
      return null
  }
}

/** Go struct tags: `validate:"required,min=2,max=50,email"`. */
const goTagReader: Reader = (annotation) => {
  if (annotation.name !== 'tag') return null
  const rules = /validate:"([^"]*)"/.exec(annotation.args ?? '')?.[1]
  if (!rules) return null
  const bounds: RawBounds = {}
  for (const rule of rules.split(',')) {
    const [key, value] = rule.split('=')
    const number = toNumber(value)
    if (key === 'min') bounds.boundMin = number
    else if (key === 'max') bounds.boundMax = number
    else if (key === 'len') bounds.boundMin = bounds.boundMax = number
    else if (key === 'gte') bounds.minimum = number
    else if (key === 'lte') bounds.maximum = number
    else if (key === 'gt') bounds.exclusiveMinimum = number
    else if (key === 'lt') bounds.exclusiveMaximum = number
    else if (key === 'email') bounds.format = 'email'
    else if (key === 'url' || key === 'uri') bounds.format = 'uri'
    else if (key === 'uuid' || key === 'uuid4') bounds.format = 'uuid'
  }
  return bounds
}

/** Every notation, tried in order on each annotation; the first that recognizes it reads it. */
const READERS: readonly Reader[] = [zodReader, goTagReader, prismaReader, pythonAndOrmReader, annotationReader]

const METADATA_FORMATS: Record<string, StringFormat> = {
  email: 'email',
  uri: 'uri',
  url: 'uri',
  uuid: 'uuid',
  date: 'date',
  'date-time': 'date-time',
  time: 'time',
}

/** JSON Schema keywords, kept by the JSON Schema and OpenAPI importers in the field's metadata. */
function metadataBounds(metadata: FieldDef['metadata']): RawBounds | null {
  if (!metadata) return null
  const number = (key: string) => (typeof metadata[key] === 'number' ? (metadata[key] as number) : undefined)
  const bounds: RawBounds = {
    minimum: number('minimum'),
    maximum: number('maximum'),
    exclusiveMinimum: number('exclusiveMinimum'),
    exclusiveMaximum: number('exclusiveMaximum'),
    sizeMin: number('minLength') ?? number('minItems'),
    sizeMax: number('maxLength') ?? number('maxItems'),
    pattern: typeof metadata.pattern === 'string' ? metadata.pattern : undefined,
    format: typeof metadata.format === 'string' ? METADATA_FORMATS[metadata.format] : undefined,
  }
  return Object.values(bounds).some((value) => value !== undefined) ? bounds : null
}

/** Formats that the type itself names in Python (`EmailStr`, `HttpUrl`). */
function typeFormat(field: FieldDef): StringFormat | undefined {
  const written = field.originalType ?? ''
  if (/\bEmailStr\b/.test(written)) return 'email'
  if (/\b(?:Http|Any)Url\b/.test(written)) return 'uri'
  return undefined
}

type Shape = 'text' | 'number' | 'list' | 'other'

function shapeOf(type: TypeRef): Shape {
  if (type.kind === 'array') return 'list'
  if (type.kind !== 'primitive') return 'other'
  if (type.name === 'string') return 'text'
  if (type.name === 'integer' || type.name === 'float' || type.name === 'decimal') return 'number'
  return 'other'
}

/** Keeps the stricter of two bounds: every declaration applies at once in the original code. */
function stricter(current: number | undefined, next: number | undefined, keep: 'max' | 'min'): number | undefined {
  if (next === undefined) return current
  if (current === undefined) return next
  return keep === 'max' ? Math.max(current, next) : Math.min(current, next)
}

/** Adds what one declaration says to the constraints, given the shape of the field. */
function apply(constraints: Constraints, bounds: RawBounds, shape: Shape) {
  const sizeMin = bounds.sizeMin ?? (shape !== 'number' ? bounds.boundMin : undefined)
  const sizeMax = bounds.sizeMax ?? (shape !== 'number' ? bounds.boundMax : undefined)
  if (shape === 'list') {
    constraints.minItems = stricter(constraints.minItems, sizeMin, 'max')
    constraints.maxItems = stricter(constraints.maxItems, sizeMax, 'min')
  } else if (shape === 'text') {
    constraints.minLength = stricter(constraints.minLength, sizeMin, 'max')
    constraints.maxLength = stricter(constraints.maxLength, sizeMax, 'min')
  }
  if (shape === 'number') {
    constraints.minimum = stricter(constraints.minimum, bounds.minimum ?? bounds.boundMin, 'max')
    constraints.maximum = stricter(constraints.maximum, bounds.maximum ?? bounds.boundMax, 'min')
    constraints.exclusiveMinimum = stricter(constraints.exclusiveMinimum, bounds.exclusiveMinimum, 'max')
    constraints.exclusiveMaximum = stricter(constraints.exclusiveMaximum, bounds.exclusiveMaximum, 'min')
  }
  if (shape === 'text') {
    if (bounds.pattern !== undefined) constraints.pattern ??= bounds.pattern
    if (bounds.format !== undefined) constraints.format ??= bounds.format
  }
}

/** Removes the keys without a value, so equal constraints compare equal. */
function compact(constraints: Constraints): Constraints {
  return Object.fromEntries(Object.entries(constraints).filter(([, value]) => value !== undefined)) as Constraints
}

/** How a declaration is shown when explaining where a validation comes from. */
function describeAnnotation(annotation: Annotation): string {
  if (annotation.name === 'tag') return annotation.args ?? ''
  if (annotation.name.startsWith('z.')) return `.${annotation.name.slice(2)}(${annotation.args ?? ''})`
  return `${annotation.name}(${annotation.args ?? ''})`
}

/**
 * Reads the validations a field declares.
 *
 * Only declarations that apply to the field's type are kept: a length on a number or a range on a text
 * is ignored, because the generated code could not enforce it.
 *
 * @param field The field as the importer read it.
 * @returns The validations and the declarations they come from; empty when it declares none.
 */
export function readConstraints(field: FieldDef): DeclaredConstraints {
  const shape = shapeOf(field.type)
  const constraints: Constraints = {}
  const sources: string[] = []
  for (const annotation of field.annotations ?? []) {
    const name = simpleName(annotation.name)
    for (const reader of READERS) {
      const bounds = reader(annotation, name)
      if (!bounds) continue
      const before = JSON.stringify(compact(constraints))
      apply(constraints, bounds, shape)
      if (JSON.stringify(compact(constraints)) !== before) sources.push(describeAnnotation(annotation))
      break
    }
  }
  const fromMetadata = metadataBounds(field.metadata)
  if (fromMetadata) {
    const before = JSON.stringify(compact(constraints))
    apply(constraints, fromMetadata, shape)
    if (JSON.stringify(compact(constraints)) !== before) {
      const keys = [
        'minLength',
        'maxLength',
        'minimum',
        'maximum',
        'exclusiveMinimum',
        'exclusiveMaximum',
        'pattern',
        'format',
        'minItems',
        'maxItems',
      ]
      for (const key of keys) if (field.metadata?.[key] !== undefined) sources.push(`${key}: ${String(field.metadata[key])}`)
    }
  }
  const format = shape === 'text' ? typeFormat(field) : undefined
  if (format && !constraints.format) {
    constraints.format = format
    sources.push(field.originalType!)
  }
  return { constraints: compact(constraints), sources }
}
