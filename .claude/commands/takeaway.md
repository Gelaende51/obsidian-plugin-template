---
description: Record a finding in the right place, in the house style
---

Record this finding: $ARGUMENTS

First decide where it belongs, by asking what would make it false:

- **A future Obsidian release could** → it is lore, not a project takeaway. It belongs
  in the shared `obsidian-lore` repository (`internals.md`, `automation.md`,
  `architecture.md`, `design.md` or `ecosystem.md`), stamped with the installed
  Obsidian version.
- **Only a change to this plugin could** → `.dev/takeaways.md` here.
- **Nothing about Obsidian could — it is about how to work** → it is a method rule, not
  a finding. Say so rather than filing it.

Then write it in the house style (see STYLE.md): what is true, how it shows up, what to
do instead. Keep the symptom — half the value is that a reader arrives with a symptom
and no idea which layer is lying to them. Do not write the story of how you found it.
