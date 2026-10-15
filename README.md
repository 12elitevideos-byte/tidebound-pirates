# Tidebound Pirates — Battle Fleet

Ship-only pirate battles with a light pastel lobby, 3D ships, bot opponents, six modes, permanent upgrades and rare cosmetic loot. The original adventure source remains in `src/` and `shared/` for reference; the active frontend is `battle/main.js`.

## Play immediately
Open `Tidebound-Pirates.html` in a desktop browser with WebGL. Open **Set sail → Solo → Choose a game mode → Launch match**. No account or installation is needed. Guest inventory, gold, upgrades and stats persist in this browser. W/S sail, A/D steer, aim and hold left click to fire. Escape pauses guest solo. Leaving early does not grant rewards. Guest saves and cloud accounts are separate.

## Menu flow

The main menu opens distinct screens for Play, Shipyard, Equipment, Customization, Inventory and Profile. Play opens a connection choice (Matchmaking, Solo or Private), then a separate mode screen, then a separate match confirmation screen. Bots are not a connection or mode choice: the server fills remaining slots with AI at launch.

## Modes
- Free-for-all: first to 12 sinks, or highest sinks at the four-minute limit.
- Fleet battle: two teams; first to 20 sinks, or highest score at the limit.
- Treasure capture: bring enemy treasure home while your own treasure is home; first to three captures.
- King of the reef: hold the center without enemies contesting it; first to 90 control points.
- Last ship afloat: one life with a shrinking storm. At the time limit the surviving ship with most hull wins.
- Kraken waves: cooperative survival against increasingly strong AI fleets for eight minutes. Completing the timer grants the team victory. This mode uses respawns.

Modes other than survival last up to four minutes. Multiplayer waits eight seconds for other captains and fills remaining slots with AI. The current arena is open water with a center objective and fleet bases; there are no walking sections or island quests. Bot behavior follows the relevant objectives.

## Progression
Three hull types are available from the start. The Equipment screen offers named cannons, hull armor and rigging, each with its own stats and tradeoffs. Unlock an item once using earned gold, then equip or switch it freely. Ironjaw Cannons hit harder but reload slower; Stormpiercer Cannons reload faster. Ironclad Plating increases hull at a speed cost; Windrunner Sails increase speed at a turning cost. Equipment applies in all modes; ranked matchmaking and normalized competitive loadouts are not implemented. Old tier upgrades convert to named equipment, and their gold costs are refunded once when progression next saves.

Completed matches grant 100 gold, 25 per sink and 150 extra for a victory, plus XP and one cosmetic roll. Duplicate cosmetics grant 75 gold. Drops: Common 55%, Uncommon 25%, Rare 15%, Legendary 4.5%, Mythic 0.5% (1/200 per roll). These are independent rolls, with no guaranteed drop or paid loot boxes. Items change the rendered hull or sails.

## AI balance

Bots sail at 55–68% of normal speed, deal 70% damage and reload in 1.5–2.1 seconds. They aim imperfectly and fire only within 680 units. Skirmishers keep their distance, bruisers are slower and tougher, and scouts move faster with weaker hulls. No more than two bots target any human at once; in free-for-all they also target other bots.

## Combat feedback

Standard cannons reload in 0.7 seconds; named equipment modifies the delay. Hold left click for sustained fire. Bots use different game hulls, sail patterns, flags and ship sizes. Battles include layered cannon blasts, impact and sinking sounds, muzzle smoke, recoil, hull flashes, debris, sinking motion and wakes. Use the Sound on/off button during a match. An original looping lobby theme starts after your first button click. Menu buttons have click and hover sounds. Music stops during matches and returns in the lobby; Music and Sounds buttons control it. No external audio downloads are required.

## Development
Use Node 22 or newer:

```sh
npm ci
npm run dev
npm test
npm run build
```

The build produces `dist/` and the single-file browser build. Tests cover combat, bot simulations, scoring, drop accounting, ownership validation, real two-client multiplayer joins and match reward persistence. DOM workflow tests cover menu selection, upgrades, launching, pause, match completion and saved loot, with GPU drawing replaced by a stub.

## Enable saved accounts and multiplayer
The downloadable build has no live backend configured. To enable it:

1. Create a Supabase project and execute `database/001_tidebound.sql` in its SQL editor. Account JSON can store the battle progression without another migration.
2. Copy `server/.env.example` to `server/.env`. Set `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY`. Set `ALLOWED_ORIGINS` to the exact frontend origin.
3. Start the backend with `npm run server`, or deploy the included Dockerfile on a host that supports persistent WebSocket connections. Use HTTPS/WSS in production.
4. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_GAME_SERVER_URL` to your real values. Rebuild the frontend.
5. Publish `dist/` to GitHub Pages. The included workflow uses repository variables with those three VITE names. GitHub Pages only hosts frontend files; the Node server runs separately.
6. Create an account inside the game. Confirm its email if required, then sign in. Cloud solo, public multiplayer, and private matches now connect to the server. Create a private match and share its displayed room code before the eight-second launch timer; a friend enters that code in Private match.

Never put the Supabase service role key in a VITE variable, public HTML, or GitHub repository. Only the public/publishable key belongs in the frontend. Online inventory and rewards are computed by the authoritative server and committed using the existing database's atomic revision and operation checks. Guest progress cannot be imported into cloud accounts.

## Current limits
This is a playable first battle build. No production backend has been deployed from this workspace. Production Supabase credentials, real email delivery, public internet multiplayer, and GPU visual appearance have not been verified here. A match runs on one Node process; a server restart interrupts active matches. No reconnect, ranked matchmaking, touch controls, trading, parties, dedicated audio settings, or automated reward retry UI yet. Private rooms require a signed-in captain and the room code. Existing adventure account values remain preserved; battle progression uses its own `battle` field.
