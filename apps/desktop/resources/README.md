# Placeholder Icon Files

This directory should contain:
- `icon.png` - Application icon (1024x1024 PNG recommended)
- `icon.ico` - Windows icon file (256x256 ICO)

## Creating Icons

You can use online tools or software like:
- **ImageMagick**: `convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico`
- **Online converters**: https://convertio.co/png-ico/

## Recommended Sizes
- PNG: 1024x1024 (for macOS)
- ICO: 256x256 (for Windows)

## Temporary Icon
Until proper branding is created, you can:
1. Use a placeholder from https://placeholder.com
2. Create a simple colored square with the letter "O" for Omnia
3. Use a free icon from https://www.flaticon.com or https://icons8.com

For now, the build will use Electron's default icon if these files are missing.
