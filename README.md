# Brainstorm Agents — Teaching Manifold Foundations

Multi-agent brainstorming session for designing an interactive lesson that teaches **what manifolds ARE** to business managers with minimal math background.

This is a **foundations/prelude lesson** — it builds the conceptual understanding that a later lesson on manifolds-in-ML will rely on.

## What This Teaches

The lesson gradually introduces:
1. Curves as 1-manifolds (locally looks like a line)
2. Surfaces as 2-manifolds — the sphere (locally looks like a flat plane)
3. The "locally flat" property — the defining feature of manifolds
4. Charts — local flat maps of a curved surface (the cartographer's analogy)
5. Why one chart isn't enough — the poles problem
6. Atlases — collections of overlapping local maps
7. Homeomorphism — which shapes are "the same" and which aren't
8. The torus (doughnut) and coffee cup — homeomorphism in action
9. The Klein bottle — a non-orientable mind-expander
10. Brief bridge to ML: "your data might live on shapes like these"

## Target Audience

Mid-to-senior business managers taking an AI/Python course. They have MBA-level analytics, some Python exposure, but minimal formal math. They need genuine understanding, not just impressions.

## How to Run

```bash
bash orchestrate.sh \
  "Gradually teach business managers what a manifold is. Start from the simplest examples (curves, sphere) and build step by step to charts, atlases, homeomorphism, the torus, and the Klein bottle. Every concept must be introduced with plain language first, discovered through interactive 3D exploration, and verified — the manager proves they understood before moving on. This is a foundations lesson that prepares managers for a later lesson on manifolds in machine learning. Prioritize genuine understanding over impressive visuals." \
  ./brainstorm-output \
  20
```

## Agents

| Agent | Role |
|---|---|
| **Pedagogy Agent** | Gradual concept sequencing, pacing, verification moments |
| **Design Agent** | Interactive 3D discovery moments (explore to learn, not watch to be impressed) |
| **Math Agent** | Mathematical honesty AND intuition-building analogies |
| **Simplifier Agent** | Finds the simplest true explanation of every concept (replaces the Manager Advocate) |

## Key Design Difference from Previous Session

The previous brainstorming session (`visualization_manifolds`) produced a "War Room" crisis-driven concept that was impressive but skipped foundational teaching. This session deliberately:
- Replaces the **Manager Advocate** (who killed math teaching) with a **Simplifier Agent** (who finds simpler ways to teach the same math)
- Requires **interactive discovery** for every concept (the manager does, not just watches)
- Requires **verification moments** (the manager explains back, not just nods)
- Enforces **gradual pacing** (2-3 minutes per concept, not 30 seconds)
- Treats the **Klein bottle** as a genuine mind-expanding challenge

## Contents

- `orchestrate.sh` — Multi-agent brainstorming orchestrator
- `skill_spec/design-patterns-preview.md` — Visual patterns, design philosophy, color palettes, 3D scene defaults
- `skill_spec/pipeline-stages-preview.md` — Specification template, implementation guidelines, checklists

## Outputs (after running)

- `brainstorm-output/discussion-transcript.md` — Full multi-agent debate
- `brainstorm-output/converged-concept.md` — Synthesized teaching concept
