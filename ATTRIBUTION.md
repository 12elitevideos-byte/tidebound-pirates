# Attribution

The low-poly ships, islands, docks, buildings, water shaders, sounds, and interface in this project were created in code for Tidebound Pirates. There are no third-party image, model, texture, or audio downloads.

The frontend bundles Three.js, colyseus.js, Supabase's JavaScript libraries, and their supporting libraries. The server uses Colyseus, Express, cors, and Supabase. Dependency source licenses are included in `licenses/`; installed versions and package sources are recorded in `package-lock.json`.

PGlite is used only for local database tests. It is not the production database and is not shipped in the browser build. The production database is your own Supabase Postgres project.

The interface uses system font fallbacks and does not require a font download.
