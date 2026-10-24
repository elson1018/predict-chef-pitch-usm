# PreDict-Chef Rive Feasibility Test Log

**Status:** PASS  
**Timestamp:** 2026-10-24 17:31:30 +08:00  
**Elapsed Time:** ~21 minutes (budget: 60 minutes max)  
**Feasibility Gate Outcome:** PASSED — Eligible to proceed with full canteen scene design.

---

## 1. Tooling & Dependencies Installed

| Component | Version | Installation Method / Route | Status |
|---|---|---|---|
| **Rive CLI** | 1.7.0 (windows-x64) | Official PowerShell script: `irm https://releases.rive.app/cli/install.ps1 \| iex` | Verified (`rive doctor` passed) |
| **@rive-app/react-webgl2** | 4.37.1 | `npm install @rive-app/react-webgl2` | Verified (React 19 peer-compat) |
| **React** | 19.3.1 | Existing workspace dependency | Preserved |
| **Vite** | 8.3.5 | Existing workspace build tool | Preserved |
| **oxlint** | 1.88.0 | Existing workspace linter | Preserved |

### `rive doctor` Diagnostic Output:
- `ok version`: rive 1.7.0, installed at `C:\Users\gooyo\.rive`
- `ok update`: up to date (1.7.0)
- `warn auth`: Not logged in (prod) — `--publish` and `--rev` need session; local `--once` builds work offline without account
- `ok live-link`: port 9640 available for `--serve`
- `ok project`: verified inside `rive/feasibility`
- `ok wamrc`: ready

---

## 2. Authored Rive Scene & Exported Asset

- **Project Path:** `rive/feasibility`
- **Markup File:** `rive/feasibility/scene.rml`
- **Asset Output:** `rive/feasibility/build/feasibility.riv` (3,753 bytes)
- **Public Location:** `public/feasibility.riv` (copied to `dist/feasibility.riv` on production build)
- **Visual Design:**
  - **Chef Cooking Pot:** Terracotta/crimson enameled body (`#C0392B`), silver metallic collar rim (`#BDC3C7`), simmered broth surface (`#F39C12`), dual dark slate handles (`#3D4554`), counter and burner base with flame glow.
  - **Looping Steam:** 3 phased steam puffs (`SteamPuff1`, `SteamPuff2`, `SteamPuff3`) rising vertically, expanding in scale and fading in/out over a 120-frame seamless loop in `SteamLayer`.
  - **Rain System:** 11 angled cyan/blue raindrops (`#5DADE2`, `#3498DB`, `#85C1E9`) falling from a stylized cloud banner.
- **Data Binding Architecture:**
  - **ViewModel:** `FeasibilityVM` (id `0:40`)
  - **Property:** `isRaining` (Boolean, id `0:45`)
  - **Default Instance:** `Default` (id `0:41`, initial `propertyValue="false"`)
  - **State Machine:** `State Machine 1` (id `0:7`)
    - Layer 1 (`SteamLayer`): Plays `SteamLoop` continuously from `EntryState`.
    - Layer 2 (`RainLayer`): Controlled by `TransitionViewModelCondition` reading `isRaining` via `DataBindContext` (propertyKey `634` on `BindablePropertyBoolean`).
    - `RainOffState` -> `RainOnState` on `isRaining == true` (20-frame crossfade).
    - `RainOnState` -> `RainOffState` on `isRaining == false` (20-frame crossfade).
  - **Script-Free:** Contains no Luau scripts, avoiding CDN/runtime web signing requirements.

---

## 3. Integration & Changed Files

| File | Nature of Change |
|---|---|
| `rive/feasibility/scene.rml` | Authored vector pot, looping steam, rain system, and ViewModel boolean binding. |
| `rive/feasibility/rive.yaml` | Rive CLI configuration for feasibility project. |
| `public/feasibility.riv` | Compiled genuine Rive binary for web runtime delivery. |
| `src/RiveFeasibility.jsx` | Isolated test harness component using `@rive-app/react-webgl2` (`useRive`, `useViewModelInstanceBoolean`), rain toggle button, 10x auto-toggle runner, and diagnostics. |
| `src/App.jsx` | Added `Rive Feasibility` workspace navigation route (`#Rive Feasibility`) while strictly preserving all existing pages (`Overview`, `Smart Prep Sheet`, `Demand Insights`, `Impact Dashboard`), calculations, overrides, and CSV export. |
| `package.json` | Added `@rive-app/react-webgl2` dependency. |

