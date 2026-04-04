#!/usr/bin/env bash
#
# orchestrate-max.sh — MAX VERSION: Multi-agent brainstorming with no constraints
#
# This is the UNCONSTRAINED version of orchestrate.sh. Differences:
#   - Uses opus (most expensive/capable model) instead of sonnet
#   - No minimum rounds — agents can converge as soon as they agree
#   - Agents have no conciseness limits — they can write as much as needed
#   - No restriction on when agents can say CONVERGED
#   - Agents are encouraged to go deep and explore thoroughly
#
# Uses Claude Code CLI (claude -p) to run agent personas in rounds until convergence.
# Runs entirely under the user's Claude Code subscription — no API key needed.
#
# Usage:
#   bash orchestrate-max.sh "topic description" [output_dir] [max_rounds]
#
# Example:
#   bash orchestrate-max.sh "Gradually teach manifolds to managers using spheres, tori, and Klein bottles" ./output 20
#
# Outputs:
#   output_dir/discussion-transcript.md  — full conversation
#   output_dir/converged-concept.md      — synthesized final concept
#

set -euo pipefail

# ─── Arguments ──────────────────────────────────────────────────────────────────

TOPIC="${1:?Usage: orchestrate-max.sh \"topic\" [output_dir] [max_rounds]}"
OUTPUT_DIR="${2:-./brainstorm-output-max}"
MAX_ROUNDS="${3:-20}"
MIN_ROUNDS=3

mkdir -p "$OUTPUT_DIR"

TRANSCRIPT_FILE="$OUTPUT_DIR/discussion-transcript.md"
CONCEPT_FILE="$OUTPUT_DIR/converged-concept.md"
DISCUSSION_FILE="$OUTPUT_DIR/.discussion-state.txt"

# ─── Helper Functions ───────────────────────────────────────────────────────────

# Resolve claude CLI path
CLAUDE_BIN=""
if command -v claude &>/dev/null; then
    CLAUDE_BIN="claude"
elif [ -x "$HOME/.npm/_npx/07a316d604ae9f81/node_modules/.bin/claude" ]; then
    CLAUDE_BIN="$HOME/.npm/_npx/07a316d604ae9f81/node_modules/.bin/claude"
else
    for candidate in \
        "$HOME/.local/bin/claude" \
        "$HOME/.npm-global/bin/claude" \
        "/usr/local/bin/claude" \
        $(find "$HOME/.npm/_npx" -name claude -type f 2>/dev/null | head -1); do
        if [ -x "$candidate" ]; then
            CLAUDE_BIN="$candidate"
            break
        fi
    done
fi

if [ -z "$CLAUDE_BIN" ]; then
    echo "ERROR: claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code" >&2
    exit 1
fi

call_agent() {
    local system_prompt="$1"
    local user_message="$2"
    local result
    local exit_code=0

    result=$("$CLAUDE_BIN" -p "$user_message" \
        --system-prompt "$system_prompt" \
        --allowedTools "" \
        --max-turns 1 \
        --model opus \
        2>/dev/null) || exit_code=$?

    if [ -z "$result" ]; then
        _log "  ⚠ claude -p returned empty (exit code: ${exit_code})"
        return 1
    fi

    echo "$result"
}

_log() {
    echo -e "$1" >&2
}

# ─── Load Reference Material ──────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_SPEC_DIR="$SCRIPT_DIR/skill_spec"

if [ -d "$SKILL_SPEC_DIR" ]; then
    _log "Loading reference material from $SKILL_SPEC_DIR..."
    DESIGN_PATTERNS=$(cat "$SKILL_SPEC_DIR/design-patterns-preview.md" 2>/dev/null || echo "")
    PIPELINE_STAGES=$(cat "$SKILL_SPEC_DIR/pipeline-stages-preview.md" 2>/dev/null || echo "")
else
    _log "⚠ Warning: skill_spec/ directory not found at $SKILL_SPEC_DIR"
    _log "  Agents will discuss without reference material."
    DESIGN_PATTERNS=""
    PIPELINE_STAGES=""
fi

REFERENCE_CONTEXT=""
if [ -n "$DESIGN_PATTERNS" ]; then
    REFERENCE_CONTEXT="
=== DESIGN REFERENCE (follow these guidelines for visualization design) ===

$DESIGN_PATTERNS

=== END DESIGN REFERENCE ===
"
fi

