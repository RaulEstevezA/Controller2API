"""Entry point: `python -m controller2api` or the `controller2api` command."""


def main() -> None:
    from .ui.app import run

    raise SystemExit(run())


if __name__ == "__main__":
    main()
