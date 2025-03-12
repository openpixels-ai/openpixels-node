import fetch from 'cross-fetch';

const BASE_URL = 'https://worker.openpixels.ai';

type FluxModel = {
  model: 'flux-dev' | 'flux-schnell' | 'flux-1.1-pro' // | 'ray-2' | 'wan-2.1-1.3b' | 'wan-2.1-14b' | 'photon-flash-1' | 'photon-1' | 'veo-2'
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

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl || BASE_URL;
    this.apiKey = options.apiKey;
  }

  private async opFetch(
    endpoint: string,
    options: RequestInit = {},
    timeout?: number
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Key ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    // Setup timeout logic if timeout is provided
    let controller: AbortController | undefined;
    let timeoutId: NodeJS.Timeout | undefined;
    
    if (timeout) {
      controller = new AbortController();
      const signal = controller.signal;
      
      // If options already has a signal, we can't override it
      if (options.signal) {
        throw new Error('Cannot set a timeout when the options already contain a signal');
      }
      
      timeoutId = setTimeout(() => {
        if (controller) {
          controller.abort();
        }
      }, timeout);
      options.signal = signal;
    }

    try {
      return await fetch(url, {
        ...options,
        headers
      });
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private async submit(input: InputParams): Promise<PolledResponse> {
      const response = await this.opFetch('/v2/submit', {
        method: 'POST',
        body: JSON.stringify(input)
      }, 90 * 1000);
      
      if (!response.ok) {
        console.log(await response.status)
        throw new Error(`Failed to submit job: ${response.statusText}. ${await response.text()}`);
      }
      
      return (await response.json() as PolledResponse);
  }

  private async *subscribe(jobId: string): AsyncGenerator<PolledResponse, void, unknown> {
    // console.log("Subscribing to job", jobId)
    while (true) {
      try {
        const response = await this.opFetch(`/v2/poll/${jobId}`, {}, 90 * 1000);

        if (!response.ok) throw new Error(`Failed to poll job: ${response.statusText}. ${await response.text()}`);
        
        const data = await response.json() as PolledResponse;
        yield data;
        
        if (data.type === 'result') break;

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // console.log(`Job ${jobId} timed out; continuing to poll.`);
          continue;
        }
        throw error;
      }
    }
  }

  async run(payload: InputParams): Promise<{id: string, status: string, data?: PolledResult['data'], error?: PolledResult['error']}> {
    const result = await this.submit(payload);
    // console.log("Received result in js client", JSON.stringify(result, null, 2))

    if (result.type === 'result') {
      return cleanResult(result);
    }
    
    for await (const results of this.subscribe(result.id)) {
      // console.log("Received results in js client", JSON.stringify(results, null, 2))
      if (results.type === 'result') {
        return cleanResult(results);
      }
    }
    
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