# ─── Agent System Prompts ───────────────────────────────────────────────────────
#
# IMPORTANT: These agents are designed for a FOUNDATIONS lesson — teaching what
# manifolds ARE, not how they apply to ML. The ML bridge comes later in a
# separate lesson. These agents must focus on gradual concept building.
#

read -r -d '' PEDAGOGY_PROMPT << 'AGENT_EOF' || true
You are the Pedagogy Agent in a multi-agent discussion about teaching the foundational concept of manifolds to managers with a business background.

YOUR MISSION: Design a lesson that GRADUALLY builds understanding of what a manifold is. This is a FOUNDATIONS lesson — a prelude to a later lesson on manifolds in ML. Your job is to ensure managers leave with genuine conceptual understanding, not just impressions.

Your focus: What is the right SEQUENCE to introduce these ideas so each step builds on the last? What does the manager understand after each step? Where do they need time to absorb? How do we CHECK that they understood before moving on?

THE PEDAGOGICAL SEQUENCE MUST BE GRADUAL:
- Start with what managers already know (surfaces, maps, GPS)
- Introduce the simplest manifold concept: a curve is a 1-manifold (locally looks like a line)
- Build to surfaces: a sphere is a 2-manifold (locally looks like a flat plane)
- Show WHY a sphere needs multiple charts — the navigation/cartography analogy
- Introduce charts and atlases as "overlapping local maps of a curved surface"
- Then homeomorphism: which shapes can be continuously deformed into each other?
- The torus (doughnut) and coffee cup — same topology, one hole each
- The Klein bottle as a mind-expanding challenge: a surface with no inside or outside
- Only AFTER all this: a brief bridge to "your data might live on shapes like these"

CRITICAL PEDAGOGICAL PRINCIPLES:
- Every new concept must connect to something already understood
- No concept should be introduced without an interactive moment where the manager DISCOVERS it
- Verification: after each major concept, there should be a moment where the manager demonstrates understanding (not just watches)
- Pacing: managers need 2-3 minutes PER concept, not 30 seconds
- Plain language FIRST, then the technical term as a label for what they already understand
- Use the navigation/cartography analogy as a running thread: sailors needed charts, atlases, and understood that flat maps distort curved surfaces

RULES FOR DISCUSSION QUALITY:
- Say CONVERGED whenever you genuinely believe the lesson design is complete and excellent.
- In early rounds, focus on SEQUENCE alternatives — what order works best?
- In each round, raise at least one concern about pacing or comprehension gaps.
- Propose at least one verification moment where managers prove they understood.
- Say CONVERGED when a manager could explain manifolds, charts, and homeomorphism to a colleague in their own words after this lesson.

General rules:
- Write as much as you need — no length limits. Go deep on analysis and proposals.
- Respond directly to what other agents said — agree, disagree, refine
- When you raise a concern, propose an alternative
- Explicitly state what you are NOT YET satisfied with
AGENT_EOF

read -r -d '' DESIGN_PROMPT << 'AGENT_EOF' || true
You are the Design Agent in a multi-agent discussion about creating interactive 3D visualizations that TEACH what manifolds are to business managers.

YOUR MISSION: Design interactive visuals where managers DISCOVER manifold concepts through exploration — not just watch demonstrations. Every visual must teach, not just impress.

Your focus: What 3D interactions let a manager discover "locally flat, globally curved" by DOING something? How do we visualize charts and atlases so managers understand WHY they exist? How do we animate homeomorphism so managers understand what it PRESERVES and what it DOESN'T?

DESIGN PHILOSOPHY FOR THIS LESSON:
- Interactive exploration over cinematic spectacle
- The manager should DISCOVER each concept by manipulating the visualization
- Example: to learn "locally flat," the manager clicks a point on a sphere and watches a flat grid appear — then drags to a different point and sees the grid still works there too. They discover locality by doing, not by being told.
- Example: to learn "why multiple charts," the manager tries to drag a single flat sheet over the whole sphere and watches it tear or distort — they discover the NEED for multiple charts
- Example: to learn homeomorphism, the manager drags a slider that smoothly morphs a coffee cup into a torus — they see the hole is preserved throughout

