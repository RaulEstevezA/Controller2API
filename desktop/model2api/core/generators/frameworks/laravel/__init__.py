"""Laravel generator: writes a PHP project with Laravel 13, its own validation (Form Requests), and Eloquent when it
is chosen. It composes the modules of this folder; each writes one kind of file. Mirrors
web/src/core/generators/frameworks/laravel/index.ts.
"""

from .app import (
    api_request_file,
    blank_string_rule_file,
    bootstrap_files,
    config_file,
    error_files,
    listing_files,
    provider_file,
    security_files,
)
from .context import create_context
from .persistence import migration_file, model_file, repository_files, values_file
from .project import composer_file, env_example_file, gitignore_file, phpunit_file, readme_file
from .requests import enum_files, request_files
from .tests import test_files
from .web import base_controller_file, controller_file, resource_file, routes_file, service_file


def _generate(spec: dict, settings: dict, open_api: str) -> list[dict]:
    context = create_context(spec, settings)
    code = [
        *bootstrap_files(context),
        config_file(context),
        *error_files(),
        *listing_files(),
        values_file(context),
        api_request_file(),
        blank_string_rule_file(),
        *security_files(context),
        provider_file(context),
        base_controller_file(),
        routes_file(context),
        *enum_files(context),
        migration_file(context),
    ]
    for resource in spec["resources"]:
        code.extend(
            [
                *request_files(context, resource),
                resource_file(context, resource),
                model_file(context, resource),
                *repository_files(context, resource),
                service_file(context, resource),
                controller_file(context, resource),
            ]
        )
    return [
        readme_file(context),
        composer_file(context),
        phpunit_file(context),
        env_example_file(context),
        gitignore_file(),
        {"path": "openapi.yaml", "content": open_api},
        *(file for file in code if file is not None),
        *test_files(context),
    ]


LARAVEL_GENERATOR = {"framework": "laravel", "serverUrl": "http://localhost:8000", "generate": _generate}
