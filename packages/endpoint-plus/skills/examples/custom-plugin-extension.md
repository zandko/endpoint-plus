# Example: Custom Plugin and Extension

Use this when a business project needs reusable local endpoint behavior that built-in plugins/extensions do not cover.

## Custom Tenant Header Plugin

```ts
// src/shared/endpoint-plugins/tenant.ts
import { type EndpointPlugin } from '@yw/endpoint-plus';

export interface TenantPluginOptions {
  getTenantId: () => string | null;
}

const TENANT_PLUGIN_ID = Symbol('tenant-plugin');

export function createTenantPlugin(options: TenantPluginOptions): EndpointPlugin {
  return {
    id: TENANT_PLUGIN_ID,
    kind: 'plugin',
    setup(client) {
      client.registerRequestInterceptor((config) => {
        const tenantId = options.getTenantId();
        if (tenantId) config.headers['X-Tenant-ID'] = tenantId;
        return config;
      });
    },
  };
}
```

Install it:

```ts
endpoint.use(createTenantPlugin({ getTenantId: () => tenantStore.currentTenantId }));
```

## Custom Job Extension

```ts
// src/shared/endpoint-extensions/job.ts
import { type EndpointExtension } from '@yw/endpoint-plus';

export interface JobResult {
  done: boolean;
  result?: string;
}

export interface JobExtension {
  waitForJob(jobId: string): Promise<JobResult>;
}

const JOB_EXTENSION_ID = Symbol('job-extension');

export function createJobExtension(): EndpointExtension<JobExtension> {
  return {
    id: JOB_EXTENSION_ID,
    kind: 'extension',
    setup(client) {
      return {
        async waitForJob(jobId: string) {
          for (let attempt = 0; attempt < 20; attempt += 1) {
            const result = await client.get<JobResult>(`/jobs/${jobId}`);
            if (result.done) return result;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
          throw new Error(`Job ${jobId} did not finish in time`);
        },
      };
    },
  };
}
```

Use it:

```ts
const endpointWithJobs = endpoint.use(createJobExtension());
await endpointWithJobs.waitForJob('job-1');
```

## Rule of Thumb

- Use a plugin for lifecycle behavior: headers, logging, retry, cache, envelope, telemetry.
- Use an extension for new client methods: `waitForJob()`, `uploadAndPoll()`, `subscribeToChatStream()`.
