// Test render helper, backed by the @solid-recharts/testing-library workspace
// package (a vendored Solid 2.0 port of @solidjs/testing-library — the official
// 0.8.x still targets Solid 1.x via the removed `solid-js/web` path). Specs
// import `render`, `cleanup`, and the @testing-library/dom query/event helpers
// (screen, fireEvent, waitFor, …) from here so there's a single swap point for
// when the package is published to npm.
export * from "@solid-recharts/testing-library";
