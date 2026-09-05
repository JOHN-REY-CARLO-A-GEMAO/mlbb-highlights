# MLBB Highlight Kit — Remotion

A hands-off Mobile Legends highlight editor built on Remotion. Drop a raw gameplay
video into `input/`, run one command, and get a vertical 1080×1920 edit in `out/`.
The generated composition keeps the footage, audio, intro card, motion treatment,
kill counter, captions, and event overlays in one data-driven plan.

## Zero-touch workflow

```bash
npm install
# paste any .mp4, .mov, .m4v, .webm, .mkv, or .avi into input/
npm run edit             # writes out/mlbb-highlight.mp4
```

To preview the same generated plan in Remotion Studio:

```bash
npm run studio            # Studio on :3000, with the upload already loaded
```

The ingest script automatically:

1. picks the newest video in `input/` (or the repository root),
2. copies it to `public/raw/` so Remotion can render it,
3. reads its exact duration and frame rate with Remotion's bundled `ffprobe`,
4. creates `.agentic/current-props.json`, and
5. renders the `AgenticHighlight` composition without requiring any manual timeline work.

The bundled probe means a system FFmpeg install is not required. If a codec is unusual
or metadata cannot be read, the fallback duration is 60 seconds; use
`npm run edit -- --duration 37.4` for a one-off override.

### Optional: give the editor an AI-ready beat sheet

The visual edit does not need a sidecar. If you already have event timestamps or a
transcript, put a JSON file next to the video with the same basename. For example,
`input/ranked-game.json` is picked up automatically for `input/ranked-game.mp4`:

```json
{
  "playerName": "ONIC.KAIRI",
  "event": "RANKED GAMEPLAY",
  "matchup": "MYTHIC RANKED",
  "channelName": "@yourhandle",
  "accentColor": "#3FA9FF",
  "events": [
    {"time": 12.4, "kind": "kill"},
    {"time": 14.1, "kind": "streak", "tier": "DOUBLE"},
    {"time": 18.7, "kind": "callout", "label": "OUTPLAY", "tone": "yellow"},
    {"time": 24.0, "kind": "streak", "tier": "SAVAGE"}
  ],
  "transcript": [
    {"text": "watch this", "start": 11.9},
    {"text": "savage", "start": 23.8, "emphasis": "red"}
  ]
}
```

That sidecar is intentionally a small contract: a local script, Whisper/Deepgram
workflow, or future vision agent can write it without changing the Remotion scene.
The renderer validates and sorts the data, so a messy upload cannot break a render.
For a different file, use `npm run edit -- --input input/other-match.mp4`.

`preview/HighlightDemo.mp4` remains the original component showcase over placeholder
footage. The new `AgenticHighlight` composition is the one used by the zero-touch
workflow.

---

## Compositions in the Studio

| ID | What it shows |
|---|---|
| `AgenticHighlight` | Upload-driven vertical edit; duration and props come from `.agentic/current-props.json` |
| `HighlightDemo` | All 7 components cut together, 20s |
| `KillStreak` | One tier, editable in the props panel |
| `KillStreakAllTiers` | DOUBLE → TRIPLE → MANIAC → SAVAGE back to back |
| `StatusCallout` | Corner mechanic annotation |
| `IntroTitleCard` | Player / event / matchup opener |
| `KineticCaption` | Word-by-word commentary |
| `SplitScreen` | 70/30 container |
| `KillCounter` | Counter incrementing 1→5 |
| `MinimapRouteTracer` | Route drawing on the enlarged minimap |

---

## Dropping in your real footage

Put files in `public/`, then reference them with `staticFile()`:

```tsx
import {staticFile} from 'remotion';

<SplitScreenFrame
  topVideo={staticFile('gameplay.mp4')}
  bottomVideo={staticFile('facecam.mp4')}
  channelName="@yourhandle"
>
  {/* overlays */}
</SplitScreenFrame>
```

Anywhere the demo passes `<MockGameplay />` / `<MockReactionCam />`, swap in a
`staticFile('...')` string. Audio cues are the same: `audioSrc={staticFile('sfx/savage.mp3')}`.

