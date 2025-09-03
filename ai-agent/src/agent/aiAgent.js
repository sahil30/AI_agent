import OpenAI from 'openai';
import { config } from '../config/index.js';
import { JiraIntegration } from '../integrations/jira.js';
import { ConfluenceIntegration } from '../integrations/confluence.js';
import { JavaProcessor } from '../integrations/javaProcessor.js';
import winston from 'winston';

export class AIAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    
    this.jira = new JiraIntegration();
    this.confluence = new ConfluenceIntegration();
    this.javaProcessor = new JavaProcessor();
    
    this.logger = winston.createLogger({
      level: config.agent.logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ filename: 'agent.log' })
      ]
    });
  }

  async processCommand(command, context = {}) {
    try {
      this.logger.info('Processing command', { command, context });
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: `Command: ${command}\nContext: ${JSON.stringify(context)}`
          }
        ],
        functions: this.getFunctionDefinitions(),
        function_call: 'auto'
      });

      const message = response.choices[0].message;
      
      if (message.function_call) {
        return await this.executeFunction(message.function_call);
      }
      
      return {
        type: 'response',
        content: message.content
      };
      
    } catch (error) {
      this.logger.error('Error processing command', { error: error.message, command });
      throw error;
    }
  }

  getSystemPrompt() {
    return `You are an AI agent that can interact with Jira, Confluence, and Java code. 
    You have access to the following capabilities:
    
    JIRA OPERATIONS:
    - Get, search, create, update issues
    - Add comments and manage transitions
    - Access project information
    
    CONFLUENCE OPERATIONS:
    - Read, create, update, delete pages
    - Search content and manage spaces
    - Add comments and convert content
    
    JAVA CODE OPERATIONS:
    - Analyze Java code structure and complexity
    - Generate Java classes and methods
    - Parse and extract code information
    - Write Java files
    
    When users request actions, determine the appropriate integration to use and call the relevant functions.
    Provide clear, helpful responses and ask for clarification when needed.
    
    Always consider the context provided and use it to make better decisions about which actions to take.`;
  }

  getFunctionDefinitions() {
    return [
      // Jira functions
      {
        name: 'jira_get_issue',
        description: 'Get a specific Jira issue by key',
        parameters: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'The Jira issue key (e.g., PROJ-123)' }
          },
          required: ['issueKey']
        }
      },
      {
        name: 'jira_search_issues',
        description: 'Search for Jira issues using JQL',
        parameters: {
          type: 'object',
          properties: {
            jql: { type: 'string', description: 'JQL query string' },
            fields: { type: 'array', items: { type: 'string' }, description: 'Fields to return' }
          },
          required: ['jql']
        }
      },
      {
        name: 'jira_create_issue',
        description: 'Create a new Jira issue',
        parameters: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'Project key' },
            issueData: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                description: { type: 'string' },
                issueType: { type: 'string' }
              },
              required: ['summary']
            }
          },
          required: ['projectKey', 'issueData']
        }
      },
      {
        name: 'jira_add_comment',
        description: 'Add a comment to a Jira issue',
        parameters: {
          type: 'object',
          properties: {
            issueKey: { type: 'string' },
            comment: { type: 'string' }
          },
          required: ['issueKey', 'comment']
        }
      },
      // Confluence functions
      {
        name: 'confluence_get_page',
        description: 'Get a Confluence page by ID',
        parameters: {
          type: 'object',
          properties: {
            pageId: { type: 'string', description: 'Page ID' }
          },
          required: ['pageId']
        }
      },
      {
        name: 'confluence_search_content',
        description: 'Search Confluence content using CQL',
        parameters: {
          type: 'object',
          properties: {
            cql: { type: 'string', description: 'Confluence Query Language string' },
            limit: { type: 'number', description: 'Maximum number of results' }
          },
          required: ['cql']
        }
      },
      {
        name: 'confluence_create_page',
        description: 'Create a new Confluence page',
        parameters: {
          type: 'object',
          properties: {
            spaceKey: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            parentPageId: { type: 'string' }
          },
          required: ['spaceKey', 'title', 'content']
        }
      },
      // Java functions
      {
        name: 'java_analyze_code',
        description: 'Analyze Java code structure and complexity',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Java code to analyze' },
            fileName: { type: 'string', description: 'Optional file name' }
          },
          required: ['code']
        }
      },
      {
        name: 'java_generate_class',
        description: 'Generate a Java class',
        parameters: {
          type: 'object',
          properties: {
            className: { type: 'string' },
            options: {
              type: 'object',
              properties: {
                packageName: { type: 'string' },
                imports: { type: 'array', items: { type: 'string' } },
                superClass: { type: 'string' },
                interfaces: { type: 'array', items: { type: 'string' } },
                methods: { type: 'array' },
                fields: { type: 'array' }
              }
            }
          },
          required: ['className']
        }
      },
      {
        name: 'java_write_file',
        description: 'Write Java code to a file',
        parameters: {
          type: 'object',
          properties: {
            filePath: { type: 'string' },
            content: { type: 'string' }
          },
          required: ['filePath', 'content']
        }
      }
    ];
  }

  async executeFunction(functionCall) {
    const { name, arguments: args } = functionCall;
    const parsedArgs = JSON.parse(args);

    this.logger.info('Executing function', { name, args: parsedArgs });

    try {
      switch (name) {
        // Jira functions
        case 'jira_get_issue':
          const issue = await this.jira.getIssue(parsedArgs.issueKey);
          return { type: 'jira_issue', data: issue };

        case 'jira_search_issues':
          const searchResults = await this.jira.searchIssues(parsedArgs.jql, parsedArgs.fields);
          return { type: 'jira_search', data: searchResults };

        case 'jira_create_issue':
          const newIssue = await this.jira.createIssue(parsedArgs.projectKey, parsedArgs.issueData);
          return { type: 'jira_issue_created', data: newIssue };

        case 'jira_add_comment':
          const comment = await this.jira.addComment(parsedArgs.issueKey, parsedArgs.comment);
          return { type: 'jira_comment_added', data: comment };

        // Confluence functions
        case 'confluence_get_page':
          const page = await this.confluence.getPage(parsedArgs.pageId);
          return { type: 'confluence_page', data: page };

        case 'confluence_search_content':
          const content = await this.confluence.searchContent(parsedArgs.cql, ['body.storage'], parsedArgs.limit);
          return { type: 'confluence_search', data: content };

        case 'confluence_create_page':
          const newPage = await this.confluence.createPage(
            parsedArgs.spaceKey, 
            parsedArgs.title, 
            parsedArgs.content, 
            parsedArgs.parentPageId
          );
          return { type: 'confluence_page_created', data: newPage };

        // Java functions
        case 'java_analyze_code':
          const analysis = this.javaProcessor.analyzeJavaCode(parsedArgs.code, parsedArgs.fileName);
          return { type: 'java_analysis', data: analysis };

        case 'java_generate_class':
          const generatedCode = this.javaProcessor.generateJavaClass(parsedArgs.className, parsedArgs.options);
          return { type: 'java_code_generated', data: { code: generatedCode } };

        case 'java_write_file':
          await this.javaProcessor.writeJavaFile(parsedArgs.filePath, parsedArgs.content);
          return { type: 'java_file_written', data: { filePath: parsedArgs.filePath } };

        default:
          throw new Error(`Unknown function: ${name}`);
      }
    } catch (error) {
      this.logger.error('Function execution error', { name, error: error.message });
      return { type: 'error', message: error.message };
    }
  }

  async analyzeJiraIssueAndGenerateDocumentation(issueKey, spaceKey) {
    try {
      const issue = await this.jira.getIssue(issueKey);
      const comments = await this.jira.getComments(issueKey);
      
      const documentationContent = this.generateIssueDocumentation(issue, comments);
      
      const page = await this.confluence.createPage(
        spaceKey,
        `Documentation for ${issueKey}: ${issue.fields.summary}`,
        documentationContent
      );
      
      return {
        issue,
        documentation: page,
        message: `Created documentation page for ${issueKey}`
      };
    } catch (error) {
      this.logger.error('Error analyzing issue and generating documentation', { issueKey, error: error.message });
      throw error;
    }
  }

  generateIssueDocumentation(issue, comments) {
    let content = `<h1>${issue.fields.summary}</h1>`;
    content += `<p><strong>Issue Key:</strong> ${issue.key}</p>`;
    content += `<p><strong>Status:</strong> ${issue.fields.status.name}</p>`;
    content += `<p><strong>Type:</strong> ${issue.fields.issuetype.name}</p>`;
    
    if (issue.fields.assignee) {
      content += `<p><strong>Assignee:</strong> ${issue.fields.assignee.displayName}</p>`;
    }
    
    content += `<h2>Description</h2>`;
    content += `<p>${issue.fields.description || 'No description provided'}</p>`;
    
    if (comments && comments.length > 0) {
      content += `<h2>Comments</h2>`;
      comments.forEach(comment => {
        content += `<div><strong>${comment.author.displayName}:</strong> ${comment.body.content[0].content[0].text}</div>`;
      });
    }
    
    return content;
  }

  async analyzeJavaProject(projectPath) {
    try {
      const javaFiles = await this.javaProcessor.findJavaFiles(projectPath);
      const analyses = [];
      
      for (const file of javaFiles) {
        const analysis = await this.javaProcessor.analyzeJavaFile(file);
        analyses.push(analysis);
      }
      
      const summary = this.generateProjectSummary(analyses);
      
      return {
        files: analyses,
        summary,
        metrics: this.calculateProjectMetrics(analyses)
      };
    } catch (error) {
      this.logger.error('Error analyzing Java project', { projectPath, error: error.message });
      throw error;
    }
  }

  generateProjectSummary(analyses) {
    const totalFiles = analyses.length;
    const totalLines = analyses.reduce((sum, analysis) => sum + analysis.linesOfCode, 0);
    const totalClasses = analyses.reduce((sum, analysis) => sum + analysis.classes.length, 0);
    const totalMethods = analyses.reduce((sum, analysis) => sum + analysis.methods.length, 0);
    const avgComplexity = analyses.reduce((sum, analysis) => sum + analysis.complexity, 0) / totalFiles;
    
    return {
      totalFiles,
      totalLines,
      totalClasses,
      totalMethods,
      avgComplexity: Math.round(avgComplexity * 100) / 100
    };
  }

  calculateProjectMetrics(analyses) {
    return {
      complexityDistribution: analyses.map(a => ({ file: a.fileName, complexity: a.complexity })),
      largestFiles: analyses.sort((a, b) => b.linesOfCode - a.linesOfCode).slice(0, 10),
      mostComplexMethods: analyses
        .flatMap(a => a.methods.map(m => ({ file: a.fileName, ...m })))
        .sort((a, b) => b.complexity - a.complexity)
        .slice(0, 10)
    };
  }
}