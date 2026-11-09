/**
 * Tests of the compatibility matrix and of the normalization of settings.
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, FRAMEWORKS, databasesFor, knownGap, knownGaps, normalizeSettings, slug } from './stack.ts'

describe('normalizeSettings', () => {
  it('keeps settings the framework supports', () => {
    const settings = { ...DEFAULT_SETTINGS, persistence: 'sqlalchemy' as const, database: 'mysql' as const, auth: 'jwt' as const }
    expect(normalizeSettings(settings)).toEqual(settings)
  })

  it('moves options the new framework does not offer to its first one', () => {
    const settings = normalizeSettings({ ...DEFAULT_SETTINGS, framework: 'djangoRest', persistence: 'memory', database: null })
    expect(settings).toMatchObject({ persistence: 'djangoOrm', database: 'postgresql' })
    expect(normalizeSettings({ ...DEFAULT_SETTINGS, framework: 'nestjs', architecture: 'layered' }).architecture).toBe('modular')
  })

  it('drops the database of a persistence that needs none, and keeps a valid one', () => {
    expect(normalizeSettings({ ...DEFAULT_SETTINGS, persistence: 'memory', database: 'mysql' }).database).toBeNull()
    expect(normalizeSettings({ ...DEFAULT_SETTINGS, framework: 'springBoot', persistence: 'jpa', database: 'sqlite' }).database).toBe(
      'postgresql',
    )
  })

  it('cleans the project name and the Java package', () => {
    expect(normalizeSettings({ ...DEFAULT_SETTINGS, name: ' My Shop API!' }).name).toBe('my-shop-api')
    expect(normalizeSettings({ ...DEFAULT_SETTINGS, name: '***' }).name).toBe('api')
    expect(normalizeSettings({ ...DEFAULT_SETTINGS, javaPackage: 'Com.Example' }).javaPackage).toBe('com.example.api')
  })
})

describe('matrix', () => {
  it('offers at least one architecture, persistence and authentication per framework', () => {
    for (const framework of FRAMEWORKS) {
      expect(framework.architectures.length, framework.id).toBeGreaterThan(0)
      expect(framework.persistence.length, framework.id).toBeGreaterThan(0)
      expect(framework.auth, framework.id).toContain('none')
    }
  })

  it('lists the databases of each persistence and explains known gaps', () => {
    expect(databasesFor('express', 'mongoose')).toEqual(['mongodb'])
    expect(databasesFor('fastapi', 'memory')).toEqual([])
    expect(knownGap('springBoot', 'jpa', 'sqlite')).toBe('hibernateSqlite')
    expect(knownGap('fastapi', 'sqlalchemy', 'postgresql')).toBeNull()
    expect(knownGaps('springBoot')).toEqual(['hibernateSqlite'])
    expect(knownGaps('express')).toEqual(['prismaMariadb'])
    expect(knownGaps('fastapi')).toEqual([])
  })

  it('writes names as slugs', () => {
    expect(slug('ShopApi')).toBe('shop-api')
    expect(slug('pet store')).toBe('pet-store')
  })
})