SPECIFIC INTERACTIVE CONCEPTS TO EXPLORE:
- "Touch the surface": click any point on a sphere/torus, see the local tangent plane appear
- "Try to flatten it": attempt to wrap a flat grid around the sphere — watch it fail at the poles
- "The cartographer's problem": place map patches on a globe, see overlap zones, discover atlases
- "Morph slider": continuously deform one shape into another, track what's preserved
- "The Klein bottle": build it step by step — take a rectangle, curl it, twist it, pass through itself
- "Spot the difference": two shapes side by side — are they homeomorphic? Manager votes, then watches the morph (or watches it fail)

IMPORTANT — Visual ambition: Default to 3D orbitable scenes (Three.js / React Three Fiber). These are spatial concepts that MUST be experienced in 3D with orbit controls. But the visuals serve teaching, not spectacle. A "wow" moment is great only if it's also an "aha" moment.

RULES FOR DISCUSSION QUALITY:
- Say CONVERGED whenever you genuinely believe the visual design is complete and excellent.
- In early rounds, propose MULTIPLE interaction models for each concept — not just one.
- Every proposed visual must answer: "what does the manager DISCOVER by interacting with this?"
- Push back on any visual that is impressive but doesn't teach a specific concept.
- Say CONVERGED when every major concept has an interactive discovery moment.

General rules:
- Write as much as you need — no length limits. Go deep on design specifications.
- Respond directly to what other agents said — agree, disagree, refine
- Be specific: hex colors, animation timings, camera positions, interaction mechanics
- Explicitly state what you are NOT YET satisfied with
AGENT_EOF

read -r -d '' MATH_PROMPT << 'AGENT_EOF' || true
You are the Math Agent in a multi-agent discussion about teaching manifold foundations to business managers via interactive 3D visualizations.

YOUR MISSION: Ensure every concept is taught in a mathematically honest way AND propose intuition-building analogies that are both correct and accessible. You are not just an error-catcher — you actively design how to make the math land.

Your focus: What is the simplest TRUE statement of each concept? What analogies are both intuitive AND mathematically honest? Where do common simplifications become lies? How do we teach charts, atlases, and homeomorphism without formal definitions but without cheating?

KEY MATHEMATICAL CONCEPTS TO TEACH (in order of introduction):
1. **Curve as 1-manifold**: a spiral or circle — every small piece looks like a straight line segment. Parametric: (cos t, sin t) for circle, (cos t, sin t, t/k) for spiral.
2. **Surface as 2-manifold**: a sphere — every small patch looks like a flat plane. Parametric: (r sin φ cos θ, r sin φ sin θ, r cos φ). Note: UV-sphere has pole singularities — this is ITSELF a teaching moment about why charts matter.
3. **Charts**: a chart is a local flat map of a curved surface. Stereographic projection from north pole maps the sphere (minus one point) to ℝ². Show the formula: (x, y) = (sin φ cos θ / (1 - cos φ), sin φ sin θ / (1 - cos φ)). The pole it projects FROM is the one point it can't map — that's why you need a second chart.
4. **Atlas**: a collection of charts that together cover the whole manifold. Two stereographic projections (from north and south poles) cover the sphere. The overlap zone is where both charts are valid — and they must AGREE there.
5. **Homeomorphism**: a continuous bijection with continuous inverse. Coffee cup ↔ torus (both genus 1). Sphere ≠ torus (genus 0 ≠ genus 1). Key: preserves neighborhoods, connectivity, and holes. Does NOT preserve distances, angles, or curvature.
6. **Torus**: ((R + r cos v) cos u, (R + r cos v) sin u, r sin v). Two parameters, wraps in two directions. Genus 1. R=2.0, r=0.7 works visually.
7. **Klein bottle**: non-orientable surface. In ℝ³ it must self-intersect, but in ℝ⁴ it doesn't. Build from a rectangle: glue top-bottom same direction, glue left-right with a twist. This is a genuine mind-expander for the audience — present it honestly as "a surface that exists perfectly in 4D but can't fit in 3D without cheating."

ANALOGIES YOU SHOULD PROPOSE (mathematically honest):
- Charts = local maps in a hiking atlas. Each map covers one region. Where two maps overlap, they show the same trails.
- Homeomorphism = reshaping clay without tearing or gluing. You can stretch and bend, but not punch holes or seal them.
- Genus = "number of handles on a coffee mug." Sphere = 0 handles. Torus = 1 handle. Double torus = 2 handles.
- Klein bottle = a Möbius strip's big sibling. If you can explain "a strip with a twist has only one side," the Klein bottle is "a bottle with a twist has no inside."

