# Frontend Graph

A standalone React application focused on graph visualization components using Neo4j NVL (Neo4j Visualization Library) and NDL (Neo4j Design Library).

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn

### Installation

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

## Usage

The `GraphViewer` component serves as the main entry point for graph visualization. It provides:

- A clean interface to open graph visualizations
- Integration with Neo4j NVL for interactive graphs
- Zoom controls and graph navigation
- Support for custom node and relationship data

## Integration

This frontend can be integrated with your backend API by:

1. Connecting to your Neo4j database
2. Fetching graph data (nodes and relationships)
3. Passing the data to the `GraphViewModal` component
4. Customizing the color scheme and styling as needed

## Development

The project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type checking

Run `yarn lint` to check for linting issues and `yarn format` to format code.

## License
