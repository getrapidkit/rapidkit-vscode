# RapidKit VS Code Extension - Media Assets

This directory contains media assets for the RapidKit VS Code extension.

## Files

- `icons/icon.png` - Extension icon (256x256 PNG)
- `icons/icon-128.png` - Extension icon small version (128x128 PNG)
- `icons/RapidKit.svg` - Original SVG icon (2048x2048)
- `rapidkit-sidebar-icon.svg` - Activity Bar sidebar icon
- `rapidkit-logo.png` - RapidKit logo (2048x2048)
- `screenshots/` - Screenshots for marketplace listing (to be added)

## Icon Guidelines

- **Main Icon**: 256x256 pixels (PNG with transparent background)
- **Small Icon**: 128x128 pixels (PNG with transparent background)
- **Format**: PNG for Marketplace, SVG for activity bar
- **Design**: Simple, recognizable at small sizes
- **Colors**: RapidKit brand colors

## Logo Guidelines

- Formats: SVG (vector) and PNG (raster)
- Maintain aspect ratio
- Use on light backgrounds

## Screenshots (TODO)

Screenshots should demonstrate:
1. Workspace creation wizard
2. Module explorer with categories
3. Template preview panel
4. IntelliSense in action (auto-completion/hover)
5. Project dashboard with tree views

**Requirements:**
- Size: Minimum 1280x720 pixels
- Format: PNG or JPEG
- Count: 3-5 screenshots recommended

## Brand Colors

- Primary: `#4F46E5` (Indigo)
- Secondary: `#FCD34D` (Yellow)
- Accent: `#F59E0B` (Amber)

## Converting SVG to PNG

To convert SVG to PNG:

```bash
# Using ImageMagick
convert -density 300 -background none icon.svg -resize 128x128 icon.png

# Or using Inkscape
inkscape -w 128 -h 128 icon.svg -o icon.png
```

## Attribution

All assets are proprietary to RapidKit and licensed under the MIT License.
