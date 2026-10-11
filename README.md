# BeamCheck – Beam Design Checker

A step-by-step web app that checks a simply supported beam for bending, shear and
deflection, draws the shear-force and bending-moment diagrams, and suggests a
minimum section depth when the beam fails.

Created by Naisharaz Dey (Civil Engineering mini project).

## Features
- Guided wizard: project, span, loading (UDL or point load), section, material, review, results
- Steel, timber and concrete presets with editable allowable limits
- SAFE / UNSAFE verdict with utilization bars for bending, shear and deflection
- Shear-force and bending-moment diagrams
- Suggested minimum section depth
- Optional AI helper that fills the steps from a plain-language description

## Run it on your computer
You need Node.js (LTS) installed.

```sh
npm install
npm run dev
```

Then open http://localhost:8080 (the terminal prints the exact link).

Other commands: `npm run build`, `npm run test`, `npm run lint`.

## Optional: AI helper
Copy `.env.example` to `.env` and put your own OpenAI API key in it. Without a key,
the rest of the app works normally and the AI box shows a short "not set up" message.

## Disclaimer
Preliminary check for learning and planning. Final design must be verified by a
qualified structural engineer.
