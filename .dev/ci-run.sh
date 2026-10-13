#!/bin/bash
# One suite against a sandboxed Obsidian (obsidian-toolkit's run-suite): the
# launcher downloads Obsidian, copies .dev/test-vault, installs this build and
# the neighbours in devkit.config.json, runs .dev/<suite>.mjs.
#
#   .dev/ci-run.sh test-smoke
#   OBSIDIAN_VERSION=earliest .dev/ci-run.sh test-smoke   # the manifest's minAppVersion
cd "$(dirname "$0")/.."
exec bash node_modules/obsidian-toolkit/bin/run-suite.sh "$@"