---

## 4. Verification & Browser Test Results

| Check Item | Requirement | Observed Result | Status |
|---|---|---|---|
| **1. Steam Animation** | Steam visibly moves via Rive runtime | Puffs rise, expand, and fade continuously in WebGL2 canvas | **PASS** |
| **2. Rain Toggle 10x** | Website button toggles rain on/off 10 times | Toggled 10+ times; state switched cleanly between TRUE and FALSE with each click; toggle count reached 11 | **PASS** |
| **3. Asset Reload / Refresh** | Refresh reloads the asset without error | Page reloaded at `http://localhost:5173/#Rive%20Feasibility`; canvas rendered immediately with status "Loaded and active" | **PASS** |
| **4. Production Build & Preview** | Production preview plays and toggles correctly | `npm run build` succeeded; `npx vite preview --port 4173` tested at `http://localhost:4173/#Rive%20Feasibility`; steam animated, 10x toggle succeeded | **PASS** |
| **5. Console Errors** | No unresolved loading, binding or runtime errors | Inspected console logs in both dev (5173) and preview (4173); 0 errors, log confirmed: `[RiveFeasibility] /feasibility.riv loaded successfully` | **PASS** |
| **6. Splash Screen / Watermark** | Observe and report any splash screen | None observed. Script-free local `.riv` builds render completely clean without watermark or splash | **PASS** |
| **7. Existing Behavior** | Dashboard functionality accessible | All 4 original pages, scenario switcher, buffer range, overrides, CSV export, and impact stats fully accessible | **PASS** |

### Screenshots Captured:
- Headless verification: `rive/feasibility/build/steam_no_rain.png` (rain inactive)
- Headless verification: `rive/feasibility/build/steam_with_rain.png` (rain active via `--data=isRaining=true`)
- Production browser preview initial: `rive_feasibility_preview_1792834256109.png`
- Production browser preview 10x toggled: `rive_feasibility_toggled_10_1792834270228.png`

---

## 5. Automated Test, Lint & Build Results

- **`npm test`**:
  ```
  ✔ scenarios consistently update forecast and rounded buffer (1.0975ms)
  ✔ chef override wins without altering forecast or suggestion (0.1514ms)
  ✔ impact totals and weighted accuracy derive from same completed services (0.23ms)
  ℹ tests 3, pass 3, fail 0 (duration: 108ms)
  ```
- **`npm run lint`**:
  ```
  Found 0 warnings and 0 errors.
  Finished in 60ms on 6 files with 104 rules using 24 threads.
  ```
- **`npm run build`**:
  ```
  ✓ 21 modules transformed.
  dist/index.html                   0.66 kB
  dist/assets/index-BjBAW_AV.css   16.73 kB
  dist/assets/index-BjGrMbch.js   532.54 kB
  ✓ built in 264ms
  ```

---

## 6. Gate Recommendation

**GATE DECISION: PASS**  
The Rive CLI toolchain, WebGL2 runtime, vector scene compilation, and ViewModel boolean data binding are fully validated and stable for PredictChef.

---

## 7. Rain Animation Correction & Multi-Loop Verification

**Timestamp:** 2026-10-24 18:03:00 +08:00  

### Root Cause Analysis & Fix:
- **Identified Issue:** `RainOn` was animating `propertyKey="14"` (Y position) on `RainSystem` (id `0:80`). Because `CloudTop` and all raindrops were children of `0:80`, the cloud top banner was falling down 50px along with the rain.
- **Correction Applied in `scene.rml`:**
  - `RainSystem` (id `0:80`) is now strictly stationary (`x="0" y="0"`). It is keyed only for opacity (`propertyKey="18"`: 0 in `RainOff`, 1 in `RainOn`).
  - `CloudTop` remains stationary at `x="250" y="28"` without any Y motion.
  - Raindrops partitioned into three staggered groups (`RainGroupA` id `0:81`, `RainGroupB` id `0:82`, `RainGroupC` id `0:83`).
  - Each group falls along Y (`0` to `120`) with 20-frame phased offsets (`0`, `20`, `40`).
  - Resets are hidden via opacity fades (`0.0` at loop boundary and `1.0` during flight), completely eliminating visible upward pop/jumps.
