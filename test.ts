import 'dotenv/config';
import { OpenPixels } from './src';

// Check if an API key is provided
const API_KEY = process.env.OPENPIXELS_API_KEY;
if (!API_KEY) {
  console.error('Error: OPENPIXELS_API_KEY environment variable is required');
  console.error('Create a .env file with OPENPIXELS_API_KEY=your-api-key');
  process.exit(1);
}

// Create a client instance
const client = new OpenPixels({
  apiKey: API_KEY,
  // Uncomment to use a local or development server
  // baseUrl: 'http://localhost:1729',
});

async function runTest() {
  console.log('Testing OpenPixels TypeScript SDK...');
  
  try {
    console.log('Generating an image with the prompt "a cat"...');
    
    const result = await client.run({
      model: 'blackforestlabs/flux-dev',
      prompt: 'a cat',
      // Optional parameters
      // count: 1,
      // width: 512,
      // height: 512,
    });
    
    console.log('Image generation result:');
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