import fetch from 'cross-fetch';

const BASE_URL = 'https://worker.openpixels.ai';

// Type definitions
type FluxModel = {
  model: 'flux-dev' | 'flux-schnell' | 'flux-1.1-pro';
  prompt: string;
  width?: number;
  height?: number;
};

type ProviderArgs = {
  config?: {
    routing?: {
      ordering?: string[];
      strategy?: 'best' | 'random';
      whitelist?: string[]
    }
  }
}

type InputParams = FluxModel & ProviderArgs;

type PolledResponse = PolledStatus | PolledResult;

type PolledStatus = {
  type: "update",
  id: string
  status: string;
}

type PolledResult = {
  id: string;
  type: "result",
  status: string;
  data?: {url: string}
  error?: {
    message: string;
    type: string; 
    code?: string
  };
  meta?: Record<string, any>;
}

interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export class OpenPixels {
  private baseUrl: string;
  private apiKey: string;
  private connectedMachineId?: string //= "dne_id"

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl || BASE_URL;
    this.apiKey = options.apiKey;
  }

  private async opFetch(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Key ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.connectedMachineId) {
      headers['fly-force-instance-id'] = this.connectedMachineId;
    }

    return fetch(url, {
      ...options,
      headers
    });
  }

  async submit(input: InputParams): Promise<PolledResponse> {
      const response = await this.opFetch('/v2/submit', {
        method: 'POST',
        body: JSON.stringify(input)
      });
      
      if (!response.ok) {
        console.log(await response.status)
        throw new Error(`Failed to submit job: ${response.statusText}. ${await response.text()}`);
      }
      
      if (!this.connectedMachineId) {
        this.connectedMachineId = response.headers.get('machine-id') || undefined;
      }

      return (await response.json() as PolledResponse);
  }

  async *subscribe(jobId: string): AsyncGenerator<PolledResponse, void, unknown> {
    console.log("Subscribing to job", jobId)
    while (true) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
          const response = await this.opFetch(`/v2/poll/${jobId}`, {
            signal: controller.signal
          });

          if (!response.ok) {
            throw new Error(`Failed to poll job: ${response.statusText}. ${await response.text()}`);
          }
          
          const data = await response.json() as PolledResponse;
          yield data;
          
          if (data.type === 'result') {
            break;
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`Job ${jobId} timed out; continuing to poll.`);
          continue;
        }
        throw error;
      }
    }
  }

  async run(payload: InputParams): Promise<{id: string, status: string, data?: PolledResult['data'], error?: PolledResult['error']}> {
    const result = await this.submit(payload);
    console.log("Received result in js client", result)

    if (result.type === 'result') {
      return cleanResult(result);
    }
    
    for await (const results of this.subscribe(result.id)) {
      console.log("Received results in js client", results)
      if (results.type === 'result') {
        return cleanResult(results);
      }
    }
    
    console.log('hi there')
    throw new Error('Unexpected end of subscription without result');
  }
}

const cleanResult = (result: PolledResult) => {
  if (result.type === 'result') {
    return {
      id: result.id,
      status: result.status,
      ...(result.data && {data: result.data}),
      ...(result.error && {error: result.error}),
    };
  }

  return {
    id: result.id,
    status: result.status,
    ...(result.error && {error: result.error}),
  }
}