- **Rebuilt Asset:** `build/feasibility.riv` (3,944 bytes) compiled cleanly (`0 errors, 0 warnings`) and copied to `public/feasibility.riv` and `dist/feasibility.riv`.

### Browser Verification (Observed for 4+ consecutive loops):
1. **Stationary Cloud:** Across loops 1, 2, 3, and 4 (screenshots `rain_loop_1_1792836077859.png` through `rain_loop_4_1792836087520.png`), `CloudTop` remained locked at `y=28` with zero drift or displacement.
2. **Continuous Staggered Rain:** Rain drops cascaded smoothly and continuously across the 3 phased groups without jumping.
3. **Toggle Off/On:** Toggling rain OFF cleanly hid the drops while keeping steam active; toggling ON cleanly resumed rain.
4. **Steam Unchanged:** Steam puffs continued their independent 120-frame looping cycle without interference.
5. **Console Status:** Zero runtime errors observed.

---

## 8. Canteen Scene Step 9: Static Typical Day Composition & Visual Review

**Timestamp:** 2026-10-24 18:30:00 +08:00  
**Phase:** Step 9 (Static Typical Day Composition Review) — Ready for visual critique before adding remaining states or animations.

### 1. Vector Scene Architecture (`rive/canteen/scene.rml`)
- **Artboard:** 800 × 450 (16:9 orthographic 2D front view).
- **Z-Index Layer Hierarchy (Front-to-Back declared):**
  - **Z-7 (Foreground Customers):** Exactly 3 silhouettes (2 bottom-left at x=55, x=115; 1 bottom-right at x=735) in Pine Shadow (`#0D1F17`) with contrasting collars (`#E2D9C8`, `#7A9A86`, `#B5C99A`) anchored to bottom frame edge. Kept small; zero occlusion of food trays, pot, or chef.
  - **Z-6 (Steam Wisps):** Exactly 3 wisps in muted sage-grey (`#829B8C` and `#708A7B`) positioned above Tray 2 (Curry), Tray 3 (Rice), and Stockpot. High contrast against Warm Cream wall.
  - **Z-5 (Serving Counter & Food Trays):**
    - 3 food warmers (salad greens `#B5C99A`, amber curry `#E8B86D`, steamed rice `#F5EFE6`) with Soft Oat rims and garnish accents.
    - 1 chef stockpot (`#163024` body, silver rim, amber broth surface, dual handles).
    - Countertop surface (`#E2D9C8` Soft Oat with `2px` stroke).
    - Counter front panel (`#163024` Deep Forest) featuring a high-contrast inset panel (`#E2D9C8` and `#7A9A86` with vertical slat dividers) that separates customer silhouettes from the base.
  - **Z-4 (The Chef):** Positioned behind counter on right (x=575, y=210). Tall toque hat, amber head, white tunic, and dark apron with crisp `2px` Deep Forest (`#163024`) strokes for legibility on cream walls.
  - **Z-2 (Wall Accents & Window):**
    - 6-pane exterior window (X: 10% to 55%, Y: 15% to 55%) with zero bleeding outside window bounds.
    - Two overhead pendant lamps with amber glow bulbs.
    - Canteen menu signboard on wall to the right of the window.
  - **Z-0 (Exterior Sky & Back Wall):**
    - Exterior sky fill in Warm Cream / Amber tint (`#F0E5D0`) strictly masked within window frame.
    - Interior back wall base (`#F5EFE6` Warm Cream).
- **Data Binding Architecture:**
  - **ViewModel:** `CanteenVM`
  - **Numeric Property:** `scenario` (0 = Typical Day, 1 = Heavy Rain, 2 = Campus Festival)
  - **Boolean Property:** `prefersReducedMotion` (defaults to `false`)

### 2. Compilation & Production Delivery
- Compiled via `rive . --once` -> `rive/canteen/build/canteen.riv` (6,503 bytes, 0 errors, 0 warnings).
- Deployed to `public/canteen.riv` and verified in `dist/canteen.riv`.
- Backup feasibility asset `public/feasibility.riv` (3,944 bytes) preserved intact.

### 3. Isolated React Preview (`src/RiveFeasibility.jsx`)
- Created dual-size viewing layout:
  - **Full Size View (800 × 450):** Direct 1:1 artboard projection to inspect fine geometric alignment.
  - **In-Situ Dashboard Scale (~400 × 225):** Scaled representation matching the intended hero panel container.
