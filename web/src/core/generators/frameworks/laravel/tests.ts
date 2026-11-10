/**
 * Tests of the Laravel project (PHPUnit with Laravel's HTTP testing). They call every enabled endpoint the
 * way a client would, with the same cases as every other framework (common/testing.ts). Each test runs on a
 * new application, so it starts with empty storage.
 */
import type { SpecEndpoint, SpecResource } from '../../../api/spec.ts'
import { sampleBody, updatableField, type JsonValue, type SampleReference } from '../../common/samples.ts'
import {
  TEST_JWT_SECRET,
  TEST_API_KEY,
  comparableFields,
  creatable,
  findEndpoint,
  fixedPath,
  keyWire,
  missingKey,
  pathWithKey,
  protectedEndpoint,
  requiredField,
  roleEndpoint,
  sampleKeysDiffer,
} from '../../common/testing.ts'
import type { GeneratedFile } from '../../common/types.ts'
import { fileText, lines } from '../../common/text.ts'
import { phpDoc, phpLiteral, phpString } from '../../languages/php/php.ts'
import { article, names, type LaravelContext } from './context.ts'

/** A PHP expression for a path whose key is the variable `$key`. */
function url(endpoint: SpecEndpoint, resource: SpecResource): string {
  const [before, after] = pathWithKey(endpoint, resource).split('{key}')
  return after === undefined ? phpString(before) : `${phpString(before)}.$key${after ? `.${phpString(after)}` : ''}`
}

function subscript(path: SampleReference['path']): string {
  return path.map((part) => `[${typeof part === 'number' ? part : phpString(part)}]`).join('')
}

/** A test method name from its title: `creates a customer` → `test_creates_a_customer`. */
function methodName(title: string): string {
  return `test_${title
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}`
}

function testDataFile(context: LaravelContext): GeneratedFile {
  const { auth } = context.settings
  const blocks: string[] = []
  for (const resource of context.spec.resources) {
    if (!creatable(context.spec, resource)) continue
    const name = names(resource)
    const create = findEndpoint(resource, 'create')!
    const first = sampleBody(context.spec, resource, 0).sample
    const second = sampleBody(context.spec, resource, 1).sample
    const fills = first.references.map((reference) => {
      const target = context.spec.resources.find((item) => item.name === reference.resource)!
      return `        $body${subscript(reference.path)} = $this->create${names(target).type}()[${phpString(keyWire(target))}];`
    })
    blocks.push(
      lines(
        '    /**',
        `     * A valid body to create ${article(resource.singular)}, with the items it refers to created first.`,
        '     *',
        '     * @return array<string, mixed>',
        '     */',
        `    protected function ${name.one}Payload(int $variant = 0): array`,
        '    {',
        `        $body = $variant === 0 ? ${phpLiteral(first.body as JsonValue)} : ${phpLiteral(second.body as JsonValue)};`,
        fills,
        '',
        '        return $body;',
        '    }',
        '',
        '    /**',
        `     * Creates ${article(resource.singular)} and returns it as the API answers.`,
        '     *',
        '     * @return array<string, mixed>',
        '     */',
        `    protected function create${name.type}(int $variant = 0): array`,
        '    {',
        `        $response = $this->postJson(${phpString(create.path)}, $this->${name.one}Payload($variant), $this->headers());`,
        `        $response->assertStatus(${create.status});`,
        '',
        '        return $response->json();',
        '    }',
      ),
    )
  }
  const content = lines(
    '<?php',
    '',
    'namespace Tests;',
    '',
    auth === 'jwt' && ['use Firebase\\JWT\\JWT;', ''],
    phpDoc('Credentials for the tests, builders of valid request bodies, and helpers that create items through the API.'),
    'trait TestData',
    '{',
    '    /** @return array<string, string> Headers of a client allowed to call every endpoint. */',
    '    protected function headers(): array',
    '    {',
    auth === 'none' && '        return [];',
    auth === 'apiKey' && `        return ['X-API-Key' => ${phpString(TEST_API_KEY)}];`,
    auth === 'jwt' && `        return ['Authorization' => 'Bearer '.$this->token([${context.spec.roles.map(phpString).join(', ')}])];`,
    '    }',
    auth === 'jwt' && [
      '',
      '    /** @return array<string, string> Headers of a client with a valid token but no role. */',
      '    protected function headersWithoutRoles(): array',
      '    {',
      "        return ['Authorization' => 'Bearer '.$this->token([])];",
      '    }',
      '',
      '    /**',
      '     * A token signed with the test secret (phpunit.xml), valid for one hour.',
      '     *',
      '     * @param  list<string>  $roles',
      '     */',
      '    protected function token(array $roles): string',
      '    {',
      `        return JWT::encode(['sub' => 'tests', 'roles' => $roles, 'exp' => time() + 3600], ${phpString(TEST_JWT_SECRET)}, 'HS256');`,
      '    }',
    ],
    blocks.length > 0 && ['', blocks.join('\n\n')],
    '}',
  )
  return { path: 'tests/TestData.php', content: fileText(content) }
}

