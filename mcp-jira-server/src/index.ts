#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { JiraClient } from './jira-client.js';
import { config } from './config.js';

class JiraMcpServer {
  private server: Server;
  private jiraClient: JiraClient;

  constructor() {
    this.server = new Server(
      {
        name: 'jira-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.jiraClient = new JiraClient();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'jira_get_issue',
            description: 'Get a specific Jira issue by key',
            inputSchema: {
              type: 'object',
              properties: {
                issueKey: {
                  type: 'string',
                  description: 'The Jira issue key (e.g., PROJ-123)',
                },
              },
              required: ['issueKey'],
            },
          },
          {
            name: 'jira_search_issues',
            description: 'Search for Jira issues using JQL query',
            inputSchema: {
              type: 'object',
              properties: {
                jql: {
                  type: 'string',
                  description: 'JQL (Jira Query Language) string',
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: config.maxResultsDefault,
                },
                startAt: {
                  type: 'number',
                  description: 'Starting index for pagination',
                  default: 0,
                },
              },
              required: ['jql'],
            },
          },
          {
            name: 'jira_create_issue',
            description: 'Create a new Jira issue',
            inputSchema: {
              type: 'object',
              properties: {
                projectKey: {
                  type: 'string',
                  description: 'The project key where to create the issue',
                },
                summary: {
                  type: 'string',
                  description: 'Issue summary/title',
                },
                description: {
                  type: 'string',
                  description: 'Issue description',
                },
                issueType: {
                  type: 'string',
                  description: 'Issue type (e.g., Task, Bug, Story)',
                  default: 'Task',
                },
                priority: {
                  type: 'string',
                  description: 'Issue priority (e.g., High, Medium, Low)',
                },
                assignee: {
                  type: 'string',
                  description: 'Assignee username or email',
                },
                labels: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of labels to add to the issue',
                },
              },
              required: ['projectKey', 'summary'],
            },
          },
          {
            name: 'jira_update_issue',
            description: 'Update an existing Jira issue',
            inputSchema: {
              type: 'object',
              properties: {
                issueKey: {
                  type: 'string',
                  description: 'The Jira issue key to update',
                },
                summary: {
                  type: 'string',
                  description: 'New issue summary/title',
                },
                description: {
                  type: 'string',
                  description: 'New issue description',
                },
                assignee: {
                  type: 'string',
                  description: 'New assignee username or email',
                },
                priority: {
                  type: 'string',
                  description: 'New issue priority',
                },
                labels: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of labels to set on the issue',
                },
              },
              required: ['issueKey'],
            },
          },
          {
            name: 'jira_add_comment',
            description: 'Add a comment to a Jira issue',
            inputSchema: {
              type: 'object',
              properties: {
                issueKey: {
                  type: 'string',
                  description: 'The Jira issue key',
                },
                comment: {
                  type: 'string',
                  description: 'Comment text to add',
                },
              },
              required: ['issueKey', 'comment'],
            },
          },
          {
            name: 'jira_get_comments',
            description: 'Get all comments for a Jira issue',
            inputSchema: {
              type: 'object',
              properties: {
                issueKey: {
                  type: 'string',
                  description: 'The Jira issue key',
                },
              },
              required: ['issueKey'],
            },
          },
          {
            name: 'jira_get_projects',
            description: 'Get all available Jira projects',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'jira_get_transitions',
            description: 'Get available transitions for a Jira issue',
            inputSchema: {
              type: 'object',
              properties: {
                issueKey: {
                  type: 'string',
                  description: 'The Jira issue key',
                },
              },
              required: ['issueKey'],
            },
          },
          {
            name: 'jira_transition_issue',
            description: 'Transition a Jira issue to a new status',
            inputSchema: {
              type: 'object',
              properties: {
                issueKey: {
                  type: 'string',
                  description: 'The Jira issue key',
                },
                transitionId: {
                  type: 'string',
                  description: 'The ID of the transition to execute',
                },
              },
              required: ['issueKey', 'transitionId'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'jira_get_issue': {
            const { issueKey } = args as { issueKey: string };
            const issue = await this.jiraClient.getIssue(issueKey);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(issue, null, 2),
                },
              ],
            };
          }

          case 'jira_search_issues': {
            const { jql, maxResults, startAt } = args as {
              jql: string;
              maxResults?: number;
              startAt?: number;
            };
            const result = await this.jiraClient.searchIssues(
              jql,
              maxResults || config.maxResultsDefault,
              startAt || 0
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'jira_create_issue': {
            const {
              projectKey,
              summary,
              description,
              issueType,
              priority,
              assignee,
              labels,
            } = args as {
              projectKey: string;
              summary: string;
              description?: string;
              issueType?: string;
              priority?: string;
              assignee?: string;
              labels?: string[];
            };
            const issue = await this.jiraClient.createIssue(projectKey, {
              summary,
              description,
              issueType,
              priority,
              assignee,
              labels,
            });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(issue, null, 2),
                },
              ],
            };
          }

          case 'jira_update_issue': {
            const {
              issueKey,
              summary,
              description,
              assignee,
              priority,
              labels,
            } = args as {
              issueKey: string;
              summary?: string;
              description?: string;
              assignee?: string;
              priority?: string;
              labels?: string[];
            };
            await this.jiraClient.updateIssue(issueKey, {
              summary,
              description,
              assignee,
              priority,
              labels,
            });
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully updated issue ${issueKey}`,
                },
              ],
            };
          }

          case 'jira_add_comment': {
            const { issueKey, comment } = args as {
              issueKey: string;
              comment: string;
            };
            const addedComment = await this.jiraClient.addComment(issueKey, comment);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(addedComment, null, 2),
                },
              ],
            };
          }

          case 'jira_get_comments': {
            const { issueKey } = args as { issueKey: string };
            const comments = await this.jiraClient.getComments(issueKey);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(comments, null, 2),
                },
              ],
            };
          }

          case 'jira_get_projects': {
            const projects = await this.jiraClient.getProjects();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(projects, null, 2),
                },
              ],
            };
          }

          case 'jira_get_transitions': {
            const { issueKey } = args as { issueKey: string };
            const transitions = await this.jiraClient.getTransitions(issueKey);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(transitions, null, 2),
                },
              ],
            };
          }

          case 'jira_transition_issue': {
            const { issueKey, transitionId } = args as {
              issueKey: string;
              transitionId: string;
            };
            await this.jiraClient.transitionIssue(issueKey, transitionId);
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully transitioned issue ${issueKey}`,
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(ErrorCode.InternalError, errorMessage);
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Jira MCP server running on stdio');
  }
}

const server = new JiraMcpServer();
server.run().catch(console.error);