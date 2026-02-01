# Audio System Design

## Overview

A Howler.js-based audio system with three volume buses (Music, SFX, UI), starting with combat SFX. Dark & atmospheric mood — heavy thuds, ominous tones. Music will be layered/adaptive (stage-based base track + combat intensity overlays), but is out of scope for v1.

## Dependencies

- `howler` (npm) — ~7KB gzipped, zero dependencies, MIT licensed
- `@types/howler` (dev) — TypeScript definitions

## Architecture

### Volume Bus Structure

```
Howler.volume(masterMuted ? 0 : 1)
├── Music Bus (volume: persisted, future)
│   ├── Base layer (stage theme, looping)
│   └── Intensity layers (combat overlays, volume-automated)
├── SFX Bus (volume: persisted)
│   ├── Hit sounds (normal, crit, execute, poison, poisonCrit)
│   ├── Enemy death
│   ├── Boss spawn / Boss death
│   └── Gold drop
└── UI Bus (volume: persisted, future)
    ├── Button clicks
    ├── Card flips
    └── Modal sounds
```

Effective volume per sound: `config.volume * busVolume`. Howler global volume acts as master mute.

### File Structure

```
src/lib/audio/
├── audioManager.svelte.ts   # Singleton: bus volumes, persistence, mute toggle
├── sfx.svelte.ts            # SFX registry: preload Howl instances, play by event name
└── music.svelte.ts          # Future: layered music system
```

## SFX System (v1 Scope)

### Registry

One file per event. Same source file reused across hit types, differentiated by volume and pitch:

```ts
const SFX_REGISTRY = {
	'hit:normal': { src: '/audio/sfx/wood-hit-1.wav', volume: 0.6 },
	'hit:crit': { src: '/audio/sfx/wood-hit-1.wav', volume: 0.8, rate: 1.2 },
	'hit:execute': { src: '/audio/sfx/bell-cut.mp3', volume: 1.0 },
	'hit:poison': { src: '/audio/sfx/body-hit-with-grunt-3.wav', volume: 0.5 },
	'hit:poisonCrit': { src: '/audio/sfx/body-hit-with-grunt-3.wav', volume: 0.7, rate: 1.1 },
	'enemy:death': { src: '/audio/sfx/oof-4.wav', volume: 0.7, rate: 0.6 }, // pitched down to sound less human
	'enemy:bossSpawn': { src: '/audio/sfx/scream-14.wav', volume: 0.9, rate: 0.4 }, // pitched way down
	'enemy:bossDeath': { src: '/audio/sfx/scream-18.wav', volume: 1.0, rate: 0.4 }, // pitched way down
	'gold:drop': { src: '/audio/sfx/coin-jingle-small.wav', volume: 0.4 },
	'chest:break': { src: '/audio/sfx/hammer-hits-glass-6.wav', volume: 0.8 },
	'game:over': { src: '/audio/sfx/big-distant-thump-6.wav', volume: 1.0 },
	'ui:cardFlip': { src: '/audio/sfx/card-draw-3.wav', volume: 0.5 }, // cards rotating/flipping in
	'ui:cardSelect': { src: '/audio/sfx/card-draw-2.wav', volume: 0.6 },
	'hit:miss': { src: '/audio/sfx/woosh-13.wav', volume: 0.5 } // future: when miss mechanic is added
} as const;
```

### Public API

```ts
sfx.play('hit:crit');
sfx.play('hit:normal', { rate: 0.9 + Math.random() * 0.2 }); // pitch variation
```

Each `.play()` spawns a new Howler sound instance — overlapping plays layer naturally.

### Pitch Randomization

Small random `rate` offset (e.g. base rate +/- 10%) on hit sounds prevents the "machine gun effect" where identical sounds repeating feel robotic. Applied per-play, not per-config.

### Hit Sound Throttle

High attack-speed builds can produce many hits per frame. Unlimited overlapping sounds would be cacophonous. The throttle lives inside `sfx.play()`:

- Max 3-4 hit sounds (`hit:*`) within a sliding window (~100ms)
- Priority order: execute > poisonCrit > crit > poison > normal
- Matches existing hit display priority logic (high-priority hits always show, low-priority dropped when saturated)
- Non-hit sounds (`enemy:*`, `gold:*`) are not throttled

### Future Extensions (no API changes needed)

