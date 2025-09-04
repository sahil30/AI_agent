# MCP Jira & Confluence Servers Setup Guide

This guide shows you how to set up both the Jira and Confluence MCP servers for use with Claude Desktop.

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Claude Desktop app
- API access to Jira/Confluence OR your custom API

### Installation Steps

1. **Install both servers**:
```bash
# Jira MCP Server
cd mcp-jira-python
pip install -e .

# Confluence MCP Server  
cd ../mcp-confluence-python
pip install -e .
```

2. **Configure environment variables**:

**For Jira:**
```bash
cd mcp-jira-python
cp .env.example .env
# Edit .env with your Jira credentials
```

**For Confluence:**
```bash
cd mcp-confluence-python
cp .env.example .env  
# Edit .env with your Confluence credentials
```

3. **Add servers to Claude Desktop**:

Edit your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "jira": {
      "command": "python",
      "args": ["-m", "mcp_jira_server.server"],
      "cwd": "/absolute/path/to/mcp-jira-python"
    },
    "confluence": {
      "command": "python",
      "args": ["-m", "mcp_confluence_server.server"],
      "cwd": "/absolute/path/to/mcp-confluence-python"
    }
  }
}
```

4. **Restart Claude Desktop** to load the servers.

## 🔧 Configuration Options

### Standard Atlassian APIs

**Jira (.env)**:
```bash
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token
USE_CUSTOM_API=false
```

**Confluence (.env)** - Bearer Token (Recommended):
```bash
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_ACCESS_TOKEN=your-confluence-access-token
USE_CUSTOM_API=false
USE_BEARER_TOKEN=true
```

**Confluence (.env)** - Legacy Username/Token:
```bash
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_USERNAME=your-email@example.com
CONFLUENCE_API_TOKEN=your-confluence-api-token
USE_CUSTOM_API=false
USE_BEARER_TOKEN=false
```

### Custom APIs

**Jira (.env)**:
```bash
CUSTOM_API_BASE_URL=https://your-api-domain.com
CUSTOM_API_KEY=your-custom-api-key
CUSTOM_API_VERSION=v1
USE_CUSTOM_API=true
```

**Confluence (.env)**:
```bash
CUSTOM_API_BASE_URL=https://your-api-domain.com
CUSTOM_API_KEY=your-custom-api-key
CUSTOM_API_VERSION=v1
USE_CUSTOM_API=true
```

## 🎯 Usage in Claude Desktop

Once configured, you can use natural language commands:

### Jira Commands
```
Get issue DEMO-123
Search for all open bugs in project MYPROJ
Create a new task in DEMO: "Update documentation"
Add comment to DEMO-123: "Fixed in latest release"
Show me all projects
What are the available transitions for DEMO-123?
```

### Confluence Commands
```
Get page 12345
Search for pages about API authentication
Create a page in DEV space with title "New API Guide"
Show me all spaces
Get child pages of page 67890
Add a comment to page 12345 about the recent updates
```

### Combined Workflows
```
Get issue DEMO-123 and create a Confluence page documenting the solution
Search for all high priority bugs and create a summary page in DOCS space
```

## 🔍 Testing Your Setup

Test each server individually:

```bash
# Test Jira server
cd mcp-jira-python
python -m mcp_jira_server.server

# Test Confluence server  
cd mcp-confluence-python
python -m mcp_confluence_server.server
```

Use the MCP inspector for debugging:
```bash
# Install inspector
npm install -g @modelcontextprotocol/inspector

# Test Jira
npx @modelcontextprotocol/inspector python -m mcp_jira_server.server

# Test Confluence
npx @modelcontextprotocol/inspector python -m mcp_confluence_server.server
```

## 🛠 Custom API Requirements

If using custom APIs, ensure your endpoints support these patterns:

### Jira-like API Endpoints
```
GET    /v1/issues/{id}              # Get issue
GET    /v1/issues/search            # Search issues  
POST   /v1/issues                   # Create issue
PUT    /v1/issues/{id}              # Update issue
GET    /v1/projects                 # List projects
GET    /v1/issues/{id}/comments     # Get comments
POST   /v1/issues/{id}/comments     # Add comment
GET    /v1/issues/{id}/transitions  # Get transitions
POST   /v1/issues/{id}/transitions  # Execute transition
```

### Confluence-like API Endpoints  
```
GET    /v1/pages/{id}               # Get page
GET    /v1/pages/search             # Search pages
POST   /v1/pages                    # Create page
PUT    /v1/pages/{id}               # Update page
DELETE /v1/pages/{id}               # Delete page
GET    /v1/spaces                   # List spaces
GET    /v1/pages/{id}/children      # Get child pages
GET    /v1/pages/{id}/comments      # Get comments
POST   /v1/pages/{id}/comments      # Add comment
```

## 📊 Expected Response Formats

### Jira Issue Response
```json
{
  "id": "123",
  "key": "DEMO-123", 
  "title": "Issue title",
  "description": "Issue description",
  "status": "Open",
  "assignee": "john@example.com",
  "created": "2024-01-01T00:00:00Z",
  "project": "DEMO"
}
```

### Confluence Page Response
```json
{
  "id": "456",
  "title": "Page title",
  "content": "<p>Page content</p>",
  "space": "DEV",
  "version": 1,
  "created": "2024-01-01T00:00:00Z"
}
```

## 🔒 Security Best Practices

1. **Use API tokens, not passwords**
2. **Restrict API token permissions** to minimum required
3. **Keep .env files secure** and never commit them
4. **Use HTTPS** for all API endpoints
5. **Regularly rotate** API tokens

## 🐛 Troubleshooting

### Common Issues

**Server not starting:**
- Check Python version (3.12+ required)
- Verify all dependencies installed: `pip install -e .`
- Check .env file exists and has correct values

**Authentication errors:**
- Verify API tokens are correct and not expired
- Check API token permissions in Jira/Confluence
- Ensure base URLs are correct (no trailing slash)

**Claude Desktop not seeing servers:**
- Check claude_desktop_config.json syntax
- Use absolute paths in "cwd" field
- Restart Claude Desktop after config changes
- Check Claude Desktop logs

**Custom API not working:**
- Verify USE_CUSTOM_API=true in .env
- Check API endpoint URLs and authentication
- Review server logs for API response format issues
- Test endpoints manually with curl/Postman

### Debug Mode

Enable debug logging:
```bash
# In .env file
LOG_LEVEL=DEBUG
```

### Getting Help

1. Check server logs for error messages
2. Test with MCP inspector tool
3. Verify API endpoints work with curl
4. Review example requests/responses in docs

## 📚 Additional Resources

- [MCP Specification](https://modelcontextprotocol.io)
- [Claude Desktop MCP Guide](https://claude.ai/docs)
- [Atlassian REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/)

## 🎉 You're Ready!

Once set up, you'll have powerful Jira and Confluence integration in Claude Desktop. The AI can help you:
- Manage issues and projects
- Create and update documentation  
- Search across both platforms
- Automate workflows between Jira and Confluence

Happy automating! 🚀