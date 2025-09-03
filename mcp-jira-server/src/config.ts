import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  // Jira Configuration
  jiraBaseUrl: z.string().url(),
  jiraUsername: z.string().email(),
  jiraApiToken: z.string(),
  
  // Custom API Configuration (optional)
  customApiBaseUrl: z.string().url().optional(),
  customApiKey: z.string().optional(),
  customApiVersion: z.string().default('v1'),
  useCustomApi: z.boolean().default(false),
  
  // Server Configuration
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  maxResultsDefault: z.number().int().positive().default(50),
});

function validateConfig() {
  const useCustomApi = process.env.USE_CUSTOM_API === 'true';
  
  if (useCustomApi) {
    // Validate custom API configuration
    return configSchema.parse({
      jiraBaseUrl: process.env.CUSTOM_API_BASE_URL || process.env.JIRA_BASE_URL,
      jiraUsername: 'custom-api-user',
      jiraApiToken: process.env.CUSTOM_API_KEY || '',
      customApiBaseUrl: process.env.CUSTOM_API_BASE_URL,
      customApiKey: process.env.CUSTOM_API_KEY,
      customApiVersion: process.env.CUSTOM_API_VERSION || 'v1',
      useCustomApi: true,
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      maxResultsDefault: parseInt(process.env.MAX_RESULTS_DEFAULT || '50'),
    });
  } else {
    // Validate standard Jira configuration
    return configSchema.parse({
      jiraBaseUrl: process.env.JIRA_BASE_URL,
      jiraUsername: process.env.JIRA_USERNAME,
      jiraApiToken: process.env.JIRA_API_TOKEN,
      useCustomApi: false,
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      maxResultsDefault: parseInt(process.env.MAX_RESULTS_DEFAULT || '50'),
    });
  }
}

export const config = validateConfig();
export type Config = z.infer<typeof configSchema>;