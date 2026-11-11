# Controller2Api · Desktop

Desktop version of Controller2Api: Python + PySide6.

It does the same as the web version, on your computer and without a browser: it passes the same test cases from [`shared/test-cases/`](../shared/README.md), proposes the same endpoints and writes exactly the same project files for every framework and option.

What the tool does and its philosophy are in the [main README](../README_en.md).

## Download

| System | File |
|---|---|
| macOS (Apple Silicon) | [Controller2Api-macOS.dmg](https://github.com/RaulEstevezA/Controller2Api/releases/latest/download/Controller2Api-macOS.dmg) |
| Windows (x64) | [Controller2Api-Windows.zip](https://github.com/RaulEstevezA/Controller2Api/releases/latest/download/Controller2Api-Windows.zip) |
| Windows (ARM64) | [Controller2Api-Windows-ARM64.zip](https://github.com/RaulEstevezA/Controller2Api/releases/latest/download/Controller2Api-Windows-ARM64.zip) |
| Linux (x64) | [Controller2Api-Linux.tar.gz](https://github.com/RaulEstevezA/Controller2Api/releases/latest/download/Controller2Api-Linux.tar.gz) |
| Linux (ARM64, Ubuntu 24.04 or newer) | [Controller2Api-Linux-ARM64.tar.gz](https://github.com/RaulEstevezA/Controller2Api/releases/latest/download/Controller2Api-Linux-ARM64.tar.gz) |

Every version is in [Releases](https://github.com/RaulEstevezA/Controller2Api/releases). The links work once the first version is released.

> [!NOTE]
> The packaged app has been built and checked on **macOS** (Apple Silicon). The Windows and Linux builds are compiled by GitHub Actions and pass the tests and an automatic start-up check, but nobody has used them on a real computer yet. If you find a problem, write to [contact.raulesteveza@gmail.com](mailto:contact.raulesteveza@gmail.com).

- **macOS:** open the `.dmg` and drag Controller2Api to Applications.
- **Windows:** unzip the `.zip` and run `Controller2Api.exe` inside the `Controller2Api` folder.
- **Linux:** extract with `tar -xzf Controller2Api-Linux.tar.gz` (or `Controller2Api-Linux-ARM64.tar.gz`) and run `Controller2Api/Controller2Api`. Some distributions need `libxcb-cursor0`. The ARM64 version needs a 2024 or newer distribution (glibc 2.39, like Ubuntu 24.04).

### Opening it the first time

The app is not signed (signing requires paid Apple and Microsoft accounts), so the system shows a warning the first time it is opened:

- **macOS** says it could not verify that the app is free of malware. Click **Done**, go to **System Settings → Privacy & Security**, scroll down to **Security** and click **Open Anyway**. This is only needed once.
- **Windows** shows "Windows protected your PC". Click **More info** and then **Run anyway**.

The code is the one in this repository, and the files are built by GitHub Actions ([workflow](../.github/workflows/release-desktop.yml)).

## Differences with the web version

- It works without going online: there are no links to the other tools.
- "Remember on this computer" keeps the work in the application's settings, until you delete it.
- **Save file**, **OpenAPI** and **Save .zip** ask where to save; the whole project is saved as a `.zip`.
- The Models and Endpoints panes are side by side and the Project pane is under them; the dividers between them can be dragged.

## Run locally

Requirements: Python 3.11 or newer.

```bash
cd desktop
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
python -m pytest                   # tests (shared cases from shared/test-cases/)
ruff check .                       # static analysis
python -m controller2api                 # run the application
```

## Build the executable

```bash
pip install -e ".[build]"
pyinstaller packaging/controller2api.spec
dist/Controller2Api.app/Contents/MacOS/Controller2Api --smoke-test   # macOS; dist/Controller2Api/Controller2Api elsewhere
```

The result is in `dist/`: `Controller2Api.app` on macOS and a `Controller2Api` folder with the executable on Windows and Linux. PyInstaller does not cross-compile: each system is built on its own operating system. `--smoke-test` opens the window, loads every example, writes the project of every framework, reads a YAML document and saves a `.zip` and a project, to check that nothing was left out of the package.

## Structure

```
controller2api/
  core/          The same logic as web/src/core/, module by module: model, importers, analysis, design, validation,
                 compatibility, OpenAPI, generators, export and projects
  ui/            The window (PySide6): models, endpoints and project panes, project bar, texts and theme
  workspace.py   Reading the input, as web/src/app/workspace.ts
  examples.py    The built-in examples, the same as web/src/examples/
packaging/       PyInstaller spec, launcher, smoke test and icons
tests/           Shared cases (calls, outputs, variants), the verified stacks and the window
```

## Developer

**Raul Estevez**

- [Personal Website](https://raulesteveza.github.io/)
- [LinkedIn Profile](https://www.linkedin.com/in/raulesteveza/)

## License

[MIT](../LICENSE)
