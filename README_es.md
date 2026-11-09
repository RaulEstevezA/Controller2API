# Model2API

Model2API convierte modelos de datos en el código de una API REST que revisas antes de que se escriba, y después lo escribe: un proyecto con sus recursos y endpoints, validación, gestión de errores, persistencia, autenticación, pruebas, contrato OpenAPI y un README para ejecutarlo. Todo ocurre en tu lado, en el navegador: lo que pegas o abres no se envía a ningún sitio, y el código se analiza, nunca se ejecuta.

> [!IMPORTANT]
> Model2API está en desarrollo y todavía no se ha publicado. Lo que ya funciona está en el [changelog](./CHANGELOG.md); el resto de esta página describe lo que la herramienta va a hacer.

```text
Pegar o abrir los modelos  →  Revisar los endpoints propuestos  →  Elegir el framework y las opciones  →  Descargar el proyecto
```

## Qué hace

1. **Lee los modelos**: clases y DTOs en Python (dataclasses, Pydantic), TypeScript, JavaScript, Java (clases, records), C#, Kotlin y Dart, JSON, JSON Schema y OpenAPI, o modelos recibidos de Api2Class, Mapper y Model2DB. Lo que la entrada declara (campos obligatorios, longitudes, rangos, formatos, enums, valores por defecto, claves, relaciones) se toma tal cual.
2. **Propone la API**: un recurso por modelo con sus operaciones (`GET /products`, `GET /products/{id}`, `POST`, `PUT`, `PATCH`, `DELETE`), cada una con sus parámetros, cuerpos, respuestas, códigos de estado y errores.
3. **Explica cada propuesta y nunca decide una ambigüedad**: lo que no tiene claro te espera, y el código generado deja un `TODO` donde va la decisión.
4. **Te deja cambiarlo todo**: activar y desactivar endpoints, editar rutas, añadir endpoints de negocio que no son CRUD, configurar paginación, filtros, orden, validaciones y permisos, con deshacer y rehacer.
5. **Escribe código idiomático del framework que elijas**, con la arquitectura que le encaja (por capas, modular por funcionalidades o limpia / hexagonal cuando tiene sentido) y sin capas que no necesita.
6. **Comprueba las combinaciones**: solo ofrece opciones de framework, persistencia y autenticación que funcionan juntas, y una combinación solo aparece como verificada después de compilar, arrancar y llamar a un proyecto generado con ella.

## Frameworks

| Lenguaje | Frameworks |
|---|---|
| Python | FastAPI, Django REST Framework |
| TypeScript | Express, NestJS |
| Java | Spring Boot |

Los proyectos generados se escriben en inglés. Son un punto de partida que hay que revisar, no la promesa de un servicio listo para producción.

## Versiones

- **Web**: React + TypeScript + Vite, en el navegador.
- **Escritorio**: Python + PySide6, la misma herramienta como aplicación instalable. Las dos versiones pasan los mismos casos de `shared/test-cases/`.

## Desarrollo

La versión web está en `web/`:

```bash
cd web
npm install
npm run dev      # servidor de desarrollo
npm run check    # tipos, lint, formato y tests
npm run build    # build de producción, servido desde /tools/Model2API/
```

Cómo está organizado el código, y por qué: [docs/architecture.md](./docs/architecture.md) y [docs/decisions.md](./docs/decisions.md).

## Sugerencias

Ideas de mejora, errores o un framework para el que te gustaría que Model2API escribiera: escribe a [contact.raulesteveza@gmail.com](mailto:contact.raulesteveza@gmail.com).

## Desarrollador

**Raul Estevez**

- [Web personal](https://raulesteveza.github.io/)
- [Perfil de LinkedIn](https://www.linkedin.com/in/raulesteveza/)

## Licencia

[MIT](./LICENSE)
