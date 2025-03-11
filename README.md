# Professional CAD/CAM Application

A modern, browser-based CAD/CAM application built with Next.js, TypeScript, Three.js, and TailwindCSS.

## Features

- Professional-grade CAD canvas similar to Hypermill
- Advanced 3D modeling with Three.js
- Comprehensive toolset for manipulating 3D objects
- Layer management system
- Responsive UI with light/dark mode support
- Performance optimizations for complex models

## Components

The application is structured around the following key components:

- **CADCanvas**: The core 3D rendering component with support for:
  - View controls (perspective, top, front, etc.)
  - Context menus
  - Measurement tools
  - Drag and drop capabilities
  - Status and notification systems

- **UI Components**:
  - Toolbars for quick access to common tools
  - Context-sensitive panels
  - Layer management
  - Property editors
  - Status indicators

## Setup and Development

### Prerequisites

- Node.js 16.x or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install
# or
yarn install
```

### Development

```bash
# Start the development server
npm run dev
# or
yarn dev
```

### Building for Production

```bash
# Build the application
npm run build
# or
yarn build

# Start the production server
npm start
# or
yarn start
```

## Project Structure

```
src/
├── components/     # React components
│   ├── cad/        # CAD-specific components
│   │   ├── canvas/     # Canvas and rendering components
│   │   ├── toolbar/    # Toolbar components
│   │   ├── panels/     # Panel components
│   │   ├── overlays/   # Overlay components
│   │   ├── ui/         # UI components
│   │   └── debug/      # Debugging components
├── hooks/         # Custom React hooks
├── lib/           # Utility functions and libraries
│   ├── canvas/    # Canvas-related utilities
├── pages/         # Next.js pages
├── store/         # State management
├── styles/        # Global styles
└── types/         # TypeScript type definitions
```

## License

This project is licensed under the MIT License.
