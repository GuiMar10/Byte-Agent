#!/bin/bash

# Exit script if any command fails
set -e

echo "🔨 Building project and creating AppImage..."
npm run dist

echo "✅ Build complete! The AppImage can be found in the release/ directory."
