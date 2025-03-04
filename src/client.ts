import fetch from 'cross-fetch';

const BASE_URL = 'https://worker.openpixels.ai';

// Type definitions
type FluxDevModel = {
  model: 'blackforestlabs/flux-dev';
  count?: number;
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  width?: number;
  height?: number;
};

type FluxSchnellModel = {
  model: 'blackforestlabs/flux-schnell';
  count?: number;
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  width?: number;
  height?: number;
};

type InputParams = FluxDevModel | FluxSchnellModel;

type PollResult = {
  type: string;
  status?: string;
  data?: any;
  error?: string;
  meta?: Record<string, any>;
};

interface JobInfo {
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export class AsyncOpenPixels {
  private baseUrl: string;
  private apiKey: string;
  private connectedMachineId?: string;
  private jobs: Record<string, JobInfo> = {};

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl || BASE_URL;
    this.apiKey = options.apiKey;
  }

  private async fetchWithAuth(
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

  async submit(input: InputParams): Promise<string> {
    const startTime = Date.now();
    
    try {
      const response = await this.fetchWithAuth('/submit', {
        method: 'POST',
        body: JSON.stringify(input)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit job: ${response.statusText}`);
      }
      
      this.connectedMachineId = response.headers.get('machine-id') || undefined;
      const data = await response.json();
      const jobId = data?.id;
      
      if (!jobId) {
        throw new Error('No job id received from /submit');
      }
      
      this.jobs[jobId] = { startTime };
      return jobId;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to submit job: ${error.message}`);
      }
      throw error;
    }
  }

  async *subscribe(jobId: string): AsyncGenerator<PollResult, void, unknown> {
    while (true) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
          const response = await this.fetchWithAuth(`/poll/${jobId}`, {
            signal: controller.signal
          });
          
          if (!response.ok) {
            break;
          }
          
          const data = await response.json() as PollResult;
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

  async run(payload: InputParams): Promise<Record<string, any>> {
    const jobId = await this.submit(payload);
    
    for await (const result of this.subscribe(jobId)) {
      if (result.type === 'result') {
        const endTime = Date.now();
        
        if (this.jobs[jobId]) {
          this.jobs[jobId].endTime = endTime;
          this.jobs[jobId].duration = endTime - this.jobs[jobId].startTime;
        }
        
        const response: Record<string, any> = {
          status: result.status
        };
        
        if (result.error) {
          response.error = result.error;
        }
        
        if (result.data) {
          response.data = result.data;
        }
        
        return response;
      }
    }
    
    throw new Error('Unexpected end of subscription without result');
  }

  async close(): Promise<void> {
    // Nothing to do for fetch
  }
}

export class OpenPixels {
  private asyncClient: AsyncOpenPixels;

  constructor(options: ClientOptions) {
    this.asyncClient = new AsyncOpenPixels(options);
  }

  async submit(payload: InputParams): Promise<string> {
    return this.asyncClient.submit(payload);
  }

  async *subscribe(jobId: string): AsyncGenerator<PollResult, void, unknown> {
    yield* this.asyncClient.subscribe(jobId);
  }

  async run(payload: InputParams): Promise<Record<string, any>> {
    return this.asyncClient.run(payload);
  }

  async close(): Promise<void> {
    await this.asyncClient.close();
  }
} 