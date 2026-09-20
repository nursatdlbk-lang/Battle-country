# Country Battle — плей-офф 32 стран

Версия 2 создаёт детерминированный турнир из 32 countryball-бойцов: 5 раундов,
31 матч, отдельный вертикальный ролик 1080×1920 для каждого матча и автоматическое
продвижение победителя. У каждой страны есть локальный SVG-флаг, отдельные PNG
обычного оружия и ульты, собственные RU/EN-названия и зарегистрированные шаблоны атак.

В интерфейсе доступны «Плей-офф» и «Свободный бой», импорт/экспорт сетки JSON,
отмена результата, новый турнир по seed и переключение RU/EN при экспорте. Бой
ускоряется после 30 с, арена сжимается после 60 с, а к 120 с гарантирован финальный KO.

Работа разделена на два экрана: сначала выбираются страны, поле и остальные
параметры, затем кнопка «Продолжить к бою» открывает арену. Выбранные размеры
используются и в турнире, и в свободном бою, и при экспорте. Столкновение тел
countryball остаётся упругим и не наносит урон; ближний урон возникает только
при пересечении противника с профилированным хитбоксом видимого оружия.

Оружие стран больше не накладывается на техническую фиолетовую турель. Револьвер
выпускает пули, луки — стрелы, а возвращаемое оружие использует собственный PNG.
Бумеранг Австралии, чакрам Индии и энергомяч Бразилии летят наружу, разворачиваются
по времени или у стены и возвращаются к текущей позиции владельца. Колющее оружие
движется выпадом, болас Аргентины имеет отдельный видимый трос, а канадский и
норвежский топоры вращаются режущей стороной вперёд.

Перед каждой суперспособностью есть детерминированная фаза подготовки: движение
замедляется без приближения и смещения камеры, показываются название и изображение способности,
после чего срабатывает эффект. Урон ульты всегда подписан её названием; щит и лечение
показываются отдельными числами. Повторяющийся пассивный урон оставлен только у
морозной зоны России и беркута Казахстана, остальные страны используют разовые удары,
рывки, залпы, защиту, скрытность или отложенные атаки.

Интерфейс переведён на русский язык. Для запуска дважды нажмите `START.cmd`.

Во вкладке **Основное**:
- **Ширина/высота физического поля**: двигайте два независимых ползунка. Они меняют реальные границы физики и разрешение видео. Радиус и скорость шаров не масштабируются; на меньшем поле шары чаще отскакивают и встречаются.
- **Свой размер**: потяните за правый нижний угол арены. Ширина и высота меняются независимо; отпустите мышь, чтобы применить размер и сбросить бой. Escape отменяет перетаскивание. Можно также ввести ширину и высоту в «Основное» и нажать «Применить размер».
- **Квадрат**: выберите готовое поле 720 × 720 или задайте одинаковые ширину и высоту. Свой размер сохраняется в JSON и используется при экспорте видео.
- **Размер поля**: маленькое — 960 × 540, среднее — 1280 × 720, большое — 1920 × 1080. При вертикальной ориентации стороны меняются местами. Выбранный размер определяет границы арены и разрешение экспортируемого видео.
- **Код боя (seed)**: меняет начальные позиции и направления движения, но не размер поля.

По умолчанию выбрано маленькое поле. После обновления проекта нажмите в браузере Ctrl+F5.

Phase 1 (project scaffold and dependencies) is complete. This existing project also contains engine, preview, and export implementations. The approved movement and rendering decisions below supersede the original random-walk / HTML rendering open questions.

## Run

```powershell
npm install
npm run dev
npm test
npm run build
npm run remotion:studio
```

In the render dialog, download the full battle configuration JSON, place it in the project directory, then use the displayed command, for example:

```powershell
npx remotion render BattleVideo out.mp4 --props="battle-config-seed-42.json" --gl=angle
```

`npm run remotion:render` renders the built-in defaults. Remotion and its related packages are pinned to the installed 4.0.524 version; Zod is pinned to its required 4.5.4 version.

## Approved V1 decisions

- Movement mode: **BALLISTIC**. Only `BallisticController` is implemented. Its `update(fighter, context, dt): void` intentionally does nothing. Future RandomWalk, Chase, Evade, and Aggressive controllers can use the interface without changing physics.
- The seed determines initial positions and movement angles. Initial speed is the configured fighter speed with no speed variation in V1. Identical configuration and seed produce identical initial state and battle events.
- Initial circles stay inside the arena and cannot overlap. Bounded random placement has a deterministic layout fallback; configurations that cannot be placed are rejected.
- Velocity persists between wall bounces and elastic fighter collisions. The existing explicit sudden-death speed effect scales velocity at its configured thresholds. No random steering runs during the battle.
- Engine code stays independent of DOM, React, Pixi, and audio. Each tick is `1 / config.fps`; state time is `frame / config.fps`, avoiding accumulated time drift.

## Shared rendering architecture

```text
BattleConfig + seed
        |
BattleEngine (pure TypeScript)
        |
BattleTimeline: state and events for each integer frame
        |
renderBattleFrame / BattleRenderer
        |
PixiBattleRenderer (one visual implementation)
        |                         |
Live Preview                Remotion canvas
```

Both consumers use the same Pixi code for masked flag countryballs, programmatic eyes,
country weapon/ultimate textures, projectiles, shrinking arena, trails, particles,
glow, hit flashes, damage numbers, HP/ultimate rings, timer, and winner banner.
All 96 country assets are local and preloaded before Remotion renders frame zero.

Asset attribution and the pinned flag license are in `THIRD_PARTY.md`; the generated
asset concept manifest is in `docs/COUNTRY_ASSETS.md`.

Transient effects are reconstructed from a bounded window of event-time states, so seeking backwards, skipping frames, and fresh render workers produce the same effects. Restarting cannot retain particles from an earlier battle. Removed Pixi display objects are destroyed to release resources.

Remotion obtains the integer frame from `useCurrentFrame()`, waits for Pixi initialization and drawing with `useDelayRender()`, and renders directly into its canvas. There is no application-level PNG capture/reload pipeline. The private Pixi ticker is stopped; wall-clock time never advances export simulation. Live playback uses elapsed time only to choose timeline frames. Both views hold the terminal state for two seconds while transient effects expire.

See the official [Pixi application options](https://pixijs.com/8.x/guides/components/application) and [Remotion delayRender documentation](https://www.remotion.dev/docs/delay-render) for the canvas initialization/render barrier APIs.

## Audio

`src/audio/battle-audio-cues.ts` maps deterministic battle events to sound cues for both preview and export: melee hit, projectile fire, projectile impact, wall bounce, KO, and winner. Projectile destruction does not duplicate an impact sound. Audio never mutates simulation state.

Both consumers play the same included WAV assets or configured custom URLs. Export starts each cue at `event.frame`; music and SFX volumes are independent. Export configuration retains custom audio fields. For portable exports, custom URLs must be available to the rendering browser (a browser-local blob URL is not portable).

## Validation

- `npm test`: checks seed/spawn invariants, physical arena resizing, elastic collisions, controller immutability, 30/60 FPS timeline mapping, event alignment, winner events, audio cue mapping, and seek-independent effects.
- `npm run build`: TypeScript and Vite production build.
- `artifacts/phase1-frame-180.png`: direct Pixi still at frame 180 (3 seconds at 60 FPS).
- `artifacts/phase1-smoke.mp4`: short H.264 rendering check with event audio.