- Real-time ViewModel inspection displays `scenario: 0 (Typical)` and `prefersReducedMotion: false`.
- Seamless tab switcher between **Canteen Scene (Step 9 Review)** and **Feasibility Backup Harness**.

### 4. Automated Verification Results
- **`npm run lint`**: 0 warnings, 0 errors across all 6 files.
- **`npm test`**: 3/3 passed (103ms).
- **`npm run build`**: Succeeded cleanly (Vite 8.3.5 client bundle).
- **Browser Execution (`browser_subagent`)**: Both canvases loaded with status "Loaded", zero console errors, verified in screenshots `rive_feasibility_scrolled_1792837695243.png` and `canteen_dashboard_scale_review_1792837775730.png`.

---

## 9. Canteen Scene: Focused Visual Refinement Pass (Typical Day)

**Timestamp:** 2026-10-24 23:02:00 +08:00  
**Phase:** Static Visual Refinement Gate (20–30 min pass) — Stopped for user review before animation.

### 1. Vector Artwork Refinements (`rive/canteen/scene.rml`)
- **Counter Front & Inset Panel:**
  - Removed decorative vertical grid slats (`Slat1`–`Slat6`) for a restful, clean aesthetic.
  - Added a centered, understated **PredictChef Leaf Emblem** medallion (`#11261D` disc, `#7A9A86` rim, `#B5C99A` three-leaf clover) that breaks up the large empty dark counter without adding tiny text or complex grids.
  - Lower inset panel converted into a calm Soft Oat (`#E2D9C8`) base band with a subtle Restrained Sage (`#7A9A86`) border rim.
- **Window Exterior Scenery:**
  - Added a pale exterior sky fill (`#F0E8DC`).
  - Added a low campus building silhouette in `#7A9A86` with a central pavilion pediment and rhythmic window slits, occupying only the bottom 25% of the window frame (`y=45` to `y=85`).
  - Added one restrained tree shape (dark trunk in `#163024`, two-tone canopy in `#557361` and `#7A9A86`) on the right side of the window.
  - **Preserved Negative Space:** The upper 70%+ of the window remains completely clear pale sky, leaving clean vertical space for diagonal rain streaks in State 1.
- **Three Varied & Recognizable Food Trays:**
  - **Tray 1 (Vegetables / Salad):** Grouped floret mounds in Muted Lime (`#B5C99A`) and Restrained Sage (`#7A9A86`) with Amber Glow (`#E8B86D`) carrot coin accents and dark seasoning dots on a sage greenery bed.
  - **Tray 2 (Warm Dish / Curry):** Rich amber curry pool (`#E8B86D`) with distinct simmered stew/protein chunks in Deep Forest (`#163024`) and Sage (`#7A9A86`), topped with green herb flakes.
  - **Tray 3 (Steamed Rice):** Generous fluffy white rice mounds in Warm Cream (`#F5EFE6`) with Soft Oat shadow bed and a fresh green garnish sprig on top.
  - Consistent Soft Oat (`#E2D9C8`) metallic rims and Restrained Sage wells maintained across all trays.
- **Chef's Toque Hat Silhouette:**
  - Refined the toque from a rounded rectangle into an unmistakable chef toque silhouette with distinct puffed lobes (center dome, left and right pleats), subtle pleat crease accents, a flared crown base, and a dark band resting above the head.
  - Preserved simple character style with crisp 2px Deep Forest outlines; zero articulated limbs or detailed rigging.
- **Steam Shapes:**
  - Refined into soft, semi-transparent vertical wisp placeholders (opacity `0.50`–`0.60`, muted sage-grey `#829B8C` and `#708A7B`), ready for upward translation and fade-out animation loops in the subsequent phase.

### 2. Distinction: Implemented Bindings vs. Verified Behaviour
Per user instruction, the system explicitly distinguishes what has been implemented in schemas/bindings from what has been runtime-verified:

