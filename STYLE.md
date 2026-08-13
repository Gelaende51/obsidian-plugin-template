# House style

How things are written here — commit messages, comments, documentation. Each rule is
paired with a real example, because a style guide without examples is a preference list.

## Commit messages

**Problem first, mechanism second, consequence third.** A subject line says what changed
about the *behaviour*, not which files moved.

> Stop consulting focus while a rename session is open
>
> The previous attempt widened the timing window — look several times over
> ~200ms rather than once — and that was the wrong shape of fix. It passed
> every automated check here and the bug survived in real use, because where
> focus lands while the row rebuilds is not ours to predict.

**No bullet-point changelogs.** A list of edits is what `git diff` is for. Prose forces
you to say why they belong in one commit.

**Say what you deliberately did not do.** A known issue left unfixed on purpose is
information; discovering it later is a bug report.

> Deliberately left: the settings tab keeps `display()`. The declarative API
> is 1.13.0+, and adopting it means either two descriptions of the same
> settings to keep in step or a floor five minor versions above what the code
> needs, to fix two warnings.

## Code comments

**Explain why, and why not the obvious alternative.** The reader can see what the code
does. What they cannot see is the option you rejected.

> ```ts
> // process, not modify: this fires from a debounce, so it races anything
> // else writing the same note (sync, another pane). The atomic
> // read-modify-write keeps the loser from being silently overwritten by a
> // buffer captured before the other change landed.
> await this.app.vault.process(target, () => text);
> ```

**Comment the constraint, not the syntax.** `min-height: 0` needs a comment; a `for`
loop does not.

**A comment that outlives its reason is worse than none.** If you delete the reason,
delete the comment.

## Documentation

**Second person, present tense, no marketing register.** "Click the folder to open it",
never "Users can conveniently click folders".

**Tables for anything enumerable** — colours and what they mean, keys and what they do,
settings and their effects. Prose for anything with a reason attached.

**Lead with the symptom in troubleshooting notes.** A reader arrives with a symptom and
no idea which layer is lying to them.

**Say what it cannot do.** The limitation section is the one that prevents a bug report.

## Findings and lore

**What is true · how it shows up · what to do instead.** Not the story of how you found
it — that belongs in the commit message, if anywhere.

Where a finding belongs is decided by one question: *could a future Obsidian release
make this false?* Yes → the shared lore. No, but a change to this plugin could →
`.dev/takeaways.md`. Neither → it is a method rule, not a finding.

## Naming

- CSS classes and `data-` attributes carry the plugin id as a prefix. You are styling
  inside someone else's app.
- String keys are `areaThingRole` — `settingGreetingName`, `noticeDefaultGreeting`.
  Grouping by area is what makes a missing one obvious in a locale table.
- **Never translate a plugin's name**, yours or anyone else's. A name is a proper noun;
  only the grammar around it is localised.
