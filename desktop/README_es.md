# Controller2Api · Escritorio

Versión de escritorio de Controller2Api: Python + PySide6.

Hace lo mismo que la versión web, en tu equipo y sin navegador: pasa los mismos casos de prueba de [`shared/test-cases/`](../shared/README.md), propone los mismos endpoints y escribe exactamente los mismos archivos de proyecto para cada framework y opción.

Qué hace la herramienta y su filosofía están en el [README principal](../README_es.md).

## Descarga

| Sistema | Archivo |
|---|---|
| macOS (Apple Silicon) | [Controller2Api-macOS.dmg](https://github.com/RaulEstevezA/Controller2Api/releases/latest/download/Controller2Api-macOS.dmg) |
| Windows (x64) | [Controller2Api-Windows.zip](https://github.com/RaulEstevezA/Controller2Api/releases/latest/download/Controller2Api-Windows.zip) |
| Windows (ARM64) | [Controller2Api-Windows-ARM64.zip](https://github.com/RaulEstevezA/Controller2Api/releases/latest/download/Controller2Api-Windows-ARM64.zip) |
| Linux (x64) | [Controller2Api-Linux.tar.gz](https://github.com/RaulEstevezA/Controller2Api/releases/latest/download/Controller2Api-Linux.tar.gz) |
| Linux (ARM64, Ubuntu 24.04 o más nueva) | [Controller2Api-Linux-ARM64.tar.gz](https://github.com/RaulEstevezA/Controller2Api/releases/latest/download/Controller2Api-Linux-ARM64.tar.gz) |

Todas las versiones están en [Releases](https://github.com/RaulEstevezA/Controller2Api/releases). Los enlaces funcionan en cuanto se publique la primera versión.

> [!NOTE]
> La aplicación empaquetada se ha compilado y comprobado en **macOS** (Apple Silicon). Las versiones de Windows y Linux las compila GitHub Actions y pasan los tests y una prueba de arranque automática, pero nadie las ha usado todavía en un equipo real. Si encuentras algún problema, escríbeme a [contact.raulesteveza@gmail.com](mailto:contact.raulesteveza@gmail.com).

- **macOS:** abre el `.dmg` y arrastra Controller2Api a Aplicaciones.
- **Windows:** descomprime el `.zip` y ejecuta `Controller2Api.exe` dentro de la carpeta `Controller2Api`.
- **Linux:** descomprime con `tar -xzf Controller2Api-Linux.tar.gz` (o `Controller2Api-Linux-ARM64.tar.gz`) y ejecuta `Controller2Api/Controller2Api`. En algunas distribuciones hace falta instalar `libxcb-cursor0`. La versión ARM64 necesita una distribución de 2024 o más nueva (glibc 2.39, como Ubuntu 24.04).

### Abrirla la primera vez

La aplicación no está firmada (firmarla requiere cuentas de pago de Apple y Microsoft), así que el sistema avisa la primera vez que se abre:

- **macOS** dice que no ha podido verificar que la app esté libre de software malicioso. Pulsa **Hecho**, ve a **Ajustes del Sistema → Privacidad y seguridad**, baja hasta **Seguridad** y pulsa **Abrir igualmente**. Solo hay que hacerlo una vez.
- **Windows** muestra "Windows protegió su PC". Pulsa **Más información** y después **Ejecutar de todas formas**.

El código es el de este repositorio y los archivos los compila GitHub Actions ([workflow](../.github/workflows/release-desktop.yml)).

## Diferencias con la versión web

- Funciona sin conexión: no hay enlaces a las otras herramientas.
- «Recordar en este equipo» guarda el trabajo en los ajustes de la aplicación, hasta que lo borres.
- **Guardar archivo**, **OpenAPI** y **Guardar .zip** preguntan dónde guardar; el proyecto completo se guarda en un `.zip`.
- Los paneles Modelos y Endpoints están uno al lado del otro y el panel Proyecto debajo; los separadores se pueden arrastrar.

## Ejecutar en local

Requisitos: Python 3.11 o posterior.

```bash
cd desktop
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
python -m pytest                   # tests (casos compartidos de shared/test-cases/)
ruff check .                       # análisis estático
python -m controller2api                 # abrir la aplicación
```

## Generar el ejecutable

```bash
pip install -e ".[build]"
pyinstaller packaging/controller2api.spec
dist/Controller2Api.app/Contents/MacOS/Controller2Api --smoke-test   # macOS; dist/Controller2Api/Controller2Api en los demás
```

El resultado queda en `dist/`: `Controller2Api.app` en macOS y una carpeta `Controller2Api` con el ejecutable en Windows y Linux. PyInstaller no compila para otros sistemas: cada uno se genera en su propio sistema operativo. `--smoke-test` abre la ventana, carga todos los ejemplos, escribe el proyecto de cada framework, lee un documento YAML y guarda un `.zip` y un proyecto, para comprobar que no falta nada en el paquete.

## Estructura

```
controller2api/
  core/          La misma lógica que web/src/core/, módulo a módulo: modelo, importadores, análisis, diseño,
                 validación, compatibilidad, OpenAPI, generadores, exportación y proyectos
  ui/            La ventana (PySide6): paneles de modelos, endpoints y proyecto, barra de proyecto, textos y tema
  workspace.py   Lectura de la entrada, como web/src/app/workspace.ts
  examples.py    Los ejemplos incluidos, los mismos que web/src/examples/
packaging/       Spec de PyInstaller, lanzador, prueba de arranque e iconos
tests/           Casos compartidos (llamadas, salidas, variantes), las combinaciones verificadas y la ventana
```

## Desarrollador

**Raul Estevez**

- [Web personal](https://raulesteveza.github.io/)
- [Perfil de LinkedIn](https://www.linkedin.com/in/raulesteveza/)

## Licencia

[MIT](../LICENSE)
