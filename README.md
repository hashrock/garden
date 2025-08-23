# Garden - Image Reference & Mood Board Tool

A PureRef-like image reference and mood board creation tool built with Vue 3 and TypeScript.

## Features

- 📷 **Image Management** - Drag & drop or paste images from clipboard
- 🖼️ **Infinite Canvas** - Pan and zoom across an unlimited workspace
- 🎯 **Selection Tools** - Click to select, rectangle selection, multi-select
- 📐 **Transform** - Move and resize images freely
- 💾 **Project Save/Load** - Save your boards as compressed .garden files
- ⌨️ **Keyboard Shortcuts** - Efficient workflow with familiar shortcuts

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

### Basic Operations

- **Add Images**: Drag & drop files or paste from clipboard (Ctrl/Cmd+V)
- **Navigate**: Click and drag to pan, scroll wheel to zoom
- **Select**: Click on images or drag to create selection rectangle
- **Move**: Drag selected images to reposition
- **Delete**: Press Delete key to remove selected images
- **Save Project**: Save your work as a .garden file
- **Load Project**: Open existing .garden files

### Keyboard Shortcuts

- `Space + Drag` - Pan the canvas
- `Ctrl/Cmd + V` - Paste image from clipboard
- `Delete` - Delete selected images
- `Ctrl/Cmd + Click` - Multi-select images

## Development

### Project Structure

```
garden/
├── src/
│   ├── components/      # Vue components
│   ├── composables/      # Composition API logic
│   ├── stores/          # Pinia stores
│   ├── types/           # TypeScript definitions
│   └── utils/           # Utility functions
├── tests/               # Test files
└── public/             # Static assets
```

### Testing

```bash
# Run unit tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Deployment

The project is automatically deployed to GitHub Pages when pushing to the main branch.

Live demo: [https://hashrock.github.io/garden/](https://hashrock.github.io/garden/)

## Technologies

- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **Language**: TypeScript
- **State Management**: Pinia
- **Styling**: TailwindCSS
- **Testing**: Vitest

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.