| Binding / Feature | Implementation Status | Verification Status & Current Evidence |
|---|---|---|
| **Numeric `scenario` property** | **Implemented in Schema & Code:** Declared in `CanteenVM` (`ViewModelPropertyNumber id="0:45"`, initial `0`); bound via `useViewModelInstanceNumber('scenario', vmi)` in React. | **Partially Verified:** Scenario 0 (Typical Day) loads and renders correctly in the static preview. **NOT YET PROVEN:** Three-state switching (switching between 0 = Typical, 1 = Heavy Rain, 2 = Campus Festival) is pending implementation of States 1 & 2 in the State Machine. |
| **Boolean `prefersReducedMotion` property** | **Implemented in Schema & Code:** Declared in `CanteenVM` (`ViewModelPropertyBoolean id="0:46"`, initial `false`); bound via `useViewModelInstanceBoolean('prefersReducedMotion', vmi)` in React. | **Partially Verified:** Property value `false` is read by React runtime without error. **NOT YET PROVEN:** Reduced-motion behavior (freezing/bypassing looping steam, rain, and chef idle) has not yet been executed or proven because animation loops have not yet been authored. |
| **Static Composition (800×450 & 400×225)** | **Fully Implemented & Verified:** Artboard 800×450 compiled to `canteen.riv` (8,956 bytes). | **Verified:** Tested in Chromium browser via `browser_subagent`; zero console errors; screenshot confirmed at both 800×450 and 400×225. |

### 3. Build & Test Metrics
- **Compiler:** Rive CLI 1.7.0 -> `rive/canteen/build/canteen.riv` (8,956 bytes, 0 errors, 0 warnings).
- **Public & Dist Assets:** Updated `public/canteen.riv` and `dist/canteen.riv`.
- **`oxlint`**: 0 warnings, 0 errors.
- **`node --test`**: 3/3 passed (105ms).
- **Vite production build**: 21 modules transformed, 0 build errors.

---

## 10. Canteen Scene: Three Interactive States, Animation & Reduced Motion

**Timestamp:** 2026-10-24 23:22:00 +08:00  
**Phase:** Step 10 Interactive Verification Gate — Complete  
**Status:** **PASS** (Dashboard integration deliberately deferred to subsequent phase)

### 1. Vector Scene Architecture & State Machine (`rive/canteen/scene.rml`)
- **Artboard:** 800 × 450 (16:9 orthographic 2D front view).
- **Asset Size:** `rive/canteen/build/canteen.riv` (14,247 bytes, 0 errors, 0 warnings).
- **Data Binding (ViewModel `CanteenVM`):**
  - Numeric `scenario` property (key `636`): 0 = Typical Day, 1 = Heavy Rain, 2 = Campus Festival.
  - Boolean `prefersReducedMotion` property (key `634`): defaults to `false`.
- **Decoupled 4-Layer State Machine (`State Machine 1`):**
  - **Layer 1 (`ScenarioLayer`):**
    - `TypicalDayState` (animation `TypicalDay`): Warm sky (`#F0E8DC`), exactly 3 customers (`Customer1`, `Customer2`, `Customer3`), 0 bunting, 0 rain.
    - `HeavyRainState` (animation `HeavyRain`): Cool slate teal sky (`#5A7678`), stationary cloud bar, falling rain clipped inside window, exactly 1 customer (`Customer1`).
    - `CampusFestivalState` (animation `CampusFestival`): Warm sky, 12 sage/lime/amber/oat bunting flags along top ceiling border (`#B5C99A`, `#E8B86D`, `#7A9A86`, `#E2D9C8`), exactly 5 customers (`Customer1`–`Customer5`), 0 rain.
    - Direct transitions between all states (`0 ↔ 1`, `1 ↔ 2`, `0 ↔ 2`) configured with `duration="15"` for smooth 15-frame opacity crossfades.
  - **Layer 2 (`SteamLayer`):**
    - `SteamMovingState` (animation `SteamLoop`): 3 staggered wisps rising from Y: 225 -> 170, expanding in scale (0.8 -> 1.3), and fading out over a seamless 120-frame loop with 40-frame phase offsets.
    - Transitions to `SteamRestingState` (animation `SteamStatic`) when `prefersReducedMotion == true`.
  - **Layer 3 (`RainMotionLayer`):**
    - `RainFallingState` (animation `RainFallLoop`): 3 phased drop groups (`RainGroupA`, `RainGroupB`, `RainGroupC`) falling continuously along Y (-40 -> 45) with 20-frame offsets and hidden loop resets (opacity 0.0 at reset, 0.7 in flight). Strictly bounded within window frame (-175 to +175 X, -85 to +85 Y).
    - Transitions to `RainRestingState` (animation `RainStationary`) when `prefersReducedMotion == true`.
  - **Layer 4 (`ChefMotionLayer`):**
    - `ChefBobbingState` (animation `ChefBobLoop`): Subtle chef breathing idle bob ping-ponging 2.5px vertically over 90 frames.
    - Transitions to `ChefRestingState` (animation `ChefStationary`) when `prefersReducedMotion == true`.
  - **Stationary Elements:** Clouds (`WindowCloudBar`), window frame, counter, and exterior campus buildings have zero motion keyframes.

