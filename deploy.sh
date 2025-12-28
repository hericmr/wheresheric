#!/bin/bash

set -e

# Clean and build
echo "Cleaning reference directories..."
rm -rf public/onde_esta_heric_trans public/vehicle-tracking public/cameras || true

echo "Building project..."
npm run build

echo "Cleaning reference directories from build..."
rm -rf build/onde_esta_heric_trans build/vehicle-tracking build/cameras || true

# Deploy using git subtree push to avoid E2BIG error
echo "Deploying to GitHub Pages..."
CURRENT_BRANCH=$(git branch --show-current)
git subtree push --prefix build origin gh-pages || {
    # If subtree push fails, create orphan branch
    echo "Creating fresh gh-pages branch..."
    git checkout --orphan gh-pages-temp
    git rm -rf . 2>/dev/null || true
    cp -r build/* .
    echo "/node_modules" > .gitignore
    git add -A
    git commit -m "Deploy to GitHub Pages - $(date)"
    git branch -D gh-pages 2>/dev/null || true
    git branch -m gh-pages
    git push -f origin gh-pages
    git checkout "$CURRENT_BRANCH"
}

echo "Deployment complete!"

