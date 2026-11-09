/**
 * The technology choices of a generated project (framework, architecture, persistence, database and
 * authentication) and the matrix of which ones work together. Only combinations a generator really
 * writes are offered; every other one carries the reason it is not.
 *
 * To support a new framework, add it to `FRAMEWORKS` with the options its generator implements, and
 * register the generator (generators/registry.ts).
 */

export type FrameworkId = 'fastapi' | 'djangoRest' | 'express' | 'nestjs' | 'springBoot'

export type LanguageId = 'python' | 'typescript' | 'java'

/** - `layered`: routes or controllers, services and repositories in one folder each
 * - `modular`: one folder per resource with its own routes, service and repository */
export type ArchitectureId = 'layered' | 'modular'

/** - `memory`: repositories that keep the data in memory, to run the API without a database
 * - `none`: repository interfaces to implement, with every method marked as pending
 * - the others: the ORM or ODM named */
export type PersistenceId = 'memory' | 'none' | 'sqlalchemy' | 'djangoOrm' | 'prisma' | 'mongoose' | 'typeorm' | 'jpa'

export type DatabaseId = 'postgresql' | 'mysql' | 'mariadb' | 'sqlite' | 'mongodb'

/** - `none`: every endpoint is public
 * - `apiKey`: a key in the `X-API-Key` header, compared with the keys configured on the server
 * - `jwt`: a bearer token signed by an identity provider, verified with a secret from the environment */
export type AuthId = 'none' | 'apiKey' | 'jwt'

export interface FrameworkInfo {
  id: FrameworkId
  label: string
  language: LanguageId
  architectures: readonly ArchitectureId[]
  /** Each persistence the generator writes, with the databases it supports */
  persistence: readonly { id: PersistenceId; databases: readonly DatabaseId[] }[]
  auth: readonly AuthId[]
}

/** Every framework, in the order the interface shows them. */
export const FRAMEWORKS: readonly FrameworkInfo[] = [
  {
    id: 'fastapi',
    label: 'FastAPI',
    language: 'python',
    architectures: ['layered', 'modular'],
    persistence: [
      { id: 'memory', databases: [] },
      { id: 'none', databases: [] },
      { id: 'sqlalchemy', databases: ['postgresql', 'mysql', 'mariadb', 'sqlite'] },
    ],
    auth: ['none', 'apiKey', 'jwt'],
  },
  {
    id: 'djangoRest',
    label: 'Django REST Framework',
    language: 'python',
    architectures: ['layered', 'modular'],
    persistence: [{ id: 'djangoOrm', databases: ['postgresql', 'mysql', 'mariadb', 'sqlite'] }],
    auth: ['none', 'apiKey', 'jwt'],
  },
  {
    id: 'express',
    label: 'Express',
    language: 'typescript',
    architectures: ['layered', 'modular'],
    persistence: [
      { id: 'memory', databases: [] },
      { id: 'none', databases: [] },
      { id: 'prisma', databases: ['postgresql', 'mysql', 'sqlite'] },
      { id: 'mongoose', databases: ['mongodb'] },
    ],
    auth: ['none', 'apiKey', 'jwt'],
  },
  {
    id: 'nestjs',
    label: 'NestJS',
    language: 'typescript',
    architectures: ['modular'],
    persistence: [
      { id: 'memory', databases: [] },
      { id: 'none', databases: [] },
      { id: 'typeorm', databases: ['postgresql', 'mysql', 'mariadb', 'sqlite'] },
    ],
    auth: ['none', 'apiKey', 'jwt'],
  },
  {
    id: 'springBoot',
    label: 'Spring Boot',
    language: 'java',
    architectures: ['layered', 'modular'],
    persistence: [
      { id: 'memory', databases: [] },
      { id: 'none', databases: [] },
      { id: 'jpa', databases: ['postgresql', 'mysql', 'mariadb'] },
    ],
    auth: ['none', 'apiKey', 'jwt'],
  },
]

