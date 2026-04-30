# tools/pack

Local packaging control plane for Open Design.

The first active slice is mac-first and intentionally small:

- `tools-pack mac build --to app`
- `tools-pack mac start`
- `tools-pack mac stop`
- `tools-pack mac logs`

Release publishing, signing, installers, and Windows packaging are later phases.
