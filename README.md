# Portland Parks Trees

![Screenshot of a heatmap displaying trees in Portland, Oregon city parks.](https://hosting.photobucket.com/bbcfb0d4-be20-44a0-94dc-65bff8947cf2/9547801e-223a-4179-ab16-0fe5a0b3f76d.png)

View data about trees in parks from Portland, Oregon as an interactive web-based heatmap.

## Overview

The Python script ingests a `Parks_Tree_Inventory.csv` file, auto-detects the encoding, converts the source X/Y coordinates into latitude/longitude and coerces many numeric attributes into real numbers. It then exports two outputs: a standard GeoJSON FeatureCollection and a lightweight JSON array optimized for loading directly in the browser.

On the frontend, the JavaScript app fetches `trees.json` and renders the points as an interactive Leaflet heatmap over OpenStreetMap tiles. It dynamically builds filter controls from the data and re-computes the displayed heat layer whenever the user changes a filter. The map also automatically fits to the dataset on load, shows a live tree count and provides other convenience actions.