/** Fixed reasons for well-known combinations that are not offered, so the interface can explain them. */
const KNOWN_GAPS: { framework?: FrameworkId; persistence?: PersistenceId; database?: DatabaseId; note: string }[] = [
  { framework: 'springBoot', database: 'sqlite', note: 'hibernateSqlite' },
  { framework: 'nestjs', persistence: 'prisma', note: 'notGenerated' },
  { persistence: 'prisma', database: 'mariadb', note: 'prismaMariadb' },
  { framework: 'djangoRest', persistence: 'memory', note: 'djangoNeedsOrm' },
]

export interface ProjectSettings {
  /** Name of the project: folder, package and title (`shop-api`) */
  name: string
  framework: FrameworkId
  architecture: ArchitectureId
  persistence: PersistenceId
  /** Null for persistence without a database (`memory`, `none`) */
  database: DatabaseId | null
  auth: AuthId
  /** Who may call an endpoint whose access is `default` when authentication is on */
  defaultAccess: 'public' | 'authenticated'
  /** Java only: base package of the code (`com.example.shop`) */
  javaPackage: string
}

export const DEFAULT_SETTINGS: ProjectSettings = {
  name: 'api',
  framework: 'fastapi',
  architecture: 'layered',
  persistence: 'memory',
  database: null,
  auth: 'none',
  defaultAccess: 'authenticated',
  javaPackage: 'com.example.api',
}

export function findFramework(id: FrameworkId): FrameworkInfo {
  return FRAMEWORKS.find((framework) => framework.id === id) ?? FRAMEWORKS[0]
}

/** The databases a persistence of a framework supports; empty when it needs none. */
export function databasesFor(framework: FrameworkId, persistence: PersistenceId): readonly DatabaseId[] {
  return findFramework(framework).persistence.find((item) => item.id === persistence)?.databases ?? []
}

/** The well-known reasons some combinations of a framework are not offered, for the interface. */
export function knownGaps(framework: FrameworkId): string[] {
  // A gap names its framework, or else a persistence: it concerns the frameworks that offer it
  const offers = (persistence: PersistenceId | undefined) =>
    findFramework(framework).persistence.some((option) => option.id === persistence)
  return KNOWN_GAPS.filter((item) => (item.framework ? item.framework === framework : offers(item.persistence))).map((item) => item.note)
}

/** A well-known reason a combination is not offered, for the interface (`hibernateSqlite`…). */
export function knownGap(framework: FrameworkId, persistence: PersistenceId | null, database: DatabaseId | null): string | null {
  const gap = KNOWN_GAPS.find(
    (item) =>
      (!item.framework || item.framework === framework) &&
      (!item.persistence || item.persistence === persistence) &&
      (!item.database || item.database === database),
  )
  return gap?.note ?? null
}

/**
 * Makes settings consistent with the matrix: an option the framework does not offer becomes its first
 * offered option, and the database follows the persistence. Every other value is kept.
 *
 * @param settings Settings as the user left them, possibly after changing the framework.
 * @returns Settings a generator can write.
 */
export function normalizeSettings(settings: ProjectSettings): ProjectSettings {
  const framework = findFramework(settings.framework)
  const architecture = framework.architectures.includes(settings.architecture) ? settings.architecture : framework.architectures[0]
  const persistence = framework.persistence.some((item) => item.id === settings.persistence)
    ? settings.persistence
    : framework.persistence[0].id
  const databases = databasesFor(framework.id, persistence)
  const database =
    databases.length === 0 ? null : settings.database && databases.includes(settings.database) ? settings.database : databases[0]
  const auth = framework.auth.includes(settings.auth) ? settings.auth : framework.auth[0]
  const name = slug(settings.name) || DEFAULT_SETTINGS.name
  const javaPackage = /^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)*$/.test(settings.javaPackage)
    ? settings.javaPackage
    : DEFAULT_SETTINGS.javaPackage
  return { ...settings, framework: framework.id, architecture, persistence, database, auth, name, javaPackage }
}

/** A project name usable as a folder and package name: lower case words joined by hyphens. */
export function slug(text: string): string {
  return text
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
