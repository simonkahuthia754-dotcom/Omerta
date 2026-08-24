# Omertà

A React + Vite application with Capacitor for cross-platform mobile development.

## Development

Install dependencies:
```bash
npm install
```

Start the dev server:
```bash
npm run dev
```

## Building

Build for web:
```bash
npm run build
```

Preview the build:
```bash
npm run preview
```

## Android Build (CI/CD)

The project uses GitHub Actions to automatically build Android APKs on push to `main` or `master` branches.

Artifacts are available in the Actions tab.

## Project Structure

- `src/` - React components and styles
- `index.html` - HTML entry point
- `vite.config.js` - Vite configuration
- `capacitor.config.json` - Capacitor configuration for mobile builds
- `.github/workflows/` - CI/CD workflows

## Technology Stack

- React 18.3.1
- Vite 5.4.1
- Capacitor 6.1.2
- Android SDK (for mobile builds)
