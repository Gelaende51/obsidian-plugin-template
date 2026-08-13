#!/bin/bash
# Refuses a commit that would leak a secret or ship a debugging build.
#
# Wired as a PreToolUse hook (see .claude/settings.json) and runnable by hand
# with `npm run preflight`. Both matter: the hook catches an agent, the script
# catches you.
#
# Every check here exists because the alternative is remembering, and the cost
# of forgetting once is not symmetric with the cost of the check.
set -u

fail=0
say() { printf '  %s\n' "$1"; }

# 1. The Obsidian debugging port. While it is open, any process on the machine
#    can drive the app with no authentication. A build developed against an
#    open port must never be what ships.
flags="$HOME/.config/obsidian/user-flags.conf"
if [ -f "$flags" ] && grep -qE '^[[:space:]]*--remote-debugging-port' "$flags"; then
	say "The Obsidian debugging port is ENABLED in $flags."
	say "Comment it out before committing."
	fail=1
fi

# 2. A credential file in the index. .gitignore should already prevent this;
#    the check exists for the case where someone used `git add -f`.
if git diff --cached --name-only 2>/dev/null | grep -qE '(^|/)personal\.md$'; then
	say "personal.md is staged. Unstage it: git restore --staged **/personal.md"
	fail=1
fi

# 3. A secret in the diff itself, wherever it came from. Deliberately crude —
#    a false positive costs one look, a false negative costs a rotation.
if git diff --cached -U0 2>/dev/null | grep -qiE '^\+.*(api[_-]?key|secret|password|passwd|token)[[:space:]]*[:=][[:space:]]*[^[:space:]"'"'"']{8,}'; then
	say "The staged diff looks like it contains a credential."
	say "Check it: git diff --cached | grep -iE 'key|secret|password|token'"
	fail=1
fi

if [ "$fail" -ne 0 ]; then
	echo "preflight: refusing." >&2
	exit 2
fi
exit 0
