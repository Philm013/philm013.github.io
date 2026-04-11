---
name: interactive-map
description: Show an interactive map view for the given location, optionally searching for specific places nearby.
---

# Interactive map

## Examples

- "Show [a place] on interactive map"
- "Find [a place] on interactive map"
- "Show me donut shops near [a place]"
- "Find gas stations in [a city]"

## Instructions

Call the `run_js` tool with the following exact parameters:

- data: A JSON string with the following fields
  - location: The location to show on the map.
  - search_query: (Optional) A search term for places to find at the location (e.g. "donut shops", "restaurants").
