import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  // Confluence Configuration
  confluenceBaseUrl: z.string().url(),
  confluenceUsername: z.string().email(),
  confluenceApiToken: z.string(),
  
  // Custom API Configuration (optional)
  customApiBaseUrl: z.string().url().optional(),
  customApiKey: z.string().optional(),
  customApiVersion: z.string().default('v1'),
  useCustomApi: z.boolean().default(false),
  
  // Server Configuration
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  maxResultsDefault: z.number().int().positive().default(25),
});

function validateConfig() {
  const useCustomApi = process.env.USE_CUSTOM_API === 'true';
  
  if (useCustomApi) {
    // Validate custom API configuration
    return configSchema.parse({
      confluenceBaseUrl: process.env.CUSTOM_API_BASE_URL || process.env.CONFLUENCE_BASE_URL,
      confluenceUsername: 'custom-api-user',
      confluenceApiToken: process.env.CUSTOM_API_KEY || '',
      customApiBaseUrl: process.env.CUSTOM_API_BASE_URL,
      customApiKey: process.env.CUSTOM_API_KEY,
      customApiVersion: process.env.CUSTOM_API_VERSION || 'v1',
      useCustomApi: true,
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      maxResultsDefault: parseInt(process.env.MAX_RESULTS_DEFAULT || '25'),
    });
  } else {
    // Validate standard Confluence configuration
    return configSchema.parse({
      confluenceBaseUrl: process.env.CONFLUENCE_BASE_URL,
      confluenceUsername: process.env.CONFLUENCE_USERNAME,
      confluenceApiToken: process.env.CONFLUENCE_API_TOKEN,
      useCustomApi: false,
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      maxResultsDefault: parseInt(process.env.MAX_RESULTS_DEFAULT || '25'),
    });
  }
}

export const config = validateConfig();
export type Config = z.infer<typeof configSchema>;