# SpaceFox - design doc (draft 1, 2026-10-21)

On-rails, behind-the-ship space shooter in the spirit of the classic "fox pilot" rail shooters. Web app + mobile (GitHub Pages, mobile kit), single folder HTML5, Canvas 2D pseudo-3D, procedural chiptune audio, your art as sprites.

**IP stance:** we copy the *genre mechanics* (rail shooting, barrel-roll deflect, charge lock-on, branching route map, comm-chatter, wingmates in trouble). We do **not** copy names, characters, planets, layouts, music, voice samples or enemy designs. Everything below is original.

## 1. Cast (all names are proposals - veto freely)

| Role | Name | Notes |
| --- | --- | --- |
| Hero | **Captain Ember Vale** | Female fox, black-and-orange vest uniform (your main-character / bust art, 12 expressions) |
| Copilot | **Moss** | Goggled frog engineer (your frog art, 12 expressions): ship systems, hints, warnings, jokes |
| Wingmate 1 | **Juno** | Raccoon ace, cocky, fast, always getting chased |
| Wingmate 2 | **Bram** | Badger, heavy gunship pilot, deadpan |
| Squadron | **Cinder Squadron** | |
| Ship | **Firebrand** interceptor | Your ship art (rear view, banking frames, boost/shield/damage frames) |
| Villain | **Regent Umbra** and the **Gloom Armada** | Final boss is the crowned claw-hub "Crown Core" |
| Setting | **The Hearth Reach** (a sector of worlds) | |

Story in one paragraph: the Gloom Armada is strip-mining the Hearth Reach. Cinder Squadron fights from the outer canyon worlds in to the Regent's flagship. Short comm scenes (frog + fox portraits, text with a babble voice) before and during stages; no cutscenes.

## 2. Camera and rendering (pseudo-3D on rails)

