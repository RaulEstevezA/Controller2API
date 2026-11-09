/**
 * Combinations the verification builds, runs and calls. Each scenario is a built-in example, the project
 * settings that differ from the defaults, and optional edits of the proposed design.
 *
 * A stack is shown as verified in the interface only when a scenario with it passes
 * (web/src/core/compatibility/verified.ts).
 */

/** @typedef {{ id: string, example: 'store' | 'library' | 'catalog', settings: Record<string, string>, edits?: string[], service?: 'postgresql' | 'mysql' | 'mariadb' }} Scenario
 * `service` is the database the tests run on (verification/runners/with-database.sh); without it, they need none. */

/** @type {Scenario[]} */
export const SCENARIOS = [
  { id: 'fastapi-memory-layered-none', example: 'store', settings: { framework: 'fastapi', persistence: 'memory', architecture: 'layered', auth: 'none' }, edits: ['filters', 'custom'] },
  { id: 'fastapi-memory-modular-jwt', example: 'library', settings: { framework: 'fastapi', persistence: 'memory', architecture: 'modular', auth: 'jwt' }, edits: ['roles'] },
  { id: 'fastapi-none-layered-apikey', example: 'catalog', settings: { framework: 'fastapi', persistence: 'none', architecture: 'layered', auth: 'apiKey' } },
  { id: 'fastapi-sqlalchemy-sqlite-layered-apikey', example: 'store', settings: { framework: 'fastapi', persistence: 'sqlalchemy', database: 'sqlite', architecture: 'layered', auth: 'apiKey' }, edits: ['filters'] },
  { id: 'fastapi-sqlalchemy-sqlite-modular-none', example: 'catalog', settings: { framework: 'fastapi', persistence: 'sqlalchemy', database: 'sqlite', architecture: 'modular', auth: 'none' } },
  { id: 'fastapi-sqlalchemy-postgresql-layered-jwt', example: 'library', settings: { framework: 'fastapi', persistence: 'sqlalchemy', database: 'postgresql', architecture: 'layered', auth: 'jwt' }, service: 'postgresql' },
  { id: 'fastapi-sqlalchemy-mysql-modular-none', example: 'store', settings: { framework: 'fastapi', persistence: 'sqlalchemy', database: 'mysql', architecture: 'modular', auth: 'none' }, service: 'mysql' },
  { id: 'fastapi-sqlalchemy-mariadb-layered-apikey', example: 'catalog', settings: { framework: 'fastapi', persistence: 'sqlalchemy', database: 'mariadb', architecture: 'layered', auth: 'apiKey' }, service: 'mariadb' },
]
