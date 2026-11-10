"""Storage of each resource in the Laravel project: the repository interface the service depends on, and the
implementation of the chosen persistence:
- memory: an array, to run the API without a database
- none: every method throws "not implemented" (501), with a TODO where the storage goes
- eloquent: an Eloquent model, its migration and a repository that maps items to rows
Mirrors web/src/core/generators/frameworks/laravel/persistence.ts.

Items travel as arrays keyed by their JSON names, the same shape the service and the responses use.
"""

from ....js import number_text
from ...common.text import file_text, lines
from ...languages.php.php import PhpImports, php_doc, php_header, php_string
from .context import LaravelContext, class_path, column, key_field, key_type, names, qualified

_LISTING = ("App\\Support\\ListQuery", "App\\Support\\ListResult")


def php_file(namespace: str, name: str, imports: PhpImports, body: list) -> dict:
    return {"path": class_path(namespace, name), "content": file_text(lines(*php_header(namespace, imports), *body))}


def values_file(context: LaravelContext) -> dict | None:
    """Helpers the in-memory repositories share: comparing values as JSON would."""
    if context.settings["persistence"] != "memory":
        return None
    namespace = "App\\Support"
    return php_file(
        namespace,
        "Values",
        PhpImports(namespace),
        [
            php_doc("Compares values as JSON does: a whole number equals the same number with decimals."),
            "final class Values",
            "{",
            "    public static function same(mixed $left, mixed $right): bool",
            "    {",
            "        if (is_numeric($left) && is_numeric($right) && ! is_string($left) && ! is_string($right)) {",
            "            return $left == $right;",
            "        }",
            "",
            "        return $left === $right;",
            "    }",
            "",
            "    /** Texts in character order, numbers by value. */",
            "    public static function compare(mixed $left, mixed $right): int",
            "    {",
            "        if (is_string($left) && is_string($right)) {",
            "            return strcmp($left, $right);",
            "        }",
            "",
            "        return $left <=> $right;",
            "    }",
            "}",
        ],
    )


def _is_scalar(field: dict, scalar: str) -> bool:
    return not field.get("reference") and field["type"]["kind"] == "scalar" and field["type"]["scalar"] == scalar


def _stored_as_json(field: dict) -> bool:
    """Whether a field is stored as JSON: lists, maps, embedded objects and values of any shape."""
    return field["type"]["kind"] in ("array", "map", "object") or _is_scalar(field, "any")


