# Maffblast

Neon mental-math arcade game. Static site, no build step: GitHub Pages serves it straight from `main`.

- `index.html` markup, `css/style.css` styles
- `js/main.js` game flow: chapters, menus, the shooter, input, main loop
- `js/fx.js` Three.js renderer, warping grid, particles, fireworks
- `js/tens.js` the 10s column game
- `js/choices.js` multiple-choice wrong answers (Easy mode)
- `js/curriculum/` one file per chapter (worlds + levels)

Run locally: `python -m http.server` then open http://localhost:8000 (ES modules need a server, not file://).
