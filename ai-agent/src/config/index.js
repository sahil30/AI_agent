import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  jira: {
    baseUrl: process.env.JIRA_BASE_URL,
    username: process.env.JIRA_USERNAME,
    apiToken: process.env.JIRA_API_TOKEN,
  },
  confluence: {
    baseUrl: process.env.CONFLUENCE_BASE_URL,
    username: process.env.CONFLUENCE_USERNAME,
    apiToken: process.env.CONFLUENCE_API_TOKEN,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  agent: {
    logLevel: process.env.LOG_LEVEL || 'info',
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    timeoutMs: parseInt(process.env.TIMEOUT_MS) || 30000,
  },
};

export function validateConfig() {
  const required = [
    'JIRA_BASE_URL', 'JIRA_USERNAME', 'JIRA_API_TOKEN',
    'CONFLUENCE_BASE_URL', 'CONFLUENCE_USERNAME', 'CONFLUENCE_API_TOKEN',
    'OPENAI_API_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}