def repository_files(context: LaravelContext, resource: dict) -> list[dict]:
    namespace = context.layout.resource(resource, "repository")
    name = names(resource)
    key = key_type(resource)
    key_wire = key_field(resource)["wire"]
    generated = resource["key"].get("generated")
    plural = resource["plural"]
    files = [
        php_file(
            namespace,
            name["repository"],
            PhpImports(namespace).add(*_LISTING),
            [
                php_doc(
                    f"Where {plural} are kept. The service depends only on this interface; items are arrays keyed by JSON name."
                ),
                f"interface {name['repository']}",
                "{",
                "    /** Items equal to every filter, in order, within the window; and how many match. */",
                "    public function list(ListQuery $query): ListResult;",
                "",
                "    /** @return array<string, mixed>|null The item with this key, or null. */",
                f"    public function get({key} $key): ?array;",
                "",
                "    /**",
                f"     * Stores a new item{' and assigns its key' if generated else ''}.",
                "     *",
                "     * @param  array<string, mixed>  $item",
                "     * @return array<string, mixed> The item as stored.",
                "     */",
                "    public function add(array $item): array;",
                "",
                "    /**",
                "     * Stores the new state of an existing item: every field, as given.",
                "     *",
                "     * @param  array<string, mixed>  $item",
                "     * @return array<string, mixed> The item as stored.",
                "     */",
                f"    public function save({key} $key, array $item): array;",
                "",
                "    /** Removes an existing item. */",
                f"    public function delete({key} $key): void;",
                "}",
            ],
        )
    ]

    if context.pending:
        imports = PhpImports(namespace).add(*_LISTING, "App\\Exceptions\\NotImplementedException")
        message = php_string(f"The storage of {plural} is not written yet")

        def method(signature: str, returns: str) -> list[str]:
            return [
                f"    public function {signature}: {returns}",
                "    {",
                f"        // TODO: store {plural} in your database",
                f"        throw new NotImplementedException({message});",
                "    }",
            ]

        files.append(
            php_file(
                namespace,
                name["pendingRepository"],
                imports,
                [
                    php_doc(f"Storage of {plural} to write: every method answers 501 until it is implemented."),
                    f"final class {name['pendingRepository']} implements {name['repository']}",
                    "{",
                    method("list(ListQuery $query)", "ListResult"),
                    "",
                    method(f"get({key} $key)", "?array"),
                    "",
                    method("add(array $item)", "array"),
                    "",
                    method(f"save({key} $key, array $item)", "array"),
                    "",
                    method(f"delete({key} $key)", "void"),
                    "}",
                ],
            )
        )
        return files

    if not context.eloquent:
        imports = PhpImports(namespace).add(*_LISTING, "App\\Support\\Values")
        if generated == "uuid":
            imports.add("Illuminate\\Support\\Str")
        if generated == "increment":
            assign = f"        $item[{php_string(key_wire)}] = $this->nextKey++;"
        elif generated == "uuid":
            assign = f"        $item[{php_string(key_wire)}] = (string) Str::uuid();"
        else:
            assign = None
        files.append(
            php_file(
                namespace,
                name["memory"],
                imports,
                [
                    php_doc(
                        f"Keeps {plural} in memory: they are lost when the application stops. Use it to try the API."
                    ),
                    f"final class {name['memory']} implements {name['repository']}",
                    "{",
                    "    /** @var array<int|string, array<string, mixed>> */",
                    "    private array $items = [];",
                    generated == "increment" and ["", "    private int $nextKey = 1;"],
                    "",
                    "    public function list(ListQuery $query): ListResult",
                    "    {",
                    "        $items = array_values(array_filter($this->items, function (array $item) use ($query): bool {",
                    "            foreach ($query->filters as $field => $value) {",
                    "                if (! Values::same($item[$field] ?? null, $value)) {",
                    "                    return false;",
                    "                }",
                    "            }",
                    "",
                    "            return true;",
                    "        }));",
                    "        if ($query->sortField !== null) {",
                    "            $field = $query->sortField;",
                    "            // Items without a value go last, whatever the order",
                    "            $present = array_values(array_filter($items, fn (array $item) => ($item[$field] ?? null) !== null));",
                    "            $missing = array_values(array_filter($items, fn (array $item) => ($item[$field] ?? null) === null));",
                    "            usort($present, fn (array $a, array $b) => $query->descending",
                    "                ? Values::compare($b[$field], $a[$field])",
                    "                : Values::compare($a[$field], $b[$field]));",
                    "            $items = [...$present, ...$missing];",
                    "        }",
                    "",
                    "        return new ListResult(array_slice($items, $query->offset, $query->limit), count($items));",
                    "    }",
                    "",
                    f"    public function get({key} $key): ?array",
                    "    {",
                    "        return $this->items[$key] ?? null;",
                    "    }",
                    "",
                    "    public function add(array $item): array",
                    "    {",
                    assign,
                    f"        $this->items[$item[{php_string(key_wire)}]] = $item;",
                    "",
                    "        return $item;",
                    "    }",
                    "",
                    f"    public function save({key} $key, array $item): array",
                    "    {",
                    "        $this->items[$key] = $item;",
                    "",
                    "        return $item;",
                    "    }",
                    "",
                    f"    public function delete({key} $key): void",
                    "    {",
                    "        unset($this->items[$key]);",
                    "    }",
                    "}",
                ],
            )
        )
        return files

    # Eloquent: the model is the row; the repository maps rows to the arrays the service works with
    model = name["model"]
    imports = PhpImports(namespace).add(*_LISTING, qualified(context, resource, "model", model))
    if any(_is_scalar(field, "datetime") for field in resource["fields"]):
        imports.add("Carbon\\CarbonImmutable")
    columns = [f"        {php_string(field['wire'])} => {php_string(column(field))}," for field in resource["fields"]]
    to_row = []
    to_item = []
    for field in resource["fields"]:
        wire = php_string(field["wire"])
        col = php_string(column(field))
        if _is_scalar(field, "datetime"):
            to_row.append(
                f"            {col} => isset($item[{wire}]) ? CarbonImmutable::parse($item[{wire}])->utc() : null,"
            )
            to_item.append(f"            {wire} => $model->getAttribute({col})?->utc()->format('Y-m-d\\TH:i:s.u\\Z'),")
        else:
            to_row.append(f"            {col} => $item[{wire}] ?? null,")
            to_item.append(f"            {wire} => $model->getAttribute({col}),")
    key_column = php_string(column(key_field(resource)))
    files.append(
        php_file(
            namespace,
            name["eloquentRepository"],
            imports,
            [
                php_doc(f"Keeps {plural} in the database with Eloquent."),
                f"final class {name['eloquentRepository']} implements {name['repository']}",
                "{",
                "    /** The column of each JSON field */",
                "    private const COLUMNS = [",
                columns,
                "    ];",
                "",
                "    public function list(ListQuery $query): ListResult",
                "    {",
                f"        $builder = {model}::query();",
                "        foreach ($query->filters as $field => $value) {",
                "            $row = $this->toRow([$field => $value]);",
                "            $builder->where(self::COLUMNS[$field], $row[self::COLUMNS[$field]]);",
                "        }",
                "        $total = (clone $builder)->count();",
                "        if ($query->sortField !== null) {",
                "            $column = self::COLUMNS[$query->sortField];",
                "            // Items without a value go last, whatever the order",
                "            $builder->orderByRaw($builder->getQuery()->getGrammar()->wrap($column).' is null')",
                "                ->orderBy($column, $query->descending ? 'desc' : 'asc');",
                "        }",
                f"        $builder->orderBy({key_column});",
                "        if ($query->limit !== null) {",
                "            $builder->offset($query->offset)->limit($query->limit);",
                "        }",
                "",
                f"        return new ListResult($builder->get()->map(fn ({model} $model) => $this->toItem($model))->all(), $total);",
                "    }",
                "",
                f"    public function get({key} $key): ?array",
                "    {",
                f"        $model = {model}::query()->find($key);",
                "",
                "        return $model === null ? null : $this->toItem($model);",
                "    }",
                "",
                "    public function add(array $item): array",
                "    {",
                f"        $model = new {model}();",
                f"        $model->fill(array_diff_key($this->toRow($item), [{key_column} => true]));"
                if generated
                else "        $model->fill($this->toRow($item));",
                "        $model->save();",
                "",
                "        return $this->toItem($model->fresh() ?? $model);",
                "    }",
                "",
                f"    public function save({key} $key, array $item): array",
                "    {",
                f"        $model = {model}::query()->findOrFail($key);",
                f"        $model->fill(array_diff_key($this->toRow($item), [{key_column} => true]));",
                "        $model->save();",
                "",
                "        return $this->toItem($model->fresh() ?? $model);",
                "    }",
                "",
                f"    public function delete({key} $key): void",
                "    {",
                f"        {model}::query()->whereKey($key)->delete();",
                "    }",
                "",
                "    /**",
                "     * @param  array<string, mixed>  $item",
                "     * @return array<string, mixed> Every column: a field left out of the item is null, dates are in UTC.",
                "     */",
                "    private function toRow(array $item): array",
                "    {",
                "        return [",
                to_row,
                "        ];",
                "    }",
                "",
                "    /** @return array<string, mixed> */",
                f"    private function toItem({model} $model): array",
                "    {",
                "        return [",
                to_item,
                "        ];",
                "    }",
                "}",
            ],
        )
    )
    return files