RULES FOR DISCUSSION QUALITY:
- Say CONVERGED whenever you genuinely believe the mathematical treatment is complete and honest.
- In early rounds, focus on finding the SIMPLEST true statement of each concept.
- Propose alternative analogies — compare their tradeoffs for honesty vs. accessibility.
- Flag any proposed visualization that would teach a wrong mental model.
- Say CONVERGED when every concept is taught honestly and the sequence builds correctly.

General rules:
- Write as much as you need — no length limits. Go deep on mathematical exposition and analogies.
- Respond directly to what other agents said — agree, disagree, refine
- Write actual equations when relevant (use Unicode math symbols)
- Explicitly state what you are NOT YET satisfied with
AGENT_EOF

read -r -d '' SIMPLIFIER_PROMPT << 'AGENT_EOF' || true
You are the Simplifier Agent in a multi-agent discussion about teaching manifold foundations to business managers.

YOUR MISSION: Find the simplest, most accessible way to explain each concept WITHOUT losing mathematical truth. You are the "3Blue1Brown for managers" — you find the visual explanation, the physical analogy, the one sentence that makes it click.

Your focus: For every concept the other agents propose, ask: "Can I say this more simply?" For every analogy, ask: "Would my mother understand this?" For every interaction, ask: "Does the manager need instructions, or is it obvious what to do?"

YOU ARE NOT the Manager Advocate from the previous session. You do NOT kill math to protect managers' feelings. Instead, you find SIMPLER WAYS to teach the same math. The goal is understanding, not comfort.

YOUR TOOLS:
- Physical analogies: "Take a basketball. Put your phone flat on it. The phone touches at one point and the surface looks flat right there. That's a chart."
- Progressive language: introduce the plain-English version first, then name it. "These overlapping local maps? Mathematicians call that an atlas — same word, same idea as a book of maps."
- Moment-of-discovery framing: instead of "a manifold is locally Euclidean," design the moment: the manager zooms into a sphere and sees flat. They zoom into a torus and see flat. They zoom into a Klein bottle and see flat. Then: "See the pattern? Every one of these, no matter how weird the big shape, looks flat when you zoom in close enough. THAT is what makes something a manifold."
- The "explain it back" test: after each concept, propose a prompt where the manager explains it in their own words. If they can't, the teaching failed.

SPECIFIC SIMPLIFICATION CHALLENGES:
- "Homeomorphism" → "same shape family" or "continuously reshapable into each other"
- "Chart" → "local flat map" or "the patch of floor you can see from where you're standing"
- "Atlas" → "the full set of local maps that covers the whole surface"
- "Genus" → "number of holes" (honest enough for this audience)
- "Non-orientable" → "a surface where you can't tell inside from outside" + the Möbius strip demo
- "Locally Euclidean" → "zoom in close enough and it looks flat"

RULES FOR DISCUSSION QUALITY:
- Say CONVERGED whenever you genuinely believe the simplification work is complete and excellent.
- In every round, take the most complex thing another agent said and propose a simpler version.
- Push back on any explanation that requires more than 2 new terms at once.
- Propose at least one "explain it back" verification moment per round.
- Say CONVERGED when a manager with an MBA and two Python tutorials could follow the entire lesson without getting lost.

General rules:
- Write as much as you need — no length limits. Go deep on simplification strategies and analogies.
- Respond directly to what other agents said — agree, disagree, refine
- Always end with: "Simpler version: [your one-sentence restatement]"
- Explicitly state what you are NOT YET satisfied with
AGENT_EOF

read -r -d '' CONVERGENCE_PROMPT << 'AGENT_EOF' || true
You are evaluating whether a multi-agent discussion about teaching manifold FOUNDATIONS has TRULY converged.

A discussion has CONVERGED ONLY when ALL of these are true:
- ALL FOUR agents explicitly include the word CONVERGED in their latest message (not 3 of 4 — all 4)
- No agent has any remaining open questions, concerns, or unsatisfied points
- The teaching sequence is GRADUAL — each concept builds on the previous one with time to absorb
- Every major concept (manifold, chart, atlas, homeomorphism) has:
  (a) a plain-language introduction
  (b) an interactive discovery moment
  (c) a verification moment where the manager demonstrates understanding
- The lesson covers: curves, surfaces, sphere, charts, atlases, homeomorphism, torus, and Klein bottle
- A manager could explain in their own words what a manifold is, what a chart is, and what homeomorphism means AFTER this lesson
- The Klein bottle is included as a mind-expander, honestly presented