function testCaseFile(context: LaravelContext): GeneratedFile {
  const content = lines(
    '<?php',
    '',
    'namespace Tests;',
    '',
    context.eloquent && 'use Illuminate\\Foundation\\Testing\\RefreshDatabase;',
    'use Illuminate\\Foundation\\Testing\\TestCase as BaseTestCase;',
    '',
    phpDoc('Base of the tests: a new application for each test.'),
    'abstract class TestCase extends BaseTestCase',
    '{',
    context.eloquent && [
      '    use RefreshDatabase;',
      '',
      '    protected function setUp(): void',
      '    {',
      '        // TEST_DATABASE_URL (postgresql://, mysql://, mariadb://…) runs the tests on that database',
      "        $url = getenv('TEST_DATABASE_URL');",
      "        if (is_string($url) && $url !== '') {",
      '            $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));',
      '            $connection = match ($scheme) {',
      "                'postgresql', 'postgres', 'pgsql' => 'pgsql',",
      "                'mariadb' => 'mariadb',",
      "                default => 'mysql',",
      '            };',
      "            foreach (['DB_CONNECTION' => $connection, 'DB_URL' => $url] as $name => $value) {",
      '                putenv("{$name}={$value}");',
      '                $_ENV[$name] = $_SERVER[$name] = $value;',
      '            }',
      '        }',
      '        parent::setUp();',
      '    }',
    ],
    !context.eloquent && '    //',
    '}',
  )
  return { path: 'tests/TestCase.php', content: fileText(content) }
}

