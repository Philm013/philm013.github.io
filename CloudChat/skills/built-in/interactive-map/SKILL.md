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

Call the `interactive_map` tool with the following parameters:
- `location`: String. **Required.** The location to show on the map.
- `search_query`: String. **Optional.** A search term for places to find at the location (e.g. "donut shops", "restaurants").