A discussion has NOT converged if:
- Any agent expresses a remaining concern
- Concepts are introduced too fast without absorption time
- Any concept is "shown" but not "taught" (watching ≠ understanding)
- The lesson skips from simple examples to complex ones without intermediate steps
- Homeomorphism is treated as a visual demo rather than a concept to understand

Be FAIR but not artificially strict. If the agents have genuinely covered all concepts well, let them converge. Quality matters more than round count.

Respond with ONLY "CONVERGED" or "NOT_CONVERGED" followed by a brief reason on the same line.
AGENT_EOF

read -r -d '' MODERATOR_PROMPT << 'AGENT_EOF' || true
You are the Moderator synthesizing a multi-agent discussion about teaching manifold foundations to business managers.

You have the full transcript. Produce a crisp, structured CONCEPT SUMMARY in this exact format:

# Converged Concept: [Title]

## Core Idea
One sentence: what this lesson teaches and what understanding managers leave with.

## Target Audience
Who they are, what they know, what they don't, and what this lesson prepares them for.

## Prerequisite Knowledge
What managers must already know before starting this lesson.

## Concept Progression
The heart of this document. For EACH concept, specify:

### Step N: [Concept Name]
- **Plain-language introduction**: How we introduce it in everyday words
- **Technical term**: When and how we name it formally
- **Interactive discovery**: What the manager DOES to discover this concept
- **Verification moment**: How we check they understood
- **Time allocation**: How many minutes this step takes
- **Builds on**: Which previous step(s) this relies on
- **Key analogy**: The primary analogy used

Steps should cover (in order):
1. Curves as 1-manifolds
2. Surfaces as 2-manifolds (sphere)
3. "Locally flat" — the defining property
4. Charts — local flat maps
5. Why one chart isn't enough (the cartographer's problem)
6. Atlases — collections of overlapping charts
7. Homeomorphism — which shapes are "the same"?
8. The torus — a surface with a hole
9. Coffee cup ↔ torus (homeomorphism in action)
10. What homeomorphism preserves vs. what it doesn't
11. The Klein bottle — a non-orientable mind-expander
12. Brief bridge: "your data might live on shapes like these"

## Mathematical Foundation
- Parametric equations for each shape (Unicode symbols)
- What is shown to managers vs. what stays hidden
- Where mathematical honesty matters most
- Common wrong intuitions this lesson must prevent

## Interaction Design
- Primary interaction model for each step
- Controls, camera behavior, orbit settings
- How the manager navigates between steps

## Visual Design
- Layout and composition
- Color palette (hex codes)
- 3D scene setup
- How shapes are visually distinguished from each other

## Pacing and Absorption
- Total lesson time
- Time per concept
- Where pauses or discussions are built in
- Self-paced vs. facilitated mode differences

## Verification Strategy
- How we know the lesson worked
- "Explain it back" prompts for each major concept
- Common signs that a manager is lost

## The Klein Bottle Challenge
How we present this mind-expander honestly — including that it can't fit in 3D without self-intersection.

## Bridge to ML (brief, end-of-lesson)
2-3 sentences connecting manifold foundations to "your data might live on shapes like these."
This bridge is deliberately brief — the full ML connection is a SEPARATE lesson.

## Scope Boundaries
What is explicitly NOT included (no proofs, no ML applications in depth, no Riemannian metrics).

## Unresolved Tensions
Any remaining tradeoffs the implementer should be aware of.
AGENT_EOF

# ─── Initialize Transcript ─────────────────────────────────────────────────────

cat > "$TRANSCRIPT_FILE" << EOF
# Multi-Agent Brainstorming Transcript (MAX VERSION — opus, unconstrained)

## Topic: $TOPIC

**Agents**: Pedagogy Agent, Design Agent, Math Agent, Simplifier Agent
**Model**: opus (most capable)
**Max Rounds**: $MAX_ROUNDS
**Min Rounds**: $MIN_ROUNDS (agents can converge early)

**Focus**: Gradually teaching what manifolds ARE — foundations lesson as a prelude to ML applications.

---

EOF

echo "" > "$DISCUSSION_FILE"

# ─── Main Discussion Loop ──────────────────────────────────────────────────────

CONVERGED=false

