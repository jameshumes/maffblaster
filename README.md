# Maffblast

Neon mental-math arcade game, plus **Maffblast Kids**. Static site, no build step: GitHub Pages serves it straight from `main`.

## Grown-up game
- `index.html` markup, `css/style.css` styles
- `js/main.js` game flow: chapters, menus, the shooter, input, main loop
- `js/fx.js` Three.js renderer, warping grid, particles, fireworks
- `js/tens.js` the 10s column game
- `js/choices.js` multiple-choice wrong answers (Easy mode)
- `js/curriculum/` one file per chapter (worlds + levels)

## Maffblast Kids (Mode: Kids)
A 3D storybook hub with three talking, singing games where answers drive the action:
- `js/kids/app.js` hub, story scripting runtime (`say` / `wait` / `until`), captions, pause, results
- `js/kids/hub3d.js` the living Sprinkle Valley diorama behind the hub
- `js/kids/kart3d.js` Kitty Kart Chase · `rocket3d.js` Rocket Escape · `dragon3d.js` Feed the Dragon
- `js/kids/three/` toon 3D kit (curved world, cel shading, ink outlines, particles) and the cast, built from shapes in code
- `js/kids/syllabus.js` the learning path: 9 "I can..." steps (Common Core K–2), answer tracking, badge checks. The hub's **My Path** shows it to kids; **Grown-ups** there opens a printable progress report
- `js/kids/problems.js` kid math (within 20, tens, 2-digit, times 2·5·10); every sentence is enumerable
- `js/kids/voice.js` plays pre-rendered neural voice lines (`audio/voice/`), with lip-sync levels
- `js/kids/music.js` original chiptune scores with reverb, scheduled on the audio clock
- `tools/voices/` regenerate the voices after editing dialogue (see its README)

Run locally: `python -m http.server` then open http://localhost:8000 (ES modules need a server, not file://).
