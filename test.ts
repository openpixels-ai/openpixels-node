import 'dotenv/config';
import { OpenPixels } from './src';

// Check if an API key is provided
const PROD_API_KEY = process.env.PROD_OPENPIXELS_API_KEY;
const DEV_API_KEY = process.env.DEV_OPENPIXELS_API_KEY;

if (!PROD_API_KEY) {
  console.error('Error: OPENPIXELS_API_KEY environment variable is required');
  console.error('Create a .env file with OPENPIXELS_API_KEY=your-api-key');
  process.exit(1);
}

// Create a client instance
const client = new OpenPixels({
  apiKey: PROD_API_KEY,
  baseUrl: "https://worker.openpixels.ai",
  // apiKey: DEV_API_KEY,
  // baseUrl: 'http://localhost:1729',
});

async function runTest() {
  console.log('Testing OpenPixels TypeScript SDK...');
  
  try {
    console.log('Generating an image with the prompt "a cat"...');
    
    const result = await client.run({
      // model: "wan-2.1-1.3b",
      // model: "ray-2",
      // model: "ray-2",
      // model: "veo-2",
      model: "flux-1.1-pro",
      // model: "flux-dev",
      // model: "veo-2",
      prompt: 'a cat runs through a field of flowers',
      width: 1024,
      height: 768,
      config: {
        routing: {
          // ordering: ['runware', 'fal']
          ordering: ['luma']
          // ordering: ['runware']
        }
      }
    })
    
    
    console.log('result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed with error:');
    console.error(error);
    process.exit(1);
  } 
}

// Run the test
runTest().catch(console.error); 