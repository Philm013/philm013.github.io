---
name: calculate-math
description: Evaluate mathematical expressions, unit conversions, and percentages. Use for arithmetic, algebra, and numeric calculations.
metadata:
  category: built-in
  requires-embedding: false
  requires-web: false
  requires-secret: false
  homepage: https://philm013.github.io/CloudChat/skills/built-in/calculate-math
---

# Calculate Math

This skill evaluates mathematical expressions safely using JavaScript.

## Examples

* "What is 15% of 240?"
* "Calculate 2^10 + sqrt(144)"
* "Convert 72°F to Celsius: (72 - 32) * 5/9"
* "What is (1200 * 1.08) / 12?"

## Instructions

Call the `run_js` tool with the following exact parameters:
- script name: `index.html`
- data: A JSON string with the following field:
  - expression: String. The mathematical expression to evaluate (e.g., `"2 * 3 + 1"`, `"15 / 100 * 240"`).

### Rules
- Only pass numeric expressions. Do NOT pass natural language like "fifteen percent of 240" — convert it to a math expression first.
- Strip any units from the expression before passing it.
- Report the result with appropriate units and a brief explanation of what was calculated.