def _find_enum(context: LaravelContext, field: dict) -> dict | None:
    return next((entry for entry in context.spec["enums"] if entry["name"] == field["type"]["name"]), None)


def _cast_of(context: LaravelContext, field: dict) -> str | None:
    """The Eloquent cast of a field, when its column does not read back as its JSON type."""
    if _stored_as_json(field):
        return "array"
    if field.get("reference"):
        target = next(item for item in context.spec["resources"] if item["name"] == field["reference"])
        return "integer" if target["key"]["type"]["scalar"] == "integer" else None
    if field["type"]["kind"] == "enum":
        item = _find_enum(context, field)
        return "integer" if item and item["valueType"] == "integer" else None
    if field["type"]["kind"] != "scalar":
        return None
    return {
        "integer": "integer",
        "float": "float",
        "decimal": "float",
        "boolean": "boolean",
        "datetime": "immutable_datetime",
    }.get(field["type"]["scalar"])


def model_file(context: LaravelContext, resource: dict) -> dict | None:
    """The Eloquent model of a resource."""
    if not context.eloquent:
        return None
    namespace = context.layout.resource(resource, "model")
    name = names(resource)
    imports = PhpImports(namespace)
    generated = resource["key"].get("generated")
    if generated == "uuid":
        imports.add("Illuminate\\Database\\Eloquent\\Concerns\\HasUuids")
    casts = []
    for field in resource["fields"]:
        cast = _cast_of(context, field)
        if cast is not None:
            casts.append(f"            {php_string(column(field))} => {php_string(cast)},")
    content = lines(
        *php_header(namespace, imports),
        resource.get("todo") and f"// TODO: {resource['todo']}",
        php_doc(f"A row of the {name['table']} table."),
        f"final class {name['model']} extends \\Illuminate\\Database\\Eloquent\\Model",
        "{",
        generated == "uuid" and ["    use HasUuids;", ""],
        f"    protected $table = {php_string(name['table'])};",
        "",
        f"    protected $primaryKey = {php_string(column(key_field(resource)))};",
        "",
        f"    protected $keyType = {php_string(key_type(resource))};",
        "",
        f"    public $incrementing = {'true' if generated == 'increment' else 'false'};",
        "",
        "    public $timestamps = false;",
        "",
        "    protected $guarded = [];",
        "",
        "    /** Date-times are stored in UTC with microseconds, so they read back as they were written */",
        "    protected $dateFormat = 'Y-m-d H:i:s.u';",
        "",
        "    /** @return array<string, string> */",
        "    protected function casts(): array",
        "    {",
        ["        return [", casts, "        ];"] if casts else "        return [];",
        "    }",
        "}",
    )
    return {"path": class_path(namespace, name["model"]), "content": file_text(content)}


