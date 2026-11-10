/**
 * Shared context of the Laravel generator: the namespace of each class for the chosen architecture
 * (Strategy pattern: `layered` groups classes by kind, as Laravel does; `modular` keeps one folder per
 * resource), and the names of each resource's classes, table and columns.
 */
import type { ApiSpec, SpecField, SpecResource } from '../../../api/spec.ts'
import type { ProjectSettings } from '../../../compatibility/stack.ts'
import { phpClass, phpName, phpSnake } from '../../languages/php/php.ts'

export type ClassKind = 'controller' | 'request' | 'resource' | 'service' | 'repository' | 'model'

export interface Layout {
  /** Namespace of a resource's class of this kind */
  resource(resource: SpecResource, kind: ClassKind): string
  /** Namespace of the enums */
  enums(): string
}

const LAYERED: Record<ClassKind, string> = {
  controller: 'App\\Http\\Controllers',
  request: 'App\\Http\\Requests',
  resource: 'App\\Http\\Resources',
  service: 'App\\Services',
  repository: 'App\\Repositories',
  model: 'App\\Models',
}

const layered: Layout = {
  resource: (_resource, kind) => LAYERED[kind],
  enums: () => 'App\\Enums',
}

const modular: Layout = {
  resource: (resource) => `App\\Modules\\${phpClass(resource.name)}`,
  enums: () => 'App\\Modules\\Shared',
}

export interface LaravelContext {
  spec: ApiSpec
  settings: ProjectSettings
  layout: Layout
  pending: boolean
  eloquent: boolean
}

export function createContext(spec: ApiSpec, settings: ProjectSettings): LaravelContext {
  return {
    spec,
    settings,
    layout: settings.architecture === 'modular' ? modular : layered,
    pending: settings.persistence === 'none',
    eloquent: settings.persistence === 'eloquent',
  }
}

/** Path of the file of a class, from its namespace (PSR-4: `App\` is `app/`). */
export function classPath(namespace: string, name: string): string {
  return `${namespace
    .replace(/^App(\\|$)/, 'app$1')
    .split('\\')
    .join('/')}/${name}.php`
}

/** Names of a resource's classes, table and variables. */
export function names(resource: SpecResource) {
  const type = phpClass(resource.name)
  return {
    type,
    controller: `${type}Controller`,
    store: `Store${type}Request`,
    update: `Update${type}Request`,
    resource: `${type}Resource`,
    service: `${type}Service`,
    repository: `${type}Repository`,
    memory: `InMemory${type}Repository`,
    pendingRepository: `Pending${type}Repository`,
    eloquentRepository: `Eloquent${type}Repository`,
    model: type,
    one: phpName(resource.name),
    table: phpSnake(resource.plural.replace(/ /g, '_')),
  }
}

/** The fully qualified name of a resource's class. */
export function qualified(context: LaravelContext, resource: SpecResource, kind: ClassKind, name: string): string {
  return `${context.layout.resource(resource, kind)}\\${name}`
}

/** The column of a field: its JSON name in snake_case (`customerId` → `customer_id`). */
export function column(field: SpecField): string {
  return phpSnake(field.wire)
}

export function keyField(resource: SpecResource): SpecField {
  return resource.fields.find((field) => field.name === resource.key.field)!
}

/** The PHP type of the key: whole numbers are `int`, the rest text. */
export function keyType(resource: SpecResource): string {
  return resource.key.type.scalar === 'integer' ? 'int' : 'string'
}

/** Resources a resource refers to, directly or inside its embedded objects, other than itself. */
export function referencedResources(context: LaravelContext, resource: SpecResource): SpecResource[] {
  const found = new Set<string>()
  const visit = (fields: SpecField[], seen: Set<string>) => {
    for (const field of fields) {
      if (field.reference) found.add(field.reference)
      const inner = innerObject(field.type)
      if (inner && !seen.has(inner)) {
        const object = context.spec.objects.find((item) => item.name === inner)
        if (object) visit(object.fields, new Set([...seen, inner]))
      }
    }
  }
  visit(resource.fields, new Set())
  found.delete(resource.name)
  return context.spec.resources.filter((item) => found.has(item.name))
}

/** The embedded object a type holds, directly or as the items of a list or map. */
export function innerObject(type: SpecField['type']): string | null {
  if (type.kind === 'object') return type.name
  if (type.kind === 'array') return innerObject(type.items)
  if (type.kind === 'map') return innerObject(type.value)
  return null
}

export function article(text: string): string {
  return /^[aeiou]/i.test(text) ? `an ${text}` : `a ${text}`
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