function resourceTests(context: LaravelContext, resource: SpecResource): GeneratedFile {
  const name = names(resource)
  const key = keyWire(resource)
  const tests: string[] = []
  const canCreate = creatable(context.spec, resource)
  const problem = sampleBody(context.spec, resource, 0).problem
  const get = findEndpoint(resource, 'get')
  const create = findEndpoint(resource, 'create')
  const list = findEndpoint(resource, 'list')
  const used = new Set<string>()
  const test = (title: string, body: (string | false | null | undefined | string[])[]) => {
    let method = methodName(title)
    for (let n = 2; used.has(method); n++) method = `${methodName(title)}_${n}`
    used.add(method)
    tests.push(lines(`    public function ${method}(): void`, '    {', ...body, '    }'))
  }
  const createdKey = [`        $created = $this->create${name.type}();`, `        $key = $created[${phpString(key)}];`]

  if (context.pending) {
    for (const endpoint of [list, get].filter(Boolean) as SpecEndpoint[]) {
      test(`${endpoint.name} answers 501 until the storage is written`, [
        `        $response = $this->getJson(${phpString(fixedPath(endpoint, resource, missingKey(resource)))}, $this->headers());`,
        '',
        '        $response->assertStatus(501);',
        "        $this->assertSame('not_implemented', $response->json('error.code'));",
      ])
    }
  } else {
    if (create && !canCreate) {
      test(`creates ${article(resource.singular)}`, [
        `        // TODO: ${problem ?? 'write a body with the items it refers to'}`,
        `        $this->markTestSkipped(${phpString(problem ?? 'An item it refers to cannot be created through the API.')});`,
      ])
    }
    if (canCreate) {
      const sent = sampleBody(context.spec, resource, 0).sample.body
      test(`creates ${article(resource.singular)}`, [
        `        $payload = $this->${name.one}Payload();`,
        '',
        `        $response = $this->postJson(${phpString(create!.path)}, $payload, $this->headers());`,
        '',
        `        $response->assertStatus(${create!.status});`,
        '        $body = $response->json();',
        `        $this->assertArrayHasKey(${phpString(key)}, $body);`,
        comparableFields(resource, sent).map(
          (wire) => `        $this->assertSame($payload[${phpString(wire)}], $body[${phpString(wire)}]);`,
        ),
      ])
      const required = requiredField(resource)
      if (required) {
        test(`rejects ${article(resource.singular)} without ${required.wire}`, [
          `        $payload = $this->${name.one}Payload();`,
          `        unset($payload[${phpString(required.wire)}]);`,
          '',
          `        $response = $this->postJson(${phpString(create!.path)}, $payload, $this->headers());`,
          '',
          '        $response->assertStatus(400);',
          "        $this->assertSame('validation_error', $response->json('error.code'));",
          `        $this->assertContains(${phpString(required.wire)}, array_column($response->json('error.details'), 'field'));`,
        ])
      }
      if (resource.key.generated === null) {
        test(`rejects a second ${resource.singular} with the same key`, [
          `        $created = $this->create${name.type}();`,
          `        $payload = $this->${name.one}Payload();`,
          `        $payload[${phpString(key)}] = $created[${phpString(key)}];`,
          '',
          `        $response = $this->postJson(${phpString(create!.path)}, $payload, $this->headers());`,
          '',
          '        $response->assertStatus(409);',
        ])
      }
    }
    if (get) {
      if (canCreate) {
        test(`gets ${article(resource.singular)}`, [
          ...createdKey,
          '',
          `        $response = $this->getJson(${url(get, resource)}, $this->headers());`,
          '',
          '        $response->assertStatus(200);',
          '        $this->assertEquals($created, $response->json());',
        ])
      }
      test(`answers 404 for a missing ${resource.singular}`, [
        `        $response = $this->getJson(${phpString(fixedPath(get, resource, missingKey(resource)))}, $this->headers());`,
        '',
        '        $response->assertStatus(404);',
        "        $this->assertSame('not_found', $response->json('error.code'));",
      ])
    }
    if (list) {
      const distinct = sampleKeysDiffer(context.spec, resource)
      const count = canCreate ? (distinct ? 2 : 1) : 0
      test(`lists ${resource.plural}`, [
        canCreate && `        $this->create${name.type}();`,
        canCreate && distinct && `        $this->create${name.type}(1);`,
        '',
        `        $response = $this->getJson(${phpString(list.path)}, $this->headers());`,
        '',
        '        $response->assertStatus(200);',
        list.pagination
          ? [`        $this->assertSame(${count}, $response->json('total'));`, "        $this->assertSame(1, $response->json('page'));"]
          : `        $this->assertCount(${count}, $response->json());`,
      ])
      if (list.pagination && canCreate && distinct) {
        test(`lists ${resource.plural} by page`, [
          `        $this->create${name.type}();`,
          `        $this->create${name.type}(1);`,
          '',
          `        $response = $this->getJson(${phpString(`${list.path}?page=2&size=1`)}, $this->headers());`,
          '',
          '        $response->assertStatus(200);',
          "        $this->assertSame(2, $response->json('total'));",
          "        $this->assertCount(1, $response->json('items'));",
          "        $this->assertSame(2, $response->json('page'));",
        ])
      }
      if (list.pagination) {
        test('rejects a page that does not exist', [
          `        $response = $this->getJson(${phpString(`${list.path}?page=0`)}, $this->headers());`,
          '',
          '        $response->assertStatus(400);',
        ])
      }
    }
    const replace = findEndpoint(resource, 'replace')
    if (replace && canCreate) {
      test(`replaces ${article(resource.singular)}`, [
        ...createdKey,
        `        $payload = $this->${name.one}Payload(1);`,
        resource.key.generated === null && `        $payload[${phpString(key)}] = $key;`,
        '',
        `        $response = $this->putJson(${url(replace, resource)}, $payload, $this->headers());`,
        '',
        '        $response->assertStatus(200);',
        comparableFields(resource, sampleBody(context.spec, resource, 1).sample.body)
          .filter((wire) => wire !== key)
          .map((wire) => `        $this->assertSame($payload[${phpString(wire)}], $response->json()[${phpString(wire)}]);`),
      ])
    }
    const update = findEndpoint(resource, 'update')
    const field = updatableField(resource)
    if (update && canCreate && field) {
      const value = sampleBody(context.spec, resource, 1).sample.body[field.wire] ?? null
      test(`updates part of ${article(resource.singular)}`, [
        ...createdKey,
        '',
        `        $response = $this->patchJson(${url(update, resource)}, [${phpString(field.wire)} => ${phpLiteral(value)}], $this->headers());`,
        '',
        '        $response->assertStatus(200);',
        `        $this->assertEquals(${phpLiteral(value)}, $response->json()[${phpString(field.wire)}]);`,
      ])
      if (!field.nullable) {
        test(`rejects null for ${field.wire}`, [
          ...createdKey,
          '',
          `        $response = $this->patchJson(${url(update, resource)}, [${phpString(field.wire)} => null], $this->headers());`,
          '',
          '        $response->assertStatus(400);',
        ])
      }
    }
    const remove = findEndpoint(resource, 'delete')
    if (remove && canCreate) {
      test(`deletes ${article(resource.singular)}`, [
        ...createdKey,
        '',
        `        $response = $this->deleteJson(${url(remove, resource)}, [], $this->headers());`,
        '',
        `        $response->assertStatus(${remove.status});`,
        get && `        $this->getJson(${url(get, resource)}, $this->headers())->assertStatus(404);`,
      ])
    }
    for (const endpoint of resource.endpoints.filter((item) => item.operation === 'custom')) {
      const needsItem = endpoint.pathParams.some((param) => param.name === resource.key.param)
      if ((needsItem || endpoint.input === 'resource') && !canCreate) continue
      const body = endpoint.input === 'none' ? '[]' : endpoint.input === 'partial' ? '[]' : `$this->${name.one}Payload()`
      const path = needsItem ? url(endpoint, resource) : phpString(fixedPath(endpoint, resource, 'sample'))
      test(`${endpoint.name} answers 501 until it is written`, [
        needsItem && createdKey,
        '        // TODO: replace this test when the operation is written',
        `        $response = $this->json(${phpString(endpoint.method)}, ${path}, ${body}, $this->headers());`,
        '',
        '        $response->assertStatus(501);',
      ])
    }
  }
  const guarded = protectedEndpoint(resource, context.settings.auth)
  if (guarded) {
    test(`${guarded.name} needs credentials`, [
      `        $response = $this->getJson(${phpString(fixedPath(guarded, resource, missingKey(resource)))});`,
      '',
      '        $response->assertStatus(401);',
      "        $this->assertSame('unauthorized', $response->json('error.code'));",
    ])
  }
  const withRoles = roleEndpoint(resource, context.settings.auth)
  if (withRoles) {
    test(`${withRoles.name} needs a role`, [
      `        $response = $this->getJson(${phpString(fixedPath(withRoles, resource, missingKey(resource)))}, $this->headersWithoutRoles());`,
      '',
      '        $response->assertStatus(403);',
    ])
  }
  const className = `${name.type}ApiTest`
  const content = lines(
    '<?php',
    '',
    'namespace Tests\\Feature;',
    '',
    'use Tests\\TestCase;',
    'use Tests\\TestData;',
    '',
    phpDoc(`Tests of the ${resource.plural} endpoints.`),
    `final class ${className} extends TestCase`,
    '{',
    '    use TestData;',
    '',
    tests.length > 0
      ? tests.join('\n\n')
      : ['    public function test_has_no_endpoints(): void', '    {', '        $this->assertTrue(true);', '    }'],
    '}',
  )
  return { path: `tests/Feature/${className}.php`, content: fileText(content) }
}

export function testFiles(context: LaravelContext): GeneratedFile[] {
  return [testCaseFile(context), testDataFile(context), ...context.spec.resources.map((resource) => resourceTests(context, resource))]
}