- **Multiple variants per event**: Add sprite support or variant arrays, `play()` picks randomly. Public API stays `sfx.play('hit:crit')`.
- **New events**: Add entries to registry, add `sfx.play()` call at integration point.

## Audio Manager

### Responsibilities

1. Initialize Howler on first user gesture (autoplay unlock — Howler handles `AudioContext` resume automatically)
2. Own three bus volumes (`music`, `sfx`, `ui`) as `$state` for settings UI binding
3. Persist volumes to localStorage (new key: `audioSettings`)
4. Expose `muted` toggle — sets Howler global volume to 0 without losing slider positions

### Persistence

Reuses existing localStorage pattern from `persistence.svelte.ts`:

```ts
{
  audioSettings: {
    sfx: 0.8,
    music: 0.7,
    ui: 0.6,
    muted: false
  }
}
```

### Volume Flow

```
Howler.volume(muted ? 0 : 1)
Each Howl.volume = config.volume * busVolume[bus]
```

## Integration Points

All `sfx.play()` calls go in game stores, not components. Sound is a side effect of game logic, not rendering.

### 1. `gameState.svelte.ts` — `attack()`

After hit array is generated:

```ts
for (const hit of hits) {
	sfx.play(`hit:${hit.type}`);
}
```

Throttle inside `sfx.play()` handles saturation — game store stays clean.

### 2. `gameState.svelte.ts` — `killEnemy()`

```ts
sfx.play('enemy:death');
```

### 3. `gameState.svelte.ts` — `addGoldDrop()`

```ts
sfx.play('gold:drop');
```

### 4. `enemy.svelte.ts` — `spawnBoss()` / `spawnBossChest()`

```ts
sfx.play('enemy:bossSpawn');
```

### 5. `gameState.svelte.ts` — boss kill (game over trigger)

```ts
sfx.play('enemy:bossDeath');
```

### Total: 5 integration points, each a single line.

## Settings UI

Add to `SettingsModal.svelte`:

- Three range sliders: Music, SFX, UI (0–100%)
- Mute toggle button
- Bound to `audioManager` state, changes persist immediately

## Audio Assets Needed (v1)

| Event             | File                        | Notes                                                |
| ----------------- | --------------------------- | ---------------------------------------------------- |
| `hit:normal`      | `wood-hit-1.wav`            | Base hit sound, reused with pitch/volume variation   |
| `hit:crit`        | `wood-hit-1.wav`            | Same file, higher pitch (rate: 1.2), louder          |
| `hit:execute`     | `bell-cut.mp3`              | Sharp execute sound                                  |
| `hit:poison`      | `body-hit-with-grunt-3.wav` | Poison hit                                           |
| `hit:poisonCrit`  | `body-hit-with-grunt-3.wav` | Same file, slightly higher pitch (rate: 1.1), louder |
| `enemy:death`     | `oof-4.wav`                 | Pitched down (rate: 0.6) to sound less human         |
| `enemy:bossSpawn` | `scream-14.wav`             | Pitched way down (rate: 0.4) to sound monstrous      |
| `enemy:bossDeath` | `scream-18.wav`             | Pitched way down (rate: 0.4) to sound monstrous      |
| `gold:drop`       | `coin-jingle-small.wav`     | Gold drop                                            |
| `chest:break`     | `hammer-hits-glass-6.wav`   | Chest kill / open sound                              |
| `game:over`       | `big-distant-thump-6.wav`   | Give up / game over sound                            |
| `ui:cardFlip`     | `card-draw-3.wav`           | Cards rotating/flipping into view                    |
| `ui:cardSelect`   | `card-draw-2.wav`           | Card selection in level-up/chest/shop                |
| `hit:miss`        | `woosh-13.wav`              | Future miss mechanic                                 |

## Decisions

- **Howler.js over raw Web Audio API**: Music + many SFX + layered adaptive music justifies the library. Rolling our own would reimplement half of Howler. 7KB gzipped, stable wrapper over stable browser API.
- **Store-driven, not component-driven**: Sound triggers live in game logic stores, matching the existing pattern for UI effects (hits, gold drops). Components are pure renderers.
- **Throttle in sfx.play(), not in callers**: Keeps game store code clean. Throttle logic is an audio concern, not a game logic concern.
- **Single file per event for v1**: Simplest starting point. Sprite/variant support is a backward-compatible addition later.
- **Three volume buses from day one**: Even though only SFX is implemented in v1, the audioManager owns all three bus volumes so the settings UI and persistence are ready for music and UI sounds.
