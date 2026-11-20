# Changelog

## 1.0.0

The first release.

### Added

- `ancestry(element, out)`: reads the space an element inherits from its ancestors, with their cumulative `zoom`, into a `Space`.
- `coordinates(element, out, above?)`: measures an element's border box into a `Box`.
- `projection(source, out, relativeTo?)`: projects a measured box's corners into the viewport, or into another box's local space, as a `Quad`.
- `localDelta(basis, dx, dy, out)`: converts a viewport delta into a `Space` or a `Box`, as a `Delta`.
- The storage types `Box`, `Space`, `Quad` and `Delta`.