- World coordinates (x, y, z). Player ship sits at fixed z near the camera and moves in x/y inside a play window; the world scrolls toward the camera along z.
- Perspective projection to 2D canvas: `scale = F / (F + z)`, objects drawn back-to-front, scaled sprites (your PNGs, downscaled), fog fades with depth.
- Terrain/set pieces are procedural: scrolling perspective strips for floors, walls and water, plus parallax backdrop layer (your canyon painting is Stage 1's sky). Stage-specific props (rock arches, asteroids, station struts, foundry pipes, gates) spawn from a per-stage **timeline script** (a list of `{z or time, spawn pattern}`), so every stage is data, not code.
- Ship banks with stick motion using the 12 ship frames (roll left/right, tilt, boost flame, shield glow, damaged wing, muzzle flash).
- Player lasers fly into depth; enemy shots (your magenta fireball) fly toward the camera and can be shot, dodged or **deflected**.
- Hit detection is an x/y/radius test when z ranges overlap (cheap, forgiving).
- Adaptive resolution + 60 fps cap from the other games (SpaceBricks pipeline: bloom pass, quality ema).

## 3. Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Steer | WASD / arrows (rebindable in Settings) | Floating stick, left thumb |
| Fire / charge lock-on | Hold Space (tap = single shot, hold = charge) | FIRE button (hold) |
| Barrel roll | `Q` / `E`, or double-tap left/right | ROLL button (rolls toward stick direction) |
| Bomb | `B` | BOMB button |
| Boost / brake | `Shift` / `Ctrl` (or `Alt`) | BOOST and BRAKE buttons |
| Pause | `P` / `Esc` | Pause button |

**No U-turn / somersault** (your call). Key rebinding in Settings from day one (reusing the SpaceBert system).

## 4. Core mechanics

- **Shield bar + retries.** Shield drains on hits; 0 = lose a retry (3 to start, 1UP from score). Continues on Easy/Normal.
- **Laser tiers:** single -> twin -> hyper (pickups and shop). Your twin-beam art is the player shot.
- **Charge lock-on:** hold fire, the reticle sweeps targets and paints up to 6 locks (more with shop upgrade); release = homing volley. Bonus points for multi-lock kills and chain explosions.
- **Barrel roll deflect:** ~0.5 s roll, brief i-frames, reflects enemy shots back along their path (can kill the shooter). Cooldown short; shop upgrade lowers it. Rolling into a wall/obstacle does not save you.
- **Bombs:** limited stock (3, shop up to 6), screen-clearing blast of nearby depth range.
- **Boost / brake:** boost burns a meter for speed (and a score-per-second bonus), brake slows the scroll for precision. Meter refills over time and from the orange chevron pickup.
- **All-range arenas:** Stages 4 and 6 and boss duels open into free flight: ship turns (not locked to rails), radar ring, enemy fighters chase, your frog calls out "bogey behind you". Camera follows behind the ship (still pseudo-3D). Stick turns, boost/brake as above. Since you disliked the U-turn, the camera auto-swings when you steer hard; no flip button.
- **Wingmate rescue:** at set points Juno/Bram get tailed by 2-4 enemies; shoot them off before their shield hits zero. Saved wingmates give small hint callouts and a bonus; abandoned ones retreat and the stage score loses the rescue medal.
- **Medals per stage:** Bronze/Silver/Gold by kill count and objective (hidden ones: free a wingmate, find a branch trigger). Gold on a stage unlocks the hard branch next time.

## 4b. Pickups (your art)

| Sprite | Pickup |
| --- | --- |
| Gold star | Credits (banked for the shop, also score) |
| Blue hex shield | Overshield (extra shield bar on top, decays when full) |
| Orange chevron canister | Boost meter refill + brief speed |
| Green wrench canister | Shield repair |
| (generated) | Bomb, laser upgrade, 1UP |

## 5. Enemies (your 6 enemy sprites + procedural extras)

| Enemy | Role |
| --- | --- |
| Red spike fighter | Swarm flyer, dives past you, crosses lanes |
| Purple twin-pod | Weaves side-to-side and fires pairs of shots (deflect bait) |
| Copper quad-pod gunship | Armored, slow, 4 gun ports, needs charge shots |
| Blue crystal | Spinning crystal that releases shards on death, fires aimed shots |
| Olive twin-cannon tank | Ground turret on canyon floor/foundry; slow big shells |
| Brown spider-orb mine bot | Drifts into you, explodes; shoot early |

Procedural extras per stage: asteroids, mines, laser gates, wall turrets, kamikaze drones, carrier fighters, rival ace.

## 6. Bosses (your 3 concept images + others)

| Boss | Stage | Idea |
| --- | --- | --- |
| **Bulwark** (red armored crab fortress) | 1 Ember Canyon | Stationary crab: claw slams, mortar volleys, exposed furnace core opens after claws break. Teaches lock-on and deflect |
| **Gatewyrm** (armored serpent with gold rings) | 5 | Coils through gold ring gates; shoot ring segments, then the head when it lunges; ring shockwaves |
| **Crown Core** (claw-hub, crown, magenta core) | 7 final | Phased: rotate claw arms, shield rings, arena phase where the core swings its arms; crown breaks last |
| Rockjaw / Scarlet Talon (rival ace, all-range duel) / Foundry Warden / Carrier "Hollow Queen" | 2a / 4 / 3a / 6 | Procedural-art bosses in the same style, simpler patterns |

## 7. Campaign: branching route map (7 stages per run, 9 unique)

```
1 Ember Canyon ──┬─> 2a Drift Belt (easy)      ──┬─> 3a Foundry Spine ──┐
                 └─> 2b Glasswater Reach (hard) ─┴─> 3b Ghost Station ───┤
                                                                         v
   4 Nebula Arena (all-range) -> 5 Gatewyrm Run -> 6 Regent's Fleet (all-range) -> 7 Crown Core
```

| Stage | Theme | Notable |
| --- | --- | --- |
| 1 Ember Canyon | Your canyon + ringed planet painting | Tutorial, Bulwark boss |
| 2a Drift Belt | Asteroid field | Easy route, rockjaw boss, wingmate rescue |
| 2b Glasswater Reach | River/water-skimming through arches | Hard route, bigger credit/medal payout, enemy tanks and waterfalls |
| 3a Foundry Spine | Molten pipes, wall turrets | Gates and crushers, Foundry Warden |
| 3b Ghost Station | Interior corridors and laser gates | Tight pseudo-3D tunnel |
| 4 Nebula Arena | All-range dogfight | Scarlet Talon rival ace |
| 5 Gatewyrm Run | Gold ring gates in a warp lane | Gatewyrm |
| 6 Regent's Fleet | All-range fleet assault | Carrier boss |
| 7 Crown Core | Final fortress | Crown Core (3 phases) |

Stages are about 2-3 minutes each, plus boss. Easy/Normal/Hard select changes enemy shot rate/speed, shield size and continues.

## 8. Upgrades and the hangar (shop)

Credits (stars + score) bank per run. Between stages a **hangar** screen (Fox bust + Moss comment) sells permanent-for-the-run upgrades: laser tier, shield capacity, bomb capacity, lock-on count, roll cooldown, boost meter, magnet radius. Prices scale. Cheap "restock" items (bombs, repair) too. Hard-route clears give bonus credits.

## 9. Comms (copilot and hero portraits)

- Portrait boxes slide in at screen top: frog (your 12 expressions) / fox (your 12 busts) / Juno / Bram (drawn procedural portraits in the same style).
- Text typed out with a short **babble voice** (WebAudio blips, pitch per speaker: Moss croaky mid, Vale smooth, Juno bright, Bram low).
- Event-driven lines: stage intro, "bogey behind", wingmate in trouble, deflect kill, low shield, boss phase change, victory/defeat. Each line tags an expression (e.g., frog "shocked" on boss reveal).
- Optional "Comms: full / minimal / off" setting.

## 10. Audio

All procedural like the rest of the series: layered chiptune loops per stage (tempo and key change), boss themes, engine hum that shifts with boost/brake, laser/charge/lock-on blips, explosions, roll whoosh.

## 11. Screens and settings

Title (Firebrand + fox portrait), difficulty, **route map** (shows the fork, medals, hard branch unlock), stage briefing (Moss), hangar, pause, results (medals), game over / continue, high scores (local). Settings: volumes, bloom, shake, reduced motion, comms level, key rebinding.

## 12. Technical plan

- Folder `SpaceFox/` (own repo `nbwillcox/SpaceFox`, Pages), `assets/` holds downscaled sprites (the source PNGs are 1-3 MB each; I cut each sheet into atlas PNGs/WebP at roughly 256-512 px per sprite, ~1 MB total). A small node script `tools/cut_sprites.js` or Python does the cutting so it's repeatable.
- Files: `world.js` (projection, entities), `stages.js` (timeline data), `enemies.js`, `bosses.js`, `player.js`, `combat.js` (shots, lock-on, deflect), `arena.js` (all-range mode), `comms.js`, `shop.js`, `map.js`, `render.js`, `hud.js`, `input.js`, `audio.js`, `ui.js`, plus kit files.
- Test tools like SpaceMarble: headless bot autopilot per stage, fuzz for exceptions, URL flags (`?stage=`, `?god=1`, `?bot=1`, `?route=`, `?diff=`).
- Mobile: floating stick + FIRE/ROLL/BOMB/BOOST/BRAKE (kit), landscape.

## 13. Milestones (each ends with a pushed, playable build)

1. **Flight slice:** projection, ship with banking frames, lasers, a canyon stage with enemies and the HUD.
2. **Combat depth:** charge lock-on, barrel-roll deflect, bombs, boost/brake, pickups, shield/retries.
3. **Bulwark + comms:** boss framework, Moss/Vale portraits, babble voice, Stage 1 complete.
4. **Campaign:** stages 2a-7, route map, hangar shop, medals, difficulty.
5. **All-range arenas and remaining bosses.**
6. **Polish:** audio pass, mobile controls tuning, key rebinding, balance, README, memory notes.

## 14. Open questions for you

1. Do the names in section 1 work, or do you want any changed (hero, frog, wingmates, villain, ship)?
2. Landscape only on phones, or also support portrait?
3. Anything in this doc you want cut or added before I start Milestone 1?