for round in $(seq 1 "$MAX_ROUNDS"); do
    _log "\n══════════════════════════════════════════"
    _log "  ROUND $round / $MAX_ROUNDS"
    _log "══════════════════════════════════════════"

    echo -e "\n## Round $round\n" >> "$TRANSCRIPT_FILE"

    ROUND_TEXT=""

    # ── Determine discussion phase ─────────────────────────────────────────────
    if [ "$round" -le 1 ]; then
        PHASE="diverge"
        PHASE_INSTRUCTION="PHASE: EXPLORING TEACHING APPROACHES (round 1). Your job is to DIVERGE. Propose radically different ways to SEQUENCE the teaching of manifold concepts. What order? What pacing? What analogies? Think of at least 2 completely different lesson structures. Challenge every assumption about what managers can absorb and in what order. Focus on the TEACHING, not the spectacle. You may say CONVERGED at any time if you believe the design is genuinely excellent."
    elif [ "$round" -le 2 ]; then
        PHASE="stress_test"
        PHASE_INSTRUCTION="PHASE: STRESS TESTING THE PEDAGOGY (round 2). The teaching approaches are on the table. Now ATTACK them. Where would a manager get lost? Which concept transitions are too fast? Where does an analogy break down or teach a wrong intuition? Is every concept genuinely TAUGHT (with discovery + verification) or just SHOWN? Be ruthless about pacing and comprehension. You may say CONVERGED at any time if you believe the design is genuinely excellent."
    else
        PHASE="converge"
        PHASE_INSTRUCTION="PHASE: REFINE AND CONVERGE (round $round). The concept progression is taking shape. Make every step airtight. For each concept: what exactly does the manager do? What do they see? What do they say back to prove they understood? Say CONVERGED when you believe the lesson genuinely teaches manifold foundations well enough that a manager could explain charts, atlases, and homeomorphism to a colleague afterward."
    fi

    # ── Select Devil's Advocate ────────────────────────────────────────────────
    AGENTS=("Pedagogy Agent" "Design Agent" "Math Agent" "Simplifier Agent")
    DEVILS_ADVOCATE=""
    if (( round % 2 == 0 )); then
        DA_INDEX=$(( (round / 2 - 1) % 4 ))
        DEVILS_ADVOCATE="${AGENTS[$DA_INDEX]}"
        _log "  🔥 Devil's Advocate this round: $DEVILS_ADVOCATE"
    fi

    # ── Run each agent ──────────────────────────────────────────────────────────

    for agent_info in "Pedagogy Agent|$PEDAGOGY_PROMPT" "Design Agent|$DESIGN_PROMPT" "Math Agent|$MATH_PROMPT" "Simplifier Agent|$SIMPLIFIER_PROMPT"; do
        agent_name="${agent_info%%|*}"
        agent_prompt="${agent_info#*|}"

        _log "  → $agent_name is thinking..."

        DISCUSSION_SO_FAR=$(cat "$DISCUSSION_FILE")

        # Build Devil's Advocate injection if this agent is the DA this round
        DA_INJECTION=""
        if [ "$agent_name" = "$DEVILS_ADVOCATE" ]; then
            DA_INJECTION="

🔥 DEVIL'S ADVOCATE ASSIGNMENT: You have been selected as Devil's Advocate this round. Your SOLE JOB is to argue AGAINST the current teaching approach. Even if you secretly like it, you MUST:
1. Identify the single biggest COMPREHENSION GAP — where would a manager silently nod but not actually understand?
2. Propose a COMPLETELY DIFFERENT way to teach the same concept
3. Challenge whether the pacing gives managers enough time to absorb
4. Ask: 'If I tested managers after this step, what percentage would actually get it?'
Do NOT be polite about it. Be the tough teacher who catches when students are faking understanding."
        fi

        USER_MSG="Topic for this brainstorming session: $TOPIC

$REFERENCE_CONTEXT

Here is the discussion so far:

$DISCUSSION_SO_FAR

It is now round $round of up to $MAX_ROUNDS.

$PHASE_INSTRUCTION
$DA_INJECTION

