# Kids voices

Every line in Maffblast Kids is pre-rendered with [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M)
(a small neural text-to-speech model) into `audio/voice/*.mp3`, plus `audio/voice/manifest.json`
mapping `"who|text"` to a file. Lines missing from the manifest fall back to the browser's voice,
so the game still works while a line is new.

## Regenerate after editing dialogue

1. Serve the site: `python -m http.server 8765` (from the repo root).
2. List every line: `node tools/voices/collect.mjs` (needs `npm i playwright-core`; writes `tools/voices/lines.json`).
3. Render: `tools/voices/venv/Scripts/python -I tools/voices/gen.py tools/voices/lines.json audio/voice`
   Only new or changed lines are rendered; removed lines are cleaned up. ~25x real time on an RTX 3080 Ti.
4. Optional: `python tools/voices/check.py audio/voice` transcribes a sample with Whisper to catch garbled lines.

## One-time setup

```
python -m venv tools/voices/venv
tools/voices/venv/Scripts/python -m pip install kokoro-onnx soundfile imageio-ffmpeg "onnxruntime-gpu[cuda,cudnn]" faster-whisper
```
Download into `tools/voices/models/` from the kokoro-onnx releases (model-files-v1.0):
`kokoro-v1.0.onnx` and `voices-v1.0.bin`.

## Casting

Set in `CAST` at the top of `gen.py`: a Kokoro voice, speed, and a pitch factor (the cartoon shift).
To recast a character, change it and delete that character's lines from the manifest (or run with
`--only <who>`), then render again.
