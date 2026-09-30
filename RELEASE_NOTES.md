# Release preparation: proposed 0.4.0

Status: prepared for review. Package versions remain 0.3.0; no release commit, tag, publish or merge has been performed.

## Changes

- Address [issue #42](https://github.com/sailscastshq/pellicule/issues/42): align the optional Rsbuild and Vue plugin peers with Rsbuild 2.
- Fix macro-transform ordering that prevented Rsbuild 2's Vue loader from finding its compiler rule.
- Honor explicit Rsbuild config filenames, loading configuration through the same project-resolved Rsbuild installation used for rendering.
- Add a real Rsbuild compilation regression test covering Vue, macro configuration, SVG imports and custom source definitions.
- Add a reproducible 12-second Vue demo rendered through the updated adapter.

## Migration

This drops Rsbuild 1 support, so recommend 0.4.0 rather than a patch release for this pre-1.0 package. Update both optional dependencies in Rsbuild and Shipwright projects:

```bash
npm install -D @rsbuild/core@^2.2.5 @rsbuild/plugin-vue@^2.0.1
```

Rsbuild 2 requires Node.js `^20.19.0 || >=22.12.0`. Coordinate the Shipwright/Rsbuild upgrade with the host app before upgrading Pellicule. The Vite adapter and standalone Vite path do not change. No Tailwind integration is introduced in this batch.

## Validation

Required checks are `npm ci`, `npm test`, and `npm run typecheck`. Render the Rsbuild demo as documented in `examples/rsbuild/README.md`; inspect its actual decoded frames and metadata before release. There are no separate lint or production-build scripts in this repository; rendering performs a real Vue bundle compilation.

## Release gate

After review and explicit approval, merge the draft PR, rerun CI, bump the package/lockfile version on main, and tag/publish through the maintainer release workflow. Decide whether the unchanged create-pellicule package should receive a matching version; its template currently pins Pellicule to `^0.3.0` and would need `^0.4.0` if the scaffold should adopt this release.