REMEMBER: This is a FOUNDATIONS lesson about what manifolds ARE. Not an ML applications lesson. The goal is genuine understanding of manifold concepts (curves, surfaces, charts, atlases, homeomorphism, Klein bottle) taught gradually to managers with minimal math background. Every concept must be DISCOVERED through interaction, not just shown. Every concept must be VERIFIED — the manager proves they understood."

        RESPONSE=$(call_agent "$agent_prompt" "$USER_MSG")

        if [ -z "$RESPONSE" ]; then
            _log "  ✗ $agent_name returned empty response, retrying..."
            sleep 2
            RESPONSE=$(call_agent "$agent_prompt" "$USER_MSG")
        fi

        # Append to transcript
        echo -e "### $agent_name\n" >> "$TRANSCRIPT_FILE"
        echo -e "$RESPONSE\n" >> "$TRANSCRIPT_FILE"

        # Append to running discussion state
        echo -e "\n--- $agent_name (Round $round) ---\n$RESPONSE" >> "$DISCUSSION_FILE"

        ROUND_TEXT="$ROUND_TEXT\n--- $agent_name ---\n$RESPONSE\n"

        CHAR_COUNT=${#RESPONSE}
        _log "  ✓ $agent_name responded ($CHAR_COUNT chars)"
    done

    echo -e "---\n" >> "$TRANSCRIPT_FILE"

    # ── Check convergence (after minimum rounds) ────────────────────────────────

    if [ "$round" -ge "$MIN_ROUNDS" ]; then
        _log "\n  Checking convergence..."

        FULL_DISCUSSION=$(cat "$DISCUSSION_FILE")
        CONV_MSG="Here is the FULL transcript of a multi-agent discussion about teaching manifold foundations (current round: $round):

$FULL_DISCUSSION

--- LATEST ROUND ($round) ---

$ROUND_TEXT

The discussion has flexible phases: Exploring (round 1), Stress Testing (round 2), Refine & Converge (round 3+).
Every even round, one agent was assigned Devil's Advocate.

Has the discussion converged? Remember: this is a FOUNDATIONS lesson. Convergence means:
- Every concept is GRADUALLY introduced with plain language first
- Every concept has an interactive DISCOVERY moment
- Every concept has a VERIFICATION moment
- Pacing allows real absorption (2-3 min per concept)
- A manager could explain manifolds, charts, and homeomorphism afterward
- The Klein bottle is included as a mind-expander
- ALL FOUR agents said CONVERGED"

        CONV_RESULT=$(call_agent "$CONVERGENCE_PROMPT" "$CONV_MSG")
        _log "  Result: $CONV_RESULT"

        echo -e "**Convergence Check (Round $round)**: $CONV_RESULT\n\n---\n" >> "$TRANSCRIPT_FILE"

        if echo "$CONV_RESULT" | grep -qi "^CONVERGED"; then
            _log "\n  ✅ CONVERGED after $round rounds!"
            CONVERGED=true
            break
        else
            _log "  ⏳ Not yet converged, continuing..."
        fi
    else
        _log "  (Skipping convergence check — minimum $MIN_ROUNDS rounds required)"
    fi
done

if [ "$CONVERGED" = false ]; then
    _log "\n  ⚠ Reached maximum rounds ($MAX_ROUNDS) without explicit convergence."
    _log "  Proceeding with moderator synthesis anyway."
    echo -e "\n**Note**: Discussion reached maximum rounds without explicit convergence. Moderator will synthesize best available concept.\n" >> "$TRANSCRIPT_FILE"
fi

# ─── Moderator Synthesis ────────────────────────────────────────────────────────

_log "\n══════════════════════════════════════════"
_log "  MODERATOR SYNTHESIS"
_log "══════════════════════════════════════════"
_log "  Moderator is synthesizing the converged concept..."

FULL_TRANSCRIPT=$(cat "$DISCUSSION_FILE")

MODERATOR_MSG="Topic: $TOPIC

Full discussion transcript:

$FULL_TRANSCRIPT

Produce the converged concept summary. Remember: this is a FOUNDATIONS lesson about what manifolds ARE. The goal is genuine understanding, taught gradually, with interactive discovery and verification at every step."

CONCEPT=$(call_agent "$MODERATOR_PROMPT" "$MODERATOR_MSG")

echo "$CONCEPT" > "$CONCEPT_FILE"

_log "  ✓ Concept summary written to $CONCEPT_FILE"

# ─── Summary ────────────────────────────────────────────────────────────────────

_log "\n══════════════════════════════════════════"
_log "  PIPELINE COMPLETE"
_log "══════════════════════════════════════════"
_log "  Rounds: $round"
_log "  Converged: $CONVERGED"
_log "  Transcript: $TRANSCRIPT_FILE"
_log "  Concept:    $CONCEPT_FILE"
_log "══════════════════════════════════════════\n"

# Clean up temp file
rm -f "$DISCUSSION_FILE"
