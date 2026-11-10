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
  { id: 'express-memory-layered-none', example: 'store', settings: { framework: 'express', persistence: 'memory', architecture: 'layered', auth: 'none' }, edits: ['filters', 'custom'] },
  { id: 'express-memory-modular-jwt', example: 'library', settings: { framework: 'express', persistence: 'memory', architecture: 'modular', auth: 'jwt' }, edits: ['roles'] },
  { id: 'express-none-layered-apikey', example: 'catalog', settings: { framework: 'express', persistence: 'none', architecture: 'layered', auth: 'apiKey' } },
  { id: 'springboot-memory-layered-none', example: 'store', settings: { framework: 'springBoot', persistence: 'memory', architecture: 'layered', auth: 'none' }, edits: ['filters', 'custom'] },
  { id: 'springboot-memory-modular-jwt', example: 'library', settings: { framework: 'springBoot', persistence: 'memory', architecture: 'modular', auth: 'jwt' }, edits: ['roles'] },
  { id: 'springboot-none-layered-apikey', example: 'catalog', settings: { framework: 'springBoot', persistence: 'none', architecture: 'layered', auth: 'apiKey' } },
  { id: 'springboot-jpa-postgresql-layered-jwt', example: 'library', settings: { framework: 'springBoot', persistence: 'jpa', database: 'postgresql', architecture: 'layered', auth: 'jwt' }, service: 'postgresql' },
  { id: 'springboot-jpa-mysql-modular-none', example: 'store', settings: { framework: 'springBoot', persistence: 'jpa', database: 'mysql', architecture: 'modular', auth: 'none' }, edits: ['filters'], service: 'mysql' },
  { id: 'springboot-jpa-mariadb-layered-apikey', example: 'catalog', settings: { framework: 'springBoot', persistence: 'jpa', database: 'mariadb', architecture: 'layered', auth: 'apiKey' }, service: 'mariadb' },
  { id: 'djangorest-sqlite-layered-none', example: 'store', settings: { framework: 'djangoRest', persistence: 'djangoOrm', database: 'sqlite', architecture: 'layered', auth: 'none' }, edits: ['filters', 'custom'] },
  { id: 'djangorest-sqlite-modular-jwt', example: 'library', settings: { framework: 'djangoRest', persistence: 'djangoOrm', database: 'sqlite', architecture: 'modular', auth: 'jwt' }, edits: ['roles'] },
  { id: 'djangorest-postgresql-layered-apikey', example: 'catalog', settings: { framework: 'djangoRest', persistence: 'djangoOrm', database: 'postgresql', architecture: 'layered', auth: 'apiKey' }, service: 'postgresql' },
  { id: 'djangorest-mysql-modular-none', example: 'store', settings: { framework: 'djangoRest', persistence: 'djangoOrm', database: 'mysql', architecture: 'modular', auth: 'none' }, service: 'mysql' },
  { id: 'djangorest-mariadb-layered-jwt', example: 'library', settings: { framework: 'djangoRest', persistence: 'djangoOrm', database: 'mariadb', architecture: 'layered', auth: 'jwt' }, service: 'mariadb' },
  { id: 'nestjs-memory-modular-none', example: 'store', settings: { framework: 'nestjs', persistence: 'memory', architecture: 'modular', auth: 'none' }, edits: ['filters', 'custom'] },
  { id: 'nestjs-memory-modular-jwt', example: 'library', settings: { framework: 'nestjs', persistence: 'memory', architecture: 'modular', auth: 'jwt' }, edits: ['roles'] },
  { id: 'nestjs-none-modular-apikey', example: 'catalog', settings: { framework: 'nestjs', persistence: 'none', architecture: 'modular', auth: 'apiKey' } },
  { id: 'nestjs-typeorm-postgresql-modular-jwt', example: 'library', settings: { framework: 'nestjs', persistence: 'typeorm', database: 'postgresql', architecture: 'modular', auth: 'jwt' }, service: 'postgresql' },
  { id: 'nestjs-typeorm-mysql-modular-none', example: 'store', settings: { framework: 'nestjs', persistence: 'typeorm', database: 'mysql', architecture: 'modular', auth: 'none' }, edits: ['filters'], service: 'mysql' },
  { id: 'nestjs-typeorm-mariadb-modular-apikey', example: 'catalog', settings: { framework: 'nestjs', persistence: 'typeorm', database: 'mariadb', architecture: 'modular', auth: 'apiKey' }, service: 'mariadb' },
  { id: 'fastapi-sqlalchemy-postgresql-layered-jwt', example: 'library', settings: { framework: 'fastapi', persistence: 'sqlalchemy', database: 'postgresql', architecture: 'layered', auth: 'jwt' }, service: 'postgresql' },
  { id: 'fastapi-sqlalchemy-mysql-modular-none', example: 'store', settings: { framework: 'fastapi', persistence: 'sqlalchemy', database: 'mysql', architecture: 'modular', auth: 'none' }, service: 'mysql' },
  { id: 'fastapi-sqlalchemy-mariadb-layered-apikey', example: 'catalog', settings: { framework: 'fastapi', persistence: 'sqlalchemy', database: 'mariadb', architecture: 'layered', auth: 'apiKey' }, service: 'mariadb' },
  { id: 'laravel-memory-layered-none', example: 'store', settings: { framework: 'laravel', persistence: 'memory', architecture: 'layered', auth: 'none' }, edits: ['filters', 'custom'] },
  { id: 'laravel-memory-modular-jwt', example: 'library', settings: { framework: 'laravel', persistence: 'memory', architecture: 'modular', auth: 'jwt' }, edits: ['roles'] },
  { id: 'laravel-none-layered-apikey', example: 'catalog', settings: { framework: 'laravel', persistence: 'none', architecture: 'layered', auth: 'apiKey' } },
  { id: 'laravel-eloquent-sqlite-layered-apikey', example: 'store', settings: { framework: 'laravel', persistence: 'eloquent', database: 'sqlite', architecture: 'layered', auth: 'apiKey' }, edits: ['filters'] },
  { id: 'laravel-eloquent-sqlite-modular-none', example: 'catalog', settings: { framework: 'laravel', persistence: 'eloquent', database: 'sqlite', architecture: 'modular', auth: 'none' } },
  { id: 'laravel-eloquent-postgresql-layered-jwt', example: 'library', settings: { framework: 'laravel', persistence: 'eloquent', database: 'postgresql', architecture: 'layered', auth: 'jwt' }, service: 'postgresql' },
  { id: 'laravel-eloquent-mysql-modular-none', example: 'store', settings: { framework: 'laravel', persistence: 'eloquent', database: 'mysql', architecture: 'modular', auth: 'none' }, edits: ['filters'], service: 'mysql' },
  { id: 'laravel-eloquent-mariadb-layered-apikey', example: 'catalog', settings: { framework: 'laravel', persistence: 'eloquent', database: 'mariadb', architecture: 'layered', auth: 'apiKey' }, service: 'mariadb' },
]
