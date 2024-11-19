# [PianoToGuitar](https://pianotoguitar.com/): Guitar Chord Generator and Analyzer
*Created by [Lukas Marschhausen](https://lukhausen.de/)*

## Overview

View Online: [PianoToGuitar.com](https://pianotoguitar.com/)

**PianoToGuitar** is a web application designed for guitarists to explore chords, build progressions, and visualize fingerings. It recognizes chords based on input notes (via piano or MIDI), generates playable voicings, rates them for playability and sound quality, analyzes scales, transposes progressions, and provides interactive visualizations. It offers customizable tuning, automatic scale detection, and a drag-and-drop interface for building chord progressions, with URL sharing capabilities.


## Key Features

- **Chord Recognition:** Identifies chords based on user input through visual piano keyboard or MIDI keyboard.
- **Voicing Generation:** Generates all playable finger positions for a given chord in any tuning.
- **Playability and Sound Quality Rating:**  Evaluates each voicing algorithmically.
- **Customizable Tuning:** Supports any guitar tuning.
- **Automatic Scale Finder:** Analyzes progression and identifies the likely key.
- **Transposition:** Transposes entire progressions or individual chords to different keys.
- **Visual Chord Diagrams:** Displays finger positions, barre chords, and muted strings in SVG format.
- **Interactive Input:** Uses a visual piano keyboard or MIDI input for note entry.
- **Drag-and-Drop Interface:** Build progressions by dragging and dropping chords.
- **URL Sharing:** Easily share and bookmark chord progressions.

## Components

### 1. Chord Library (`src/chord-library/script.js`)

- **Purpose:** Manages a library of chords and provides chord searching and manipulation functionalities.
- **Classes:**
    - **`Chord`**:  Represents a single chord with its root note, notes, name, and custom root flag.
    - **`ChordLibrary`**:
        - Stores and manages a library of `Chord` objects.
        - Generates chords based on pre-defined chord structures.
        - Provides methods for searching chords based on played notes.
        - Allows transposing and simplifying slash chords.

### 2. Chord Factory (`src/chord-factory/`)

- **Purpose:** Generates and filters playable chord voicings based on input notes and guitar tuning.
- **Files:**
    - **`constants.js`:** Defines constants like standard tuning and note mappings.
    - **`chordfactory.js`:**
        - **`ChordFactory` class:**
            - Calculates all possible finger positions.
            - Uses worker threads (`CC.js`, `CF.js`) to generate and filter playable voicings.
            - Creates `ChordVoicing` objects and sorts them by a combined playability and sound quality rating.
    - **`chordvoicing.js`:**
        - **`ChordVoicing` class:** Represents a single chord voicing with details about finger positions, barre chords, and ratings.
        - Implements methods for calculating chord spacing and rating playability and sound quality.

### 3. Web MIDI Integration (`src/midi-integration/script.js`)

- **Purpose:** Handles MIDI input and events.
- **`MIDIAccessManager` class:**
    - Requests MIDI access and manages retries.
    - Sets the active MIDI device and handles device state changes.
    - Processes MIDI messages, dispatches custom events for note on/off, and outputs played notes.

### 4. Piano (`src/piano/script.js`)

- **Purpose:** Creates a visual piano keyboard for note input.
- **`Piano` class:**
    - Creates visual piano keys and adds event listeners.
    - Handles note activation/deactivation, root note selection, and sound playback.
    - Dispatches a `notesChanged` event when notes are played or the root note changes.

### 5. Progression Generator (`src/progression-generator/main.js`)

- **Purpose:** Generates HTML visualizations of chord progressions.
- **Classes:**
    - **`ChordFactoryManager`**: Manages and reuses `ChordFactory` instances for optimization.
    - **`ProgressionGenerator`**:
        - Sets and manages the chord progression.
        - Analyzes the key of the progression.
        - Generates HTML for dynamic, easy, and transposed progressions.
        - Creates placeholder HTML when needed.

### 6. Tab Generator (`src/tab-generator/script.js`)

- **Purpose:** Creates SVG diagrams of individual guitar chords.
- **`TabGenerator` class:**
    - Takes chord details as input and generates an SVG diagram.
    - Draws strings, frets, notes, mute indicators, open strings, barre chords, and fret height information.

### 7. Drag and Drop List (`src/drag-drop/script.js`)

- **Purpose:** Manages the drag-and-drop functionality for selecting chords and building progressions.
- **Classes:**
    - **`DragAndDropItem`**: Represents a chord with a probability score for display in the list.
    - **`DragAndDropList`**:
        - Manages the drag-and-drop list and handles item selection, filtering, reordering, and drop events.
        - Dispatches a `selectedItemsUpdated` event when the selection changes.

### 8. Main Application (`src/index.js`)

- **Purpose:** Integrates all components and handles user interactions and settings.
- **Initialization:** Creates instances of all core components.
- **Event Handling:** Manages events from components and updates the UI accordingly.
- **Settings Management:** Loads and saves user settings from `localStorage`.
- **URL Management:** Updates the URL with selected chords and loads chords from the URL.
- **UI Updates:** Updates the UI based on user actions and events.

## Data Flow

1. **User Input:** Notes are inputted through the Piano or MIDI keyboard.
2. **Chord Recognition:** The Chord Library analyzes notes and identifies possible chords.
3. **Voicing Generation:** The Chord Factory generates and rates playable voicings for each chord.
4. **Progression Building:** Users select chords and build progressions using the Drag and Drop List.
5. **Visualization:** The Progression Generator generates HTML with SVG chord diagrams.
6. **Key Analysis and Transposition:** The Progression Generator analyzes the key and allows transpositions.
7. **Settings Customization:** User settings influence chord generation, filtering, and visualization.

---

## Prerequisites

- [Node.js](https://nodejs.org/) (Ensure you have the latest LTS version installed)

## Installation

1. **Clone the repository:**

   ```sh
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install dependencies:**

   ```sh
   make "mpn install"
   ```

## Running the Testing Server

To start the testing server, use the following command:

```sh
make "npm run start"
```

This will launch the server, and you can access the application in your browser at the specified localhost address.

## Building the Project

To build the project for production, use the following command:

```sh
make "npm run build"
```

The build artifacts will be stored in the `dist/` directory. This command bundles the project files and optimizes them for production.

---

## Configuration Files

### .terserrc

The `.terserrc` file contains configurations for [Terser](https://github.com/terser/terser), a JavaScript compressor and minifier tool used to reduce the size of the JavaScript files.

### .parcelrc

The `.parcelrc` file configures [Parcel](https://parceljs.org/), a web application bundler. This file includes the setup for various plugins used in the project, such as the JavaScript obfuscator plugin.

### package.json

The `package.json` file is essential for Node.js projects. It includes metadata about the project and lists the dependencies. In this project, there is a `staticFiles` section that defines the static audio files to be bundled by the Parcel plugin `parcel-reporter-static-files-copy`. For more details, check the [parcel-reporter-static-files-copy documentation](https://www.npmjs.com/package/parcel-reporter-static-files-copy).

## Parcel Plugins Used

- **[parcel-reporter-static-files-copy](https://www.npmjs.com/package/parcel-reporter-static-files-copy)**: This plugin copies static files into the build directory, ensuring that necessary assets like audio files are included in the final build.
