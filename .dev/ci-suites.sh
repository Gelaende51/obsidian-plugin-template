#!/bin/bash
# Every suite in $SUITES on every Obsidian version in $VERSIONS through
# ci-run.sh (electron-template's electron-suites: a virtual display where
# there is none; 0 passed, 2 skipped cases as a warning, else failed).
cd "$(dirname "$0")/.."
RUN_SUITE=.dev/ci-run.sh VERSION_VAR=OBSIDIAN_VERSION APP_NAME=Obsidian SUITE_LOG='obsidian-%s.log' \
	exec bash node_modules/electron-template/bin/electron-suites.sh
