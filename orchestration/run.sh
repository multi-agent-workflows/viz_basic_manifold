#!/bin/bash
set -e

# Manifold Chart Explorer — Multi-Agent Orchestration Script
# Launches Claude Code CLI agents in a tiered dependency graph.

BASE_DIR="/Users/carloscotrini/Documents/git_bmai_fs26_cx/viz_basic_manifold"
PROJECT_DIR="$BASE_DIR/manifold-explorer"
PROMPT_DIR="$BASE_DIR/orchestration/prompts"
LOG_DIR="$BASE_DIR/orchestration/logs"

mkdir -p "$LOG_DIR"

CLAUDE_FLAGS="--dangerously-skip-permissions"

echo "============================================"
echo "  Manifold Chart Explorer — Orchestrator"
echo "============================================"
echo ""
echo "Project dir: $PROJECT_DIR"
echo "Prompts:     $PROMPT_DIR"
echo "Logs:        $LOG_DIR"
echo ""

# ──────────────────────────────────────────────
# Phase 0: Scaffold (must complete before anything else)
# ──────────────────────────────────────────────
echo "[Phase 0] Scaffold — creating project foundation..."
echo "  Started at $(date '+%H:%M:%S')"

claude -p "$(cat "$PROMPT_DIR/00-scaffold.md")" \
  $CLAUDE_FLAGS \
  > "$LOG_DIR/00-scaffold.log" 2>&1

echo "  Finished at $(date '+%H:%M:%S')"
echo "[Phase 0] Done."
echo ""

# Verify scaffold created the project
if [ ! -f "$PROJECT_DIR/package.json" ]; then
  echo "ERROR: Scaffold failed — package.json not found in $PROJECT_DIR"
  echo "Check $LOG_DIR/00-scaffold.log for details."
  exit 1
fi

if [ ! -f "$PROJECT_DIR/src/constants.js" ]; then
  echo "WARNING: constants.js not found — manifold agents may fail."
fi

# ──────────────────────────────────────────────
# Phase 1: Five manifold components in parallel
# ──────────────────────────────────────────────
echo "[Phase 1] Building 5 manifold components in parallel..."
echo "  Started at $(date '+%H:%M:%S')"

PIDS=()

# Circle
claude -p "$(cat "$PROMPT_DIR/01-circle.md")" \
  $CLAUDE_FLAGS \
  > "$LOG_DIR/01-circle.log" 2>&1 &
PIDS+=($!)
echo "  Circle agent PID: ${PIDS[-1]}"

# Sphere
claude -p "$(cat "$PROMPT_DIR/02-sphere.md")" \
  $CLAUDE_FLAGS \
  > "$LOG_DIR/02-sphere.log" 2>&1 &
PIDS+=($!)
echo "  Sphere agent PID: ${PIDS[-1]}"

# Cylinder
claude -p "$(cat "$PROMPT_DIR/03-cylinder.md")" \
  $CLAUDE_FLAGS \
  > "$LOG_DIR/03-cylinder.log" 2>&1 &
PIDS+=($!)
echo "  Cylinder agent PID: ${PIDS[-1]}"

# Torus
claude -p "$(cat "$PROMPT_DIR/04-torus.md")" \
  $CLAUDE_FLAGS \
  > "$LOG_DIR/04-torus.log" 2>&1 &
PIDS+=($!)
echo "  Torus agent PID: ${PIDS[-1]}"

# Klein Bottle
claude -p "$(cat "$PROMPT_DIR/05-klein-bottle.md")" \
  $CLAUDE_FLAGS \
  > "$LOG_DIR/05-klein-bottle.log" 2>&1 &
PIDS+=($!)
echo "  Klein Bottle agent PID: ${PIDS[-1]}"

echo ""
echo "  Waiting for all 5 manifold agents to complete..."

FAILED=0
for i in "${!PIDS[@]}"; do
  wait "${PIDS[$i]}" || {
    echo "  WARNING: Agent with PID ${PIDS[$i]} exited with non-zero status."
    FAILED=$((FAILED + 1))
  }
done

echo "  All manifold agents finished at $(date '+%H:%M:%S')."
if [ $FAILED -gt 0 ]; then
  echo "  WARNING: $FAILED agent(s) reported errors. Check logs."
fi
echo "[Phase 1] Done."
echo ""

# ──────────────────────────────────────────────
# Phase 2: App Shell integration
# ──────────────────────────────────────────────
echo "[Phase 2] App Shell — integrating all components..."
echo "  Started at $(date '+%H:%M:%S')"

claude -p "$(cat "$PROMPT_DIR/06-app-shell.md")" \
  $CLAUDE_FLAGS \
  > "$LOG_DIR/06-app-shell.log" 2>&1

echo "  Finished at $(date '+%H:%M:%S')"
echo "[Phase 2] Done."
echo ""

# ──────────────────────────────────────────────
# Phase 3: Polish pass
# ──────────────────────────────────────────────
echo "[Phase 3] Polish — animations, accessibility, fixes..."
echo "  Started at $(date '+%H:%M:%S')"

claude -p "$(cat "$PROMPT_DIR/07-polish.md")" \
  $CLAUDE_FLAGS \
  > "$LOG_DIR/07-polish.log" 2>&1

echo "  Finished at $(date '+%H:%M:%S')"
echo "[Phase 3] Done."
echo ""

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
echo "============================================"
echo "  Orchestration Complete"
echo "============================================"
echo ""
echo "Log files:"
for f in "$LOG_DIR"/*.log; do
  echo "  $(basename "$f") — $(wc -l < "$f") lines"
done
echo ""

# Check what was created
echo "Created components:"
for comp in CircleManifold SphereManifold CylinderManifold TorusManifold KleinBottleManifold; do
  if [ -f "$PROJECT_DIR/src/components/${comp}.jsx" ]; then
    echo "  ✓ ${comp}.jsx"
  else
    echo "  ✗ ${comp}.jsx — MISSING"
  fi
done
echo ""

# Try building
echo "Running final build..."
cd "$PROJECT_DIR" && npm run build 2>&1 | tail -5
echo ""
echo "To start the dev server: cd $PROJECT_DIR && npm run dev"