### 2. Isolated React Preview (`src/RiveFeasibility.jsx`)
- **Prominent React Controls:**
  - Three distinct scenario buttons (`#scenario-0-btn`, `#scenario-1-btn`, `#scenario-2-btn`) displaying scenario index, name, description, and active status badge.
  - Reduced Motion toggle (`#reduced-motion-toggle-btn`) connected to browser `(prefers-reduced-motion: reduce)` media query with manual override and reset button.
  - 20x Rapid Scenario Stress Test runner button (`#rapid-stress-test-btn`).
- **Synchronized Viewers:**
  - Full-Size Artboard View (800 × 450) and In-Situ Dashboard Scale (~400 × 225) synchronized to the same scenario and motion state.
- **Pre-load State Queuing:**
  - `useEffect` binds scenario and motion state upon `rive.viewModelInstance` readiness, ensuring selections made before asset loading completes are applied immediately.

### 3. Verification Checklist Results

| Verification Item | Specification / Requirement | Observed Result & Evidence | Status |
|---|---|---|---|
| **1. Direct State Transitions** | Every state can transition directly to either other state (0↔1, 1↔2, 0↔2). | Verified in browser. Tested all 6 permutations: 0->1, 1->2, 2->0, 0->2, 2->1, 1->0. Opacity crossfades executed cleanly without glitching. | **PASS** |
| **2. 20x Rapid Selections** | Twenty rapid scenario selections settle on the final selected state without leftover rain, bunting, or customers. | Triggered automated 20x rapid stress test (80ms interval cycling through all states). Final state settled cleanly on Scenario 0 (Typical Day): exactly 3 customers, warm sky, zero leftover rain drops, zero leftover bunting flags. | **PASS** |
| **3. Pre-load Switching** | Switching before asset loading completes still produces the latest selected state. | React state holds selection in queue; `useEffect` sets ViewModel property immediately upon asset load. Tested during page reload. | **PASS** |
| **4. Rain Window Clipping** | Rain remains inside the window over at least three loops. Clouds, window, counter & buildings stay stationary. | Observed over 4+ loops (3-4 seconds). Rain drops fall strictly within the 350×170 window bounds. WindowCloudBar, window frame, counter, and buildings remain stationary. | **PASS** |
| **5. Prefers Reduced Motion** | Connect to browser preference; freeze decorative movement while preserving visual appearance; switching still works. | Connected to `window.matchMedia('(prefers-reduced-motion: reduce)')`. Toggling reduced motion stops steam, rain, and chef motion. Switching between scenarios 0, 1, and 2 works properly while elements remain stationary. | **PASS** |
| **6. Refresh & Production Preview** | Refresh reloads cleanly; production preview works on port 4173. | Page reload verified (both canvases loaded with status "● Loaded"). Production preview built with `vite build` and tested on port 4173 (`/canteen.riv` served with HTTP 200, 14,247 bytes). | **PASS** |
| **7. Quality Gates** | `node --test`, `oxlint`, and `vite build` pass. | `node --test` (3/3 pass), `oxlint` (0 warnings, 0 errors), `vite build` (21 modules, 0 errors). | **PASS** |
| **8. Dashboard Integration** | Dashboard calculations kept unchanged. | Preserved. No edits made to `SmartPrepSheet.jsx`, `DemandInsights.jsx`, or core prediction math. Integration deferred. | **PENDING (By Design)** |

### 4. Captured Verification Artifacts
- **Recording:** `file:///C:/Users/gooyo/.gemini/antigravity-ide/brain/2413331d-ba0d-45e6-917d-62019d94fc24/canteen_interactive_demo_1792855135728.webp`
- **Screenshots:**
  - Scenario 0 (Typical Day): `canteen_scenario_0_typical_1792855164850.png`
  - Scenario 1 (Heavy Rain): `canteen_scenario_1_rain_1792855170649.png`
  - Scenario 2 (Campus Festival): `canteen_scenario_2_festival_1792855178825.png`
  - Post 20x Rapid Test Settled: `canteen_after_20x_rapid_test_1792855214774.png`

