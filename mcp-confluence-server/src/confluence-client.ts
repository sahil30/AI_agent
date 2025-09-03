import axios, { AxiosInstance } from 'axios';
import { config } from './config.js';

export interface ConfluencePage {
  id: string;
  title: string;
  type: string;
  status: string;
  space?: {
    key: string;
    name: string;
  };
  body?: {
    storage?: {
      value: string;
      representation: string;
    };
    view?: {
      value: string;
      representation: string;
    };
  };
  version?: {
    number: number;
    when: string;
    by: {
      displayName: string;
      email?: string;
    };
  };
  history?: {
    createdDate: string;
    createdBy: {
      displayName: string;
      email?: string;
    };
  };
  _links?: {
    webui: string;
    self: string;
  };
}

export interface ConfluenceSpace {
  key: string;
  name: string;
  type: string;
  description?: {
    plain: {
      value: string;
    };
  };
  _links?: {
    webui: string;
    self: string;
  };
}

export interface ConfluenceComment {
  id: string;
  type: string;
  title: string;
  body: {
    storage: {
      value: string;
      representation: string;
    };
  };
  version: {
    number: number;
    when: string;
    by: {
      displayName: string;
      email?: string;
    };
  };
}

export interface SearchResult {
  results: ConfluencePage[];
  start: number;
  limit: number;
  size: number;
}

