#!/bin/bash

# Script to convert Mermaid diagrams to images
# Prerequisites: npm install -g @mermaid-js/mermaid-cli

DIAGRAMS_DIR="docs/diagrams"
OUTPUT_DIR="docs/diagrams/images"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "Converting Mermaid diagrams to images..."

# Convert each .mmd file to PNG and SVG
for mmd_file in "$DIAGRAMS_DIR"/*.mmd; do
    if [ -f "$mmd_file" ]; then
        filename=$(basename "$mmd_file" .mmd)
        echo "Converting $filename..."
        
        # Convert to PNG (for presentations/documents)
        mmdc -i "$mmd_file" -o "$OUTPUT_DIR/${filename}.png" -w 1920 -H 1080
        
        # Convert to SVG (for web/scalable graphics)
        mmdc -i "$mmd_file" -o "$OUTPUT_DIR/${filename}.svg"
        
        echo "✅ Created: ${filename}.png and ${filename}.svg"
    fi
done

echo "🎉 All diagrams converted successfully!"
echo "📁 Images saved in: $OUTPUT_DIR"