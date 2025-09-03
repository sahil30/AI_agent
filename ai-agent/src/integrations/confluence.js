import axios from 'axios';
import { config } from '../config/index.js';

export class ConfluenceIntegration {
  constructor() {
    this.baseUrl = config.confluence.baseUrl;
    this.auth = {
      username: config.confluence.username,
      password: config.confluence.apiToken,
    };
    this.client = axios.create({
      baseURL: `${this.baseUrl}/rest/api`,
      auth: this.auth,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: config.agent.timeoutMs,
    });
  }

  async getPage(pageId, expand = ['body.storage', 'version']) {
    try {
      const response = await this.client.get(`/content/${pageId}`, {
        params: { expand: expand.join(',') }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get page ${pageId}: ${error.message}`);
    }
  }

  async getPageByTitle(spaceKey, title, expand = ['body.storage', 'version']) {
    try {
      const response = await this.client.get('/content', {
        params: {
          spaceKey,
          title,
          expand: expand.join(',')
        }
      });
      return response.data.results[0] || null;
    } catch (error) {
      throw new Error(`Failed to get page "${title}" in space ${spaceKey}: ${error.message}`);
    }
  }

  async searchContent(cql, expand = ['body.storage'], limit = 25) {
    try {
      const response = await this.client.get('/content/search', {
        params: {
          cql,
          expand: expand.join(','),
          limit
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search content: ${error.message}`);
    }
  }

  async createPage(spaceKey, title, content, parentPageId = null) {
    try {
      const payload = {
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
    } catch (error) {
      throw new Error(`Failed to create page "${title}": ${error.message}`);
    }
  }

  async updatePage(pageId, title, content, version) {
    try {
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
    } catch (error) {
      throw new Error(`Failed to update page ${pageId}: ${error.message}`);
    }
  }

  async deletePage(pageId) {
    try {
      const response = await this.client.delete(`/content/${pageId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete page ${pageId}: ${error.message}`);
    }
  }

  async getSpaces(limit = 25) {
    try {
      const response = await this.client.get('/space', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get spaces: ${error.message}`);
    }
  }

  async getSpace(spaceKey, expand = ['description', 'homepage']) {
    try {
      const response = await this.client.get(`/space/${spaceKey}`, {
        params: { expand: expand.join(',') }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get space ${spaceKey}: ${error.message}`);
    }
  }

  async getPageChildren(pageId, expand = ['body.storage']) {
    try {
      const response = await this.client.get(`/content/${pageId}/child/page`, {
        params: { expand: expand.join(',') }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get children of page ${pageId}: ${error.message}`);
    }
  }

  async addComment(pageId, comment) {
    try {
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
    } catch (error) {
      throw new Error(`Failed to add comment to page ${pageId}: ${error.message}`);
    }
  }

  async getComments(pageId) {
    try {
      const response = await this.client.get(`/content/${pageId}/child/comment`, {
        params: { expand: 'body.storage' }
      });
      return response.data.results;
    } catch (error) {
      throw new Error(`Failed to get comments for page ${pageId}: ${error.message}`);
    }
  }

  async convertToHtml(content) {
    try {
      const response = await this.client.post('/contentbody/convert/storage', {
        value: content,
        representation: 'storage'
      }, {
        headers: { 'Content-Type': 'application/json' },
        params: { to: 'view' }
      });
      return response.data.value;
    } catch (error) {
      throw new Error(`Failed to convert content to HTML: ${error.message}`);
    }
  }
}