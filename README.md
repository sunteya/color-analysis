# Color Analysis

Interactive hue–luminance scatter plot of curated color dictionaries (Japanese 和色, Western 洋色, and Chinese 中国色).

## Homepage

Live demo: https://sunteya.github.io/color-analysis/

## What it does

- Visualizes colors on a 2D plot: horizontal axis is hue (H), vertical axis is lightness (L)
- Switch between datasets (JP/YO/CN)
- Drag or scroll to rotate/pan hue alignment
- Hover to see name and HEX; click a dot to copy HEX
- Input a custom HEX (e.g. `#409EFF`) to locate it on the plot
- Adjustable horizontal guide lines for quick comparisons

## Tech stack

- Vue 3 + Vite + TypeScript
- Tailwind CSS for styling
- Small utilities for color conversions (RGB ↔ HSL)

## Development

```sh
pnpm install
pnpm dev
```

## Build

```sh
pnpm build
```

## License

MIT