export class ConfluenceClient {
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
        baseURL: `${config.confluenceBaseUrl}/rest/api`,
        auth: {
          username: config.confluenceUsername,
          password: config.confluenceApiToken,
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
      });
    }
  }

  async getPage(pageId: string, expand: string[] = ['body.storage', 'version', 'space']): Promise<ConfluencePage> {
    try {
      const url = config.useCustomApi ? 
        `/${config.customApiVersion}/pages/${pageId}` : 
        `/content/${pageId}`;
      
      const params = config.useCustomApi ? {} : { expand: expand.join(',') };
      const response = await this.client.get(url, { params });
      
      if (config.useCustomApi) {
        return this.normalizeCustomPage(response.data);
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get page ${pageId}: ${error.message}`);
    }
  }

  async getPageByTitle(spaceKey: string, title: string, expand: string[] = ['body.storage', 'version']): Promise<ConfluencePage | null> {
    try {
      if (config.useCustomApi) {
        const response = await this.client.get(`/${config.customApiVersion}/pages/search`, {
          params: { q: title, space: spaceKey, limit: 1 }
        });
        
        const pages = response.data.pages || response.data.data || response.data.results || [];
        if (pages.length > 0) {
          const page = pages[0];
          const pageTitle = (page.title || page.name || '').toLowerCase();
          if (pageTitle === title.toLowerCase()) {
            return this.normalizeCustomPage(page);
          }
        }
        return null;
      } else {
        const response = await this.client.get('/content', {
          params: {
            spaceKey,
            title,
            expand: expand.join(',')
          }
        });
        
        const results = response.data.results || [];
        return results.length > 0 ? results[0] : null;
      }
    } catch (error: any) {
      throw new Error(`Failed to get page "${title}" in space ${spaceKey}: ${error.message}`);
    }
  }

  async searchContent(cql: string, limit: number = config.maxResultsDefault, start: number = 0): Promise<SearchResult> {
    try {
      if (config.useCustomApi) {
        const query = this.parseCqlToSimpleQuery(cql);
        const response = await this.client.get(`/${config.customApiVersion}/pages/search`, {
          params: { q: query, limit, offset: start }
        });
        
        return this.normalizeCustomSearchResult(response.data, limit, start);
      } else {
        const response = await this.client.get('/content/search', {
          params: {
            cql,
            limit,
            start,
            expand: 'body.storage,space,version'
          }
        });
        
        return response.data;
      }
    } catch (error: any) {
      throw new Error(`Failed to search content: ${error.message}`);
    }
  }

  async createPage(spaceKey: string, title: string, content: string, parentPageId?: string): Promise<ConfluencePage> {
    try {
      if (config.useCustomApi) {
        const pageData = {
          title,
          content,
          space: spaceKey,
          ...(parentPageId && { parent_id: parentPageId })
        };
        
        const response = await this.client.post(`/${config.customApiVersion}/pages`, pageData);
        return this.normalizeCustomPage(response.data);
      } else {
        const payload: any = {
          type: 'page',
          title,
          space: { key: spaceKey },
          body: {
            storage: {
              value: content,
              representation: 'storage'
            }
          }
        };
        
        if (parentPageId) {
          payload.ancestors = [{ id: parentPageId }];
        }
        
        const response = await this.client.post('/content', payload);
        return response.data;
      }
    } catch (error: any) {
      throw new Error(`Failed to create page "${title}": ${error.message}`);
    }
  }

  async updatePage(pageId: string, title: string, content: string, version: number): Promise<ConfluencePage> {
    try {
      if (config.useCustomApi) {
        const pageData = {
          title,
          content,
          version: version + 1
        };
        
        const response = await this.client.put(`/${config.customApiVersion}/pages/${pageId}`, pageData);
        return this.normalizeCustomPage(response.data);
      } else {
        const payload = {
          version: {
            number: version + 1
          },
          title,
          type: 'page',
          body: {
            storage: {
              value: content,
              representation: 'storage'
            }
          }
        };
        
        const response = await this.client.put(`/content/${pageId}`, payload);
        return response.data;
      }
    } catch (error: any) {
      throw new Error(`Failed to update page ${pageId}: ${error.message}`);
    }
  }

  async deletePage(pageId: string): Promise<void> {
    try {
      const url = config.useCustomApi ? 
        `/${config.customApiVersion}/pages/${pageId}` : 
        `/content/${pageId}`;
      
      await this.client.delete(url);
    } catch (error: any) {
      throw new Error(`Failed to delete page ${pageId}: ${error.message}`);
    }
  }

  async getSpaces(limit: number = config.maxResultsDefault): Promise<ConfluenceSpace[]> {
    try {
      if (config.useCustomApi) {
        const response = await this.client.get(`/${config.customApiVersion}/spaces`, {
          params: { limit }
        });
        
        const spaces = response.data.spaces || response.data.data || [];
        return spaces.map((space: any) => this.normalizeCustomSpace(space));
      } else {
        const response = await this.client.get('/space', {
          params: { limit }
        });
        
        return response.data.results || [];
      }
    } catch (error: any) {
      throw new Error(`Failed to get spaces: ${error.message}`);
    }
  }

  async getSpace(spaceKey: string): Promise<ConfluenceSpace> {
    try {
      if (config.useCustomApi) {
        const spaces = await this.getSpaces();
        const space = spaces.find(s => s.key === spaceKey || s.name === spaceKey);
        if (!space) {
          throw new Error(`Space ${spaceKey} not found`);
        }
        return space;
      } else {
        const response = await this.client.get(`/space/${spaceKey}`, {
          params: { expand: 'description,homepage' }
        });
        
        return response.data;
      }
    } catch (error: any) {
      throw new Error(`Failed to get space ${spaceKey}: ${error.message}`);
    }
  }

  async getPageChildren(pageId: string): Promise<ConfluencePage[]> {
    try {
      if (config.useCustomApi) {
        try {
          const response = await this.client.get(`/${config.customApiVersion}/pages/${pageId}/children`);
          const children = response.data.children || response.data.data || [];
          return children.map((child: any) => this.normalizeCustomPage(child));
        } catch {
          return [];
        }
      } else {
        const response = await this.client.get(`/content/${pageId}/child/page`, {
          params: { expand: 'body.storage,space,version' }
        });
        
        return response.data.results || [];
      }
    } catch (error: any) {
      throw new Error(`Failed to get children of page ${pageId}: ${error.message}`);
    }
  }

  async addComment(pageId: string, comment: string): Promise<ConfluenceComment> {
    try {
      if (config.useCustomApi) {
        const response = await this.client.post(`/${config.customApiVersion}/pages/${pageId}/comments`, {
          comment
        });
        return this.normalizeCustomComment(response.data);
      } else {
        const payload = {
          type: 'comment',
          container: { id: pageId },
          body: {
            storage: {
              value: comment,
              representation: 'storage'
            }
          }
        };
        
        const response = await this.client.post('/content', payload);
        return response.data;
      }
    } catch (error: any) {
      throw new Error(`Failed to add comment to page ${pageId}: ${error.message}`);
    }
  }

  async getComments(pageId: string): Promise<ConfluenceComment[]> {
    try {
      if (config.useCustomApi) {
        try {
          const response = await this.client.get(`/${config.customApiVersion}/pages/${pageId}/comments`);
          const comments = response.data.comments || response.data.data || [];
          return comments.map((comment: any) => this.normalizeCustomComment(comment));
        } catch {
          return [];
        }
      } else {
        const response = await this.client.get(`/content/${pageId}/child/comment`, {
          params: { expand: 'body.storage,version' }
        });
        
        return response.data.results || [];
      }
    } catch (error: any) {
      throw new Error(`Failed to get comments for page ${pageId}: ${error.message}`);
    }
  }

  private normalizeCustomPage(customPage: any): ConfluencePage {
    return {
      id: customPage.id || customPage.page_id || '',
      title: customPage.title || customPage.name || '',
      type: 'page',
      status: customPage.status || 'current',
      space: customPage.space || customPage.space_key ? {
        key: typeof customPage.space === 'object' ? customPage.space.key : (customPage.space || customPage.space_key),
        name: typeof customPage.space === 'object' ? customPage.space.name : (customPage.space || customPage.space_key)
      } : undefined,
      body: {
        storage: {
          value: customPage.content || customPage.body || customPage.text || '',
          representation: 'storage'
        },
        view: {
          value: customPage.content || customPage.body || customPage.text || '',
          representation: 'view'
        }
      },
      version: {
        number: customPage.version || customPage.revision || 1,
        when: customPage.updated || customPage.updated_at || new Date().toISOString(),
        by: {
          displayName: customPage.updated_by || customPage.author || 'Unknown',
          email: customPage.updated_by_email || ''
        }
      },
      history: {
        createdDate: customPage.created || customPage.created_at || new Date().toISOString(),
        createdBy: {
          displayName: customPage.created_by || customPage.author || 'Unknown',
          email: customPage.created_by_email || ''
        }
      },
      _links: {
        webui: customPage.url || customPage.link || '',
        self: `/rest/api/content/${customPage.id || customPage.page_id}`
      }
    };
  }

  private normalizeCustomSpace(customSpace: any): ConfluenceSpace {
    return {
      key: customSpace.key || customSpace.id || customSpace.code || '',
      name: customSpace.name || customSpace.title || '',
      type: customSpace.type || 'global',
      description: {
        plain: {
          value: customSpace.description || ''
        }
      },
      _links: {
        webui: customSpace.url || customSpace.link || '',
        self: `/rest/api/space/${customSpace.key || customSpace.id}`
      }
    };
  }

  private normalizeCustomComment(customComment: any): ConfluenceComment {
    return {
      id: customComment.id || customComment.comment_id || '',
      type: 'comment',
      title: customComment.title || '',
      body: {
        storage: {
          value: customComment.comment || customComment.body || customComment.content || '',
          representation: 'storage'
        }
      },
      version: {
        number: customComment.version || 1,
        when: customComment.created || customComment.created_at || new Date().toISOString(),
        by: {
          displayName: customComment.author || customComment.user || customComment.created_by || 'Unknown',
          email: customComment.author_email || ''
        }
      }
    };
  }

  private normalizeCustomSearchResult(customResult: any, limit: number, start: number): SearchResult {
    const pages = customResult.pages || customResult.data || customResult.results || [];
    return {
      results: pages.map((page: any) => this.normalizeCustomPage(page)),
      start,
      limit,
      size: pages.length
    };
  }

  private parseCqlToSimpleQuery(cql: string): string {
    // Simple parsing - extract key search terms from CQL
    let query = cql.replace(/\b(and|or|not)\b/gi, ' ');
    query = query.replace(/(space|type|title|text)\s*=\s*["']?([^"']+)["']?/gi, '$2');
    return query.split().filter(term => term.length > 2).join(' ');
  }
}