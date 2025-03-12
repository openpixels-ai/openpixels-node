# OpenPixels TypeScript/JavaScript SDK

A TypeScript SDK for accessing the OpenPixels API.

## Installation

```bash
npm install openpixels
# or
yarn add openpixels
# or
pnpm add openpixels
```

## Usage

```typescript
import { OpenPixels } from 'openpixels';

const client = new OpenPixels({
  apiKey: 'sk-op-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
});

// Generate an image
async function generateImage() {
  const result = await client.run({
    model: 'flux-dev',
    prompt: 'a cat',
  });
  
  console.log(result);
}

generateImage();
```

## API Reference

### `OpenPixels`

The main client for making synchronous calls to the OpenPixels API.

```typescript
const client = new OpenPixels({
  apiKey: "YOUR_API_KEY",
  baseUrl: "https://worker.openpixels.ai" // Optional, defaults to production API
});
```

#### Methods

- `run(payload)`: Submits a job and waits for the result.

<!-- - `submit(payload)`: Submits a job and returns the job ID.
- `subscribe(jobId)`: Subscribes to updates for a job. -->

### Publish a New Version
1. Bump the version in the `package.json` file
2. `git tag vX.Y.Z`
3. `git push origin vX.Y.Z`
4. `pnpm build`
5. `pnpm publish`

## License

MIT # openpixels-node
