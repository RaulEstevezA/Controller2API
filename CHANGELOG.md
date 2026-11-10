# Changelog

Notable changes to Model2API, the web and the desktop version together. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/). Desktop releases will be tagged `v<version>` and published on [Releases](https://github.com/RaulEstevezA/Model2API/releases).

## [Unreleased]

### Added

- Web: reads models in 23 formats with the importers of Mapper (code in 12 languages, JSON Schema, OpenAPI, GraphQL, Protocol Buffers, Smithy, Prisma, model schema, and JSON, YAML, XML or CSV documents), and the validations each field declares: Jakarta Bean Validation, class-validator, DataAnnotations, Pydantic, Django, JPA, SQLAlchemy, Prisma, Zod, Go tags and JSON Schema.
- Web: proposes an API for the models, each proposal with its confidence and its reason: which models are resources and which travel inside others, the key of each resource, how related models travel (their key or the whole item), what clients may send or read of each field (keys and timestamps read only, secrets send only), and the six standard endpoints of each resource. What it is not sure about waits for the user and leaves a `TODO` in the code.
- Web: every decision and endpoint can be changed, with undo and redo: paths, operation names, summaries, status codes, who may call each endpoint (public, with credentials, some roles), pagination, filters and sorting of lists, and business endpoints that are not CRUD.
- Web: checks the design before writing code (routes that clash, paths without the key, filters on fields that cannot be filtered…); an endpoint with an error is left out and the reason is shown.
- Web: writes the OpenAPI 3.1 contract of the API, the same for every framework.
- Web: writes projects for FastAPI, Django REST Framework, Express, NestJS and Spring Boot, by layers or one folder per resource, with storage in memory, as interfaces to implement, or with SQLAlchemy, the Django ORM, TypeORM or JPA on PostgreSQL, MySQL, MariaDB or SQLite; authentication with an API key or JWT with roles; one error format; validations with each framework's own tools; tests that call every endpoint; README and `.env.example`.
- Web: only offers stacks that have been verified by building, running and testing generated projects in Docker.
- Web: browse, copy and download each generated file, the OpenAPI contract, or the whole project as a .zip.
- Web: three built-in examples, project files to save and open, and "Remember in this browser".
- Web: the page of the tool, in English and Spanish, following the layout of the other tools.
- Desktop: the same tool as a Python + PySide6 app for macOS, Windows and Linux: the same importers, proposals, checks, OpenAPI contract and generators, which write exactly the same files as the web version for the shared cases; the models, endpoints and project panes; project files, "Remember on this computer", and saving files, the contract or the whole project as a .zip.

[Unreleased]: https://github.com/RaulEstevezA/Model2API/commits/main