Update `durationInFrames` on the composition to match your clip:
`Math.round(clipSeconds * 30)`.

---

## 1. `KillStreakPopup`

```tsx
<Sequence from={s(12.9)} durationInFrames={s(1.6)}>
  <KillStreakPopup killTier="SAVAGE" holdMs={1200} audioSrc={staticFile('sfx/savage.mp3')} />
</Sequence>
```

| Prop | Default | Notes |
|---|---|---|
| `killTier` | — | `FIRST_BLOOD` `DOUBLE` `TRIPLE` `MANIAC` `SAVAGE`. Also accepts `"double kill"`, `"Savage"`, etc. |
| `holdMs` | `1000` | Full-opacity hold. Brief range 800–1200. |
| `widthRatio` | `0.66` | Label spans 66% of frame width; font size is measured to fit exactly. |
| `labelOverride` | — | Custom text, keeps the tier colour ramp. |
| `audioSrc` / `audioVolume` | — | Cue fires on mount, so it's frame-locked to the pop. |
| `offsetY` | `0` | Nudge off dead centre (the demo uses `-120` so it clears the action). |
| `showAccentBar` | `true` | Tier-coloured swipe under the text. |

Motion: 115% → 100% spring over 150ms + white hot-flash and impact shake →
hold → 180ms upward drift + fade. Total = `killStreakDurationInFrames(fps, holdMs)`.

Colour: DOUBLE/TRIPLE stay white with a cool rim glow; MANIAC and SAVAGE go
gold→orange gradient with ~2× glow strength, a bigger shake and a lingering idle bloom.
Type is Anton, all-caps, with a thick dark stroke (`paint-order: stroke`) plus white fill.

## 2. `StatusCallout`

```tsx
<StatusCallout label="CC Immune" sublabel="Purify active" corner="upper-left" tone="yellow" holdMs={2600} />
```

`label` · `sublabel?` · `corner` (`upper-left` default, any of the four) ·
`tone` (`white` `yellow` `red` `blue`) · `holdMs` (2000–4000) · `chip` (dark pill, on by default) ·
`scale` · `margin`.

200ms fade + slide from the nearest edge → hold → 220ms fade out.
Length = `statusCalloutDurationInFrames(fps, holdMs)`.

## 3. `IntroTitleCard`

```tsx
<IntroTitleCard
  playerName="ONIC.KAIRI"
  event="M4 World Championship 2022"
  matchup="ONIC PH vs BLACKLIST"
  accentColor="#3FA9FF"
/>
```

Stacked matchup tag → player name → neon divider → event line, inside a neon frame with
corner brackets and scanlines. 300ms slide+fade in, 2.5s hold, then a 320ms whoosh
(scale to 145% + blur + fade) that reveals clean gameplay.
`scrimOpacity` controls how much the gameplay behind is dimmed.
Length = `introCardDurationInFrames(fps, holdMs)`.

## 4. `KineticCaption`

```tsx
<KineticCaption
  transcript={[
    {text: 'kairi', start: 0.3},
    {text: 'sheesh', start: 0.9, emphasis: 'red'},
  ]}
  timeUnit="seconds"
  maxWordsPerLine={7}
/>
```

`CaptionWord = {text, start, end?, emphasis?, lineBreak?}` — `emphasis: true` flashes
yellow, `'red'` flashes red. Times are relative to the enclosing `<Sequence>`;
`timeUnit` accepts `seconds` (default), `ms` or `frames`. Whisper / Deepgram word
timestamps drop straight in.

Lines are cut at real pauses (`lineBreakGap`, default 0.5s), at `.`/`!`/`?`, or on a
`lineBreak` flag; long phrases split evenly (10 words → 5+5, never 7+3). One line on
screen at a time, and the line auto-shrinks if it would run past the safe area.
Each word pops 120% → 100% over 120ms exactly on its timestamp.

## 5. `SplitScreenFrame`

