import axios from 'axios';
import { config } from '../config/index.js';

export class JiraIntegration {
  constructor() {
    this.baseUrl = config.jira.baseUrl;
    this.auth = {
      username: config.jira.username,
      password: config.jira.apiToken,
    };
    this.client = axios.create({
      baseURL: `${this.baseUrl}/rest/api/3`,
      auth: this.auth,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: config.agent.timeoutMs,
    });
  }

  async getIssue(issueKey) {
    try {
      const response = await this.client.get(`/issue/${issueKey}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get issue ${issueKey}: ${error.message}`);
    }
  }

  async searchIssues(jql, fields = ['summary', 'status', 'assignee', 'created']) {
    try {
      const response = await this.client.post('/search', {
        jql,
        fields,
        maxResults: 100,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search issues: ${error.message}`);
    }
  }

  async createIssue(projectKey, issueData) {
    try {
      const payload = {
        fields: {
          project: { key: projectKey },
          summary: issueData.summary,
          description: {
            type: 'doc',
            version: 1,
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: issueData.description || '' }]
            }]
          },
          issuetype: { name: issueData.issueType || 'Task' },
          ...issueData.customFields || {}
        }
      };

      const response = await this.client.post('/issue', payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create issue: ${error.message}`);
    }
  }

  async updateIssue(issueKey, updateData) {
    try {
      const payload = {
        fields: updateData.fields || {},
        update: updateData.update || {}
      };

      const response = await this.client.put(`/issue/${issueKey}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update issue ${issueKey}: ${error.message}`);
    }
  }

  async addComment(issueKey, comment) {
    try {
      const payload = {
        body: {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: comment }]
          }]
        }
      };

      const response = await this.client.post(`/issue/${issueKey}/comment`, payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to add comment to ${issueKey}: ${error.message}`);
    }
  }

  async getComments(issueKey) {
    try {
      const response = await this.client.get(`/issue/${issueKey}/comment`);
      return response.data.comments;
    } catch (error) {
      throw new Error(`Failed to get comments for ${issueKey}: ${error.message}`);
    }
  }

  async getProjects() {
    try {
      const response = await this.client.get('/project');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get projects: ${error.message}`);
    }
  }

  async transitionIssue(issueKey, transitionId) {
    try {
      const payload = {
        transition: { id: transitionId }
      };

      const response = await this.client.post(`/issue/${issueKey}/transitions`, payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to transition issue ${issueKey}: ${error.message}`);
    }
  }

  async getTransitions(issueKey) {
    try {
      const response = await this.client.get(`/issue/${issueKey}/transitions`);
      return response.data.transitions;
    } catch (error) {
      throw new Error(`Failed to get transitions for ${issueKey}: ${error.message}`);
    }
  }
}