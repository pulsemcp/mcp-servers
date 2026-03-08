# SVG Tracer MCP Server

An MCP server that converts bitmap images (PNG, JPG, BMP, GIF, TIFF, WebP) to SVG vector graphics using potrace tracing.

## Features

- Converts any common bitmap format to clean SVG vector paths
- Automatic preprocessing of transparent PNGs (alpha channel to black-on-white mask)
- Customizable tracing parameters (threshold, speckle suppression, curve optimization)
- Target size scaling for generating icons (e.g., 50x50 Dewey icons)
- Custom fill color and background support
- Works with the local filesystem by default (reads input, writes output to disk)

## Quick Start

### Using npx

```json
{
  "mcpServers": {
    "svg-tracer": {
      "command": "npx",
      "args": ["-y", "@pulsemcp/svg-tracer-mcp-server"]
    }
  }
}
```

### Manual Setup

```bash
git clone https://github.com/pulsemcp/mcp-servers.git
cd mcp-servers/productionized/svg-tracer
npm install
npm run build
npm start
```

## Tools

### `trace_bitmap_to_svg`

Convert a bitmap image to an SVG vector graphic using potrace tracing.

**Parameters:**

| Parameter       | Type   | Required | Description                                                          |
| --------------- | ------ | -------- | -------------------------------------------------------------------- |
| `input_path`    | string | Yes      | Absolute path to the input bitmap image file                         |
| `output_path`   | string | No       | Path for the output SVG (defaults to input path with .svg extension) |
| `threshold`     | number | No       | Black/white threshold 0-255 (default: 128)                           |
| `turd_size`     | number | No       | Suppress speckles up to this many pixels (default: 2)                |
| `opt_tolerance` | number | No       | Curve optimization tolerance 0-1 (default: 0.2)                      |
| `color`         | string | No       | Fill color for traced paths (default: "#000000")                     |
| `background`    | string | No       | Background color (default: "transparent")                            |
| `target_width`  | number | No       | Target SVG width in pixels                                           |
| `target_height` | number | No       | Target SVG height in pixels                                          |

**Example usage:**

```
Convert /tmp/logo.png to SVG:
trace_bitmap_to_svg(input_path="/tmp/logo.png")

Create a 50x50 icon with brand color:
trace_bitmap_to_svg(
  input_path="/tmp/logo.png",
  output_path="/tmp/logo-icon.svg",
  target_width=50,
  target_height=50,
  color="#FF5733"
)
```

## How It Works

1. **Read input** - Loads the bitmap image (PNG, JPG, BMP, GIF, TIFF, WebP)
2. **Preprocess** - Handles transparency by converting alpha channel to a black-on-white grayscale mask
3. **Trace** - Uses potrace to convert the bitmap to SVG vector paths
4. **Scale** - Optionally wraps paths in a transform group to fit target dimensions
5. **Output** - Writes the SVG to disk and returns the SVG string with metadata

## Supported Formats

- PNG (including transparent PNGs with alpha channel)
- JPEG / JPG
- WebP
- BMP
- GIF
- TIFF

## Development

```bash
npm install
npm run build
npm run dev          # Development mode with auto-reload
npm test             # Run functional tests
npm run test:run     # Run tests once
npm run test:integration  # Run integration tests
npm run test:all     # Run all tests
```

## License

MIT
