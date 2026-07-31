# Portland Parks Tree Inventory Heatmap

![Screenshot of a heatmap displaying trees in Portland, Oregon city parks.](https://hosting.photobucket.com/bbcfb0d4-be20-44a0-94dc-65bff8947cf2/9547801e-223a-4179-ab16-0fe5a0b3f76d.png)

Provides tools to process and visualize Portland's tree inventory as an interactive heatmap by combining a Python backend for data transformation with a modern JavaScript frontend.

## Application Overview

The Python script ingests a `Parks_Tree_Inventory.csv` file, auto-detects the encoding, converts the source X/Y coordinates into latitude/longitude and coerces many numeric attributes into real numbers. It then exports two outputs: a standard GeoJSON FeatureCollection and a lightweight JSON array for loading directly in the browser.

On the frontend, the JavaScript app fetches `trees.json` and renders the points as an interactive Leaflet heatmap over OpenStreetMap tiles. It dynamically builds filter controls from the data and re-computes the displayed heat layer whenever the user changes a filter. The map also automatically fits to the dataset on load, shows a live tree count and provides other convenience actions.

## Basic Setup Instructions

Below are the required software programs and instructions for installing and using this application on a Linux machine.

### Programs Needed

- [Git](https://git-scm.com/downloads)

- [Python](https://www.python.org/downloads/)

### Setup Steps

1. Install the above programs

2. Open a terminal

3. Clone this repository: `git clone git@github.com:devbret/portland-parks-trees.git`

4. Navigate to the repo's directory: `cd portland-parks-trees`

5. Create a virtual environment: `python3 -m venv venv`

6. Activate your virtual environment: `source venv/bin/activate`

7. Download the [source data](https://gis-pdx.opendata.arcgis.com/datasets/PDX::parks-tree-inventory/about) as a CSV file

8. Place the `Parks_Tree_Inventory.csv` file into the root directory of this repo

9. Process the raw data: `python3 app.py`

10. Launch an HTTP server: `python3 -m http.server`

11. Access the app in a browser: `http://localhost:8000`

12. When finished, close the HTTP server: `CTRL + C`

13. Exit the virtual environment: `deactivate`

## Other Considerations

This section highlights the specific technical skills and competencies demonstrated through this project, including data sourcing, backend processing with Python and frontend visualization using modern web development tools. As well as information about the license attached to this repo.

### Abilities Demonstrated

This project repo is intended to demonstrate an ability to do the following:

- Source interesting, relevant and publicly available data from an official government source

- Use Python to transform the raw data into a useable structure and format

- Visualize the Python output in an interactive and engaging fashion using modern web development tools

### License Information

This project is licensed under the MIT License, which allows for broad use, modification and distribution of the software. By choosing this license, you are provided a permissive framework while retaining ownership, ensuring that the software can be freely contributed to or built upon for both personal and commercial purposes.

If you have any questions or would like to collaborate, please reach out either on GitHub or via [my website](https://bretbernhoft.com/).