```tsx
<SplitScreenFrame topVideo={...} bottomVideo={...} topRatio={0.7} channelName="@handle">
  {/* top-half overlays */}
</SplitScreenFrame>
```

`children` render **inside the gameplay half**, so a centred kill-streak popup lands in
the centre of the gameplay, not the centre of the 1080×1920 canvas. `bottomOverlay`
does the same for the reaction cam. Also: `dividerThickness` `dividerColor`
`dividerGlow` `channelAlign` `muteTop` `muteBottom` `topStartFrom` `bottomStartFrom`.

`topVideo`/`bottomVideo` take either a src string (rendered with `OffthreadVideo`,
`object-fit: cover`) or any React node.

## 6. `KillCounter`

```tsx
<KillCounter killTimes={[4.2, 6.4, 8.3, 10.6, 12.9]} timeUnit="seconds" hideBeforeFirstKill />
```

Two modes:

* **`killTimes`** (recommended) — the counter derives its value per frame, so the pulse
  is deterministic and survives scrubbing and distributed rendering. Keep the component
  mounted from frame 0 and the timestamps stay in absolute clip time.
* **`killCount`** — a fixed number that pulses on mount; use it when the counter lives in
  a `<Sequence>` that starts exactly at the kill.

Each increment: 200ms scale pulse to ~138% with a ring burst and the old digit rolling
up behind. White until `goldThreshold` (default 3), then gold with a hotter glow.
`corner` `margin` `scale` `label` `hideBeforeFirstKill`.

## 7. `MinimapRouteTracer`

```tsx
<MinimapRouteTracer
  routePath={[{x: 0.14, y: 0.82}, {x: 0.3, y: 0.55}, {x: 0.7, y: 0.18}]}
  teamColor="blue"
  drawSeconds={2.6}
  minimapSrc={staticFile('minimap-crop.png')}
  startLabel="Blue buff"
  endLabel="Lord pit"
/>
```

`routePath` is normalised `0..1` over the minimap crop (`0,0` = top-left). Pass
`coordinateSpace="pixels"` + `mapSize` to use raw pixel coords instead. Points are
smoothed with Catmull-Rom, so 6–10 waypoints traced off the footage are enough.

Without `minimapSrc` it draws a built-in stylised MLBB-style map (lanes, river, jungle,
turrets) — handy for previewing before you export a crop. The line self-draws over
`drawSeconds` (2–3s) with a glow underlay in the team colour, a travelling head dot,
a dashed preview of the full route, and a pulsing destination marker on arrival.
`position` (`center` default, or any corner) centres within the parent, so it works
inside the split-screen top half. `sizeRatio` `title` `delaySeconds` `holdAfterDrawSeconds`.

---

## Timing convention

Every component animates relative to the start of its `<Sequence>`, so retiming a beat
means changing one `from={}`. The demo declares times in seconds and converts once:

```tsx
const s = (seconds: number) => Math.round(seconds * fps);
```

Duration helpers (`killStreakDurationInFrames`, `statusCalloutDurationInFrames`,
`introCardDurationInFrames`) return the exact frame count including enter and exit, so
`durationInFrames` never clips an exit animation.

## Files

```
input/                            drop folder for raw gameplay
public/raw/                       Remotion-served copy of the current upload
scripts/agentic-edit.mjs          ingest, plan, studio, and render automation
src/
  agentic/
    AgenticHighlight.tsx          hands-off vertical composition
    types.ts                      event/transcript plan contract
  theme.ts                       fonts, palette, stroke + text-fitting helpers
  Root.tsx                       composition registry
  components/
    KillStreakPopup.tsx          1
    StatusCallout.tsx            2
    IntroTitleCard.tsx           3
    KineticCaption.tsx           4
    SplitScreenFrame.tsx         5
    KillCounter.tsx              6
    MinimapRouteTracer.tsx       7
    index.ts                     barrel export
  demo/
    HighlightDemo.tsx            all 7 wired together
    demoData.ts                  sample transcript + route
    MockFootage.tsx              placeholder gameplay + reaction cam
```

Rendering to `out/` is gitignored; `preview/` holds the committed sample render.
