import axios, { AxiosInstance } from 'axios';
import { config } from './config.js';

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: any;
    status: {
      name: string;
      id: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    reporter?: {
      displayName: string;
      emailAddress: string;
    };
    created: string;
    updated: string;
    priority?: {
      name: string;
      id: string;
    };
    issuetype: {
      name: string;
      id: string;
    };
    project: {
      key: string;
      name: string;
    };
    labels?: string[];
  };
}

export interface JiraComment {
  id: string;
  author: {
    displayName: string;
    emailAddress: string;
  };
  body: any;
  created: string;
  updated: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  lead?: {
    displayName: string;
  };
}

export interface JiraTransition {
  id: string;
  name: string;
  to: {
    name: string;
    id: string;
  };
}

export interface SearchResult {
  issues: JiraIssue[];
  total: number;
  maxResults: number;
  startAt: number;
}

export class JiraClient {
  private client: AxiosInstance;

  constructor() {
    if (config.useCustomApi) {
      this.client = axios.create({
        baseURL: config.customApiBaseUrl,
        headers: {
          'Authorization': `Bearer ${config.customApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
      });
    } else {
      this.client = axios.create({
        baseURL: `${config.jiraBaseUrl}/rest/api/3`,
        auth: {
          username: config.jiraUsername,
          password: config.jiraApiToken,
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
      });
    }
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    try {
      const url = config.useCustomApi ? 
        `/${config.customApiVersion}/issues/${issueKey}` : 
        `/issue/${issueKey}`;
      
      const response = await this.client.get(url);
      
      if (config.useCustomApi) {
        return this.normalizeCustomIssue(response.data);
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get issue ${issueKey}: ${error.message}`);
    }
  }

  async searchIssues(jql: string, maxResults: number = config.maxResultsDefault, startAt: number = 0): Promise<SearchResult> {
    try {
      if (config.useCustomApi) {
        const filters = this.parseJqlToFilters(jql);
        const response = await this.client.get(`/${config.customApiVersion}/issues/search`, {
          params: { ...filters, limit: maxResults, offset: startAt }
        });
        
        return this.normalizeCustomSearchResult(response.data, maxResults, startAt);
      } else {
        const response = await this.client.post('/search', {
          jql,
          maxResults,
          startAt,
          fields: ['summary', 'status', 'assignee', 'reporter', 'created', 'updated', 'priority', 'issuetype', 'project', 'labels', 'description']
        });
        
        return response.data;
      }
    } catch (error: any) {
      throw new Error(`Failed to search issues: ${error.message}`);
    }
  }

  async createIssue(projectKey: string, issueData: {
    summary: string;
    description?: string;
    issueType?: string;
    priority?: string;
    assignee?: string;
    labels?: string[];
  }): Promise<JiraIssue> {
    try {
      if (config.useCustomApi) {
        const customData = {
          project: projectKey,
          title: issueData.summary,
          description: issueData.description || '',
          type: (issueData.issueType || 'Task').toLowerCase(),
          priority: issueData.priority,
          assignee: issueData.assignee,
          labels: issueData.labels,
        };
        
        const response = await this.client.post(`/${config.customApiVersion}/issues`, customData);
        return this.normalizeCustomIssue(response.data);
      } else {
        const payload = {
          fields: {
            project: { key: projectKey },
            summary: issueData.summary,
            description: issueData.description ? {
              type: 'doc',
              version: 1,
              content: [{
                type: 'paragraph',
                content: [{ type: 'text', text: issueData.description }]
              }]
            } : undefined,
            issuetype: { name: issueData.issueType || 'Task' },
            priority: issueData.priority ? { name: issueData.priority } : undefined,
            assignee: issueData.assignee ? { name: issueData.assignee } : undefined,
            labels: issueData.labels || [],
          }
        };
        
        const response = await this.client.post('/issue', payload);
        return await this.getIssue(response.data.key);
      }
    } catch (error: any) {
      throw new Error(`Failed to create issue: ${error.message}`);
    }
  }

  async updateIssue(issueKey: string, updateData: {
    summary?: string;
    description?: string;
    assignee?: string;
    priority?: string;
    labels?: string[];
  }): Promise<void> {
    try {
      if (config.useCustomApi) {
        const customData: any = {};
        if (updateData.summary) customData.title = updateData.summary;
        if (updateData.description) customData.description = updateData.description;
        if (updateData.assignee) customData.assignee = updateData.assignee;
        if (updateData.priority) customData.priority = updateData.priority;
        if (updateData.labels) customData.labels = updateData.labels;
        
        await this.client.put(`/${config.customApiVersion}/issues/${issueKey}`, customData);
      } else {
        const fields: any = {};
        if (updateData.summary) fields.summary = updateData.summary;
        if (updateData.description) fields.description = {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: updateData.description }]
          }]
        };
        if (updateData.assignee) fields.assignee = { name: updateData.assignee };
        if (updateData.priority) fields.priority = { name: updateData.priority };
        if (updateData.labels) fields.labels = updateData.labels;
        
        await this.client.put(`/issue/${issueKey}`, { fields });
      }
    } catch (error: any) {
      throw new Error(`Failed to update issue ${issueKey}: ${error.message}`);
    }
  }

  async addComment(issueKey: string, comment: string): Promise<JiraComment> {
    try {
      if (config.useCustomApi) {
        const response = await this.client.post(`/${config.customApiVersion}/issues/${issueKey}/comments`, {
          comment,
        });
        return this.normalizeCustomComment(response.data);
      } else {
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
      }
    } catch (error: any) {
      throw new Error(`Failed to add comment to ${issueKey}: ${error.message}`);
    }
  }

  async getComments(issueKey: string): Promise<JiraComment[]> {
    try {
      if (config.useCustomApi) {
        const response = await this.client.get(`/${config.customApiVersion}/issues/${issueKey}/comments`);
        const comments = response.data.comments || response.data.data || [];
        return comments.map((comment: any) => this.normalizeCustomComment(comment));
      } else {
        const response = await this.client.get(`/issue/${issueKey}/comment`);
        return response.data.comments || [];
      }
    } catch (error: any) {
      throw new Error(`Failed to get comments for ${issueKey}: ${error.message}`);
    }
  }

  async getProjects(): Promise<JiraProject[]> {
    try {
      if (config.useCustomApi) {
        const response = await this.client.get(`/${config.customApiVersion}/projects`);
        const projects = response.data.projects || response.data.data || [];
        return projects.map((project: any) => this.normalizeCustomProject(project));
      } else {
        const response = await this.client.get('/project');
        return response.data;
      }
    } catch (error: any) {
      throw new Error(`Failed to get projects: ${error.message}`);
    }
  }

  async getTransitions(issueKey: string): Promise<JiraTransition[]> {
    try {
      if (config.useCustomApi) {
        const response = await this.client.get(`/${config.customApiVersion}/issues/${issueKey}/transitions`);
        const transitions = response.data.transitions || response.data.data || [];
        return transitions.map((t: any) => ({
          id: t.id || t.transition_id || '',
          name: t.name || t.status || t.to_status || '',
          to: {
            name: t.to_status || t.target_status || t.name || '',
            id: t.to_id || t.id || ''
          }
        }));
      } else {
        const response = await this.client.get(`/issue/${issueKey}/transitions`);
        return response.data.transitions || [];
      }
    } catch (error: any) {
      throw new Error(`Failed to get transitions for ${issueKey}: ${error.message}`);
    }
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    try {
      if (config.useCustomApi) {
        await this.client.post(`/${config.customApiVersion}/issues/${issueKey}/transitions`, {
          transition: transitionId,
        });
      } else {
        await this.client.post(`/issue/${issueKey}/transitions`, {
          transition: { id: transitionId }
        });
      }
    } catch (error: any) {
      throw new Error(`Failed to transition issue ${issueKey}: ${error.message}`);
    }
  }

  private normalizeCustomIssue(customIssue: any): JiraIssue {
    return {
      id: customIssue.id || customIssue.issue_id || '',
      key: customIssue.key || customIssue.id || customIssue.number || '',
      fields: {
        summary: customIssue.title || customIssue.summary || customIssue.name || '',
        description: customIssue.description || customIssue.body || customIssue.content,
        status: {
          name: customIssue.status || customIssue.state || 'Unknown',
          id: customIssue.status_id || customIssue.status || '1'
        },
        assignee: customIssue.assignee ? {
          displayName: customIssue.assignee.name || customIssue.assignee || '',
          emailAddress: customIssue.assignee.email || ''
        } : undefined,
        reporter: customIssue.reporter || customIssue.created_by ? {
          displayName: customIssue.reporter?.name || customIssue.created_by || '',
          emailAddress: customIssue.reporter?.email || ''
        } : undefined,
        created: customIssue.created || customIssue.created_at || new Date().toISOString(),
        updated: customIssue.updated || customIssue.updated_at || new Date().toISOString(),
        priority: customIssue.priority ? {
          name: customIssue.priority,
          id: customIssue.priority_id || '3'
        } : undefined,
        issuetype: {
          name: customIssue.type || customIssue.issue_type || 'Task',
          id: customIssue.type_id || '1'
        },
        project: {
          key: customIssue.project || customIssue.project_key || '',
          name: customIssue.project_name || customIssue.project || ''
        },
        labels: customIssue.labels || customIssue.tags || []
      }
    };
  }

  private normalizeCustomComment(customComment: any): JiraComment {
    return {
      id: customComment.id || customComment.comment_id || '',
      author: {
        displayName: customComment.author || customComment.user || customComment.created_by || 'Unknown',
        emailAddress: customComment.author_email || ''
      },
      body: customComment.comment || customComment.body || customComment.content || '',
      created: customComment.created || customComment.created_at || new Date().toISOString(),
      updated: customComment.updated || customComment.updated_at || new Date().toISOString()
    };
  }

  private normalizeCustomProject(customProject: any): JiraProject {
    return {
      id: customProject.id || customProject.project_id || '',
      key: customProject.key || customProject.code || customProject.id || '',
      name: customProject.name || customProject.title || '',
      description: customProject.description || '',
      lead: customProject.lead || customProject.owner ? {
        displayName: customProject.lead?.name || customProject.owner || ''
      } : undefined
    };
  }

  private normalizeCustomSearchResult(customResult: any, maxResults: number, startAt: number): SearchResult {
    const issues = customResult.issues || customResult.data || customResult.results || [];
    return {
      issues: issues.map((issue: any) => this.normalizeCustomIssue(issue)),
      total: customResult.total || issues.length,
      maxResults,
      startAt
    };
  }

  private parseJqlToFilters(jql: string): Record<string, any> {
    const filters: Record<string, any> = {};
    const jqlLower = jql.toLowerCase();
    
    // Simple JQL parsing for common patterns
    const projectMatch = jql.match(/project\s*=\s*([^\s]+)/i);
    if (projectMatch) {
      filters.project = projectMatch[1].replace(/['"]/g, '');
    }
    
    const statusMatch = jql.match(/status\s*=\s*([^\s]+)/i);
    if (statusMatch) {
      filters.status = statusMatch[1].replace(/['"]/g, '').replace(/"/g, '');
    }
    
    const assigneeMatch = jql.match(/assignee\s*=\s*([^\s]+)/i);
    if (assigneeMatch) {
      let assignee = assigneeMatch[1].replace(/['"]/g, '');
      if (assignee === 'currentuser()') assignee = 'me';
      filters.assignee = assignee;
    }
    
    return filters;
  }
}