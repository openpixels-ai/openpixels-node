# Publishing Workflow for OpenPixels SDK

This document outlines the steps to publish a new version of the OpenPixels TypeScript/JavaScript SDK.

## Publishing a New Version (e.g., v0.1.1)

1. **Update the version number** in `package.json`:
   ```json
   {
     "name": "openpixels",
     "version": "0.1.1",
     ...
   }
   ```

2. **Run tests** to ensure everything is working properly:
   ```bash
   cd js-sdk
   npm run test
   ```

3. **Build the package** (optional, as this happens automatically during publishing due to the "prepublish" script):
   ```bash
   npm run build
   ```
   This uses tsup to compile the TypeScript code to both CommonJS and ESM formats with type definitions.

4. **Publish to npm**:
   ```bash
   npm login  # If not already logged in
   npm publish
   ```

5. **Create a git tag** for the new version (recommended):
   ```bash
   git tag -a v0.1.1 -m "Release v0.1.1"
   git push origin v0.1.1
   ```

## Package Configuration

The package is set up with:
- A `prepublish` script that runs the build process automatically before publishing
- Output files in both CommonJS (`dist/index.js`) and ESM (`dist/index.mjs`) formats
- Type definitions (`dist/index.d.ts`) for TypeScript users

## Post-Publishing Checklist

- Verify the package is accessible on npm: `npm view openpixels`
- Test installing the package in a new project: `npm install openpixels`
- Update documentation or website references to reflect the new version 