#!/bin/bash
set -e
echo "Building Mahi AI..."

# Try vite build first
if npx vite build 2>/dev/null; then
  echo "Vite build succeeded!"
  exit 0
fi

echo "Vite build failed, falling back to esbuild..."

# Fallback: use esbuild + tailwind directly
mkdir -p dist/assets

# Build JS
npx esbuild src/main.tsx \
  --bundle \
  --format=esm \
  --outdir=dist/assets \
  --entry-names=index \
  --loader:.css=text

# Build CSS
npx tailwindcss -i src/index.css -o dist/assets/index.css --minify

# Copy static files
cp public/mahi.svg dist/mahi.svg

# Create _redirects for SPA
echo "/*    /index.html   200" > dist/_redirects

# Update index.html to point to built files
sed 's|<script type="module" src="/src/main.tsx"></script>|<link rel="stylesheet" href="/assets/index.css">\n    <script type="module" src="/assets/index.js"></script>|' index.html > dist/index.html

echo "Build complete!"
