# Obsidian plugins across platforms

Obsidian-specific findings from making Lure work across systems: CI around obsidian-launcher, Obsidian's beta, BRAT and the community directory (2026-10). The general half is development-template's `docs/portability-and-ci.md`.

## obsidian-launcher (CI and local runs)
- `setupVault({ vault, copy, plugins })` and `setupConfigDir({ appVersion,
  installerVersion, vault })` prepare a run for an Obsidian the launcher did not
  download (Flatpak, Snap, a distro's package, Wine, FreeBSD's Electron): start that
  binary with `--user-data-dir=<configDir>`.
- It reads `process.platform` when imported: to use it on FreeBSD, define
  `process.platform` before a dynamic `import()`. `classic-level` has no FreeBSD build
  (node-gyp it).
- CLI plugin specs: `id:<id>[@version]`, `repo:<owner/name>[@tag]`, a path. A
  neighbour's pre-release: `repo:owner/name@<prerelease tag>`.
- Versions: `latest`, `earliest` (the manifest's minAppVersion), `latest-beta`. The beta
  list is public (`isBeta` in wdio-obsidian-service's obsidian-versions.json); only the
  download needs an Insider account (`OBSIDIAN_EMAIL`/`OBSIDIAN_PASSWORD`, no 2FA — it
  only prompts interactively). Its sign-in sends `Origin: app://obsidian.md`; a probe
  without that header gets the same "Login failed" as a wrong password.
- Early-access results must not be published: in a public repository, record only the
  beta's version on CI and test it on the maintainer's machine.

## Obsidian itself
- Its file watcher misses events on some systems (FreeBSD): after making or removing a
  file outside the vault API, `adapter.reconcileFile(adapter.getRealPath(p), p)` — the
  call its own watcher makes — indexes or drops it.
- `enablePlugin` does not await an async `onload`: wait for `plugin._loaded` before
  driving it from tests.
- `new Notice(text, 0)` stays until `hide()`; default notices close after ~5 s.
- Windows draws another plugin's view header noticeably later than Linux does; tests
  must wait for the header, not for a fixed time.
- `Keymap.isModEvent` turns Ctrl/Cmd (+Alt) and middle clicks into a pane type for mouse
  and keyboard alike; chords of your own (Alt, Shift, Ctrl+Shift) must accept mouse
  events too, or a click with the chord silently does the plain action.

## Electron inside Obsidian
- `shell.trashItem` rejects with only "Failed to move item to trash" where there is no
  trash (containers, tmpfs, some sandboxes) and can take long on slow machines.
- Obsidian's app (`resources/app.asar` from the Linux tarball) runs on another Electron:
  the route for distro Electrons, FreeBSD, Alpine, and a next-Electron canary.

## Distribution and review
- BRAT installs the newest release *including pre-releases* by semver; a frozen install
  pins one. Obsidian's own updater compares more strictly and will not offer `1.6.2` to
  someone on `1.6.2-deps.1` — they update through BRAT until `1.6.3`.
- The community directory and Obsidian's installer follow `manifest.json` on the default
  branch; pre-releases on other tags do not touch them. Keep the release workflow's tag
  filter strict (`[0-9]+.[0-9]+.[0-9]+`) so such tags cannot start a release.
- The directory's *preview* scan ("Review branch") covers source, CSS and dependencies
  only. Behaviour findings appear only in a real release's review — e.g. any
  `child_process` use is a Warning ("Shell Execution … full control over the system").
  Decide on such APIs before releasing, not after.

## Translations of generated figures
- Figures that change every release (usage statistics) belong in per-language
  templates rendered from the same numbers, not in a translation pass. Fit templates by
  finding each figure in the existing translations under every number style (digits,
  decimal mark, grouping) and keep one only if it renders the line back exactly.
- Intl covers most of it; keep exceptions as data: Japanese/Korean 万/億 and Chinese
  万/亿 units, Arabic's two month names, Sanskrit spellings, Catalan elision (de/d',
  el/l'), French "1er", Khmer's README code `kh` (Intl: `km`).
- Machine-translation jobs sometimes append commentary ("Wait — …") or a second
  attempt: validate strictly (structure, placeholders, counts) and take the checked
  part, never the raw answer.