def _length(field: dict, fallback: int) -> str:
    value = field["constraints"].get("maxLength")
    return number_text(value if value is not None else fallback)


def _column_definition(context: LaravelContext, field: dict) -> str:
    """The column definition of a field in a migration."""
    name = php_string(column(field))
    if _stored_as_json(field):
        return f"$table->json({name})"
    if field.get("reference"):
        target = next(item for item in context.spec["resources"] if item["name"] == field["reference"])
        scalar = target["key"]["type"]["scalar"]
        if scalar == "integer":
            return f"$table->unsignedBigInteger({name})"
        if scalar == "uuid":
            return f"$table->uuid({name})"
        return f"$table->string({name}, {_length(key_field(target), 191)})"
    if field["type"]["kind"] == "enum":
        item = _find_enum(context, field)
        return f"$table->integer({name})" if item and item["valueType"] == "integer" else f"$table->string({name}, 64)"
    if field["type"]["kind"] != "scalar":
        return f"$table->text({name})"
    scalar = field["type"]["scalar"]
    if scalar == "string":
        length = field["constraints"].get("maxLength")
        if length is not None and length <= 255:
            return f"$table->string({name}, {number_text(length)})"
        return f"$table->text({name})"
    if scalar == "integer":
        return f"$table->bigInteger({name})" if field["type"].get("bits") == 64 else f"$table->integer({name})"
    simple = {
        "float": f"$table->double({name})",
        "decimal": f"$table->decimal({name}, 18, 4)",
        "boolean": f"$table->boolean({name})",
        "date": f"$table->date({name})",
        "datetime": f"$table->dateTime({name}, 6)",
        "time": f"$table->string({name}, 15)",
        "uuid": f"$table->uuid({name})",
    }
    return simple.get(scalar, f"$table->text({name})")


def _key_definition(resource: dict) -> str:
    """The key column of a resource's table."""
    name = php_string(column(key_field(resource)))
    generated = resource["key"].get("generated")
    scalar = resource["key"]["type"]["scalar"]
    if generated == "increment":
        return f"$table->id({name})"
    if scalar == "integer":
        return f"$table->bigInteger({name})->primary()"
    if scalar == "uuid" or generated == "uuid":
        return f"$table->uuid({name})->primary()"
    return f"$table->string({name}, {_length(key_field(resource), 191)})->primary()"


def migration_file(context: LaravelContext) -> dict | None:
    """The migration that creates the tables, one per resource."""
    if not context.eloquent:
        return None
    creates = []
    for resource in context.spec["resources"]:
        definitions = [
            f"            {_column_definition(context, field)}->nullable();"
            for field in resource["fields"]
            if field["name"] != resource["key"]["field"]
        ]
        creates.append(
            lines(
                f"        Schema::create({php_string(names(resource)['table'])}, function (Blueprint $table): void {{",
                f"            {_key_definition(resource)};",
                definitions,
                "        });",
            )
        )
    drops = [
        f"        Schema::dropIfExists({php_string(names(resource)['table'])});"
        for resource in reversed(context.spec["resources"])
    ]
    content = lines(
        "<?php",
        "",
        "use Illuminate\\Database\\Migrations\\Migration;",
        "use Illuminate\\Database\\Schema\\Blueprint;",
        "use Illuminate\\Support\\Facades\\Schema;",
        "",
        "// The tables of the API. Every column but the key accepts null: the requests check what is required.",
        "return new class extends Migration",
        "{",
        "    public function up(): void",
        "    {",
        "\n\n".join(creates),
        "    }",
        "",
        "    public function down(): void",
        "    {",
        drops,
        "    }",
        "};",
    )
    return {"path": "database/migrations/0001_01_01_000000_create_api_tables.php", "content": file_text(content)}
