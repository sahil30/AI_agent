# MCP Jira Server - Python 3.12

A Model Context Protocol (MCP) server that provides integration with Jira for Claude Desktop and other MCP clients. Supports both standard Atlassian Jira API and custom APIs.

## Features

🎯 **Comprehensive Jira Integration**
- Get, search, create, update issues
- Add comments and manage transitions
- Access project information
- List available transitions and execute status changes

🔌 **Flexible API Support**
- **Standard Jira API**: Traditional Atlassian Jira integration
- **Custom API**: Use your own API endpoints with automatic format adaptation
- **Seamless Switching**: Change between API types via configuration

🤖 **MCP Compatible**
- Works with Claude Desktop
- Provides structured tools and resources
- Async/await architecture for performance

## Requirements

- Python 3.12+
- MCP library
- **Either**: Atlassian Jira (username + API token)
- **Or**: Custom API (base URL + API key)

## Installation

1. Clone or download the project:
```bash
git clone <repository-url>
cd mcp-jira-python
```

2. Install dependencies:
```bash
pip install -e .
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

## Configuration

### Option A: Standard Jira API
```bash
# .env file
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token
USE_CUSTOM_API=false
LOG_LEVEL=INFO
MAX_RESULTS_DEFAULT=50
```

### Option B: Custom API
```bash
# .env file
CUSTOM_API_BASE_URL=https://your-api-domain.com
CUSTOM_API_KEY=your-custom-api-key
CUSTOM_API_VERSION=v1
USE_CUSTOM_API=true
LOG_LEVEL=INFO
MAX_RESULTS_DEFAULT=50
```

## Claude Desktop Setup

Add this server to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jira": {
      "command": "python",
      "args": ["-m", "mcp_jira_server.server"],
      "cwd": "/path/to/mcp-jira-python"
    }
  }
}
```

## Available Tools

### Issue Management
- `jira_get_issue` - Get a specific issue by key
- `jira_search_issues` - Search issues using JQL
- `jira_create_issue` - Create a new issue
- `jira_update_issue` - Update an existing issue

### Comments
- `jira_add_comment` - Add a comment to an issue
- `jira_get_comments` - Get all comments for an issue

### Project Management
- `jira_get_projects` - Get all available projects

### Workflow
- `jira_get_transitions` - Get available transitions for an issue
- `jira_transition_issue` - Move an issue to a new status

## Usage Examples

### In Claude Desktop

```
Get issue DEMO-123
```

```
Search for all open bugs in project MYPROJ
```

```
Create a new bug in project DEMO with title "Login page not loading" and description "Users report 500 error on login"
```

```
Add comment to DEMO-123: "Working on this issue, will have fix by EOD"
```

### Custom API Integration

The server automatically adapts to your custom API format. Your API should support these endpoint patterns:

```
GET    /v1/issues/{id}           # Get issue
GET    /v1/issues/search         # Search issues
POST   /v1/issues               # Create issue
PUT    /v1/issues/{id}           # Update issue
GET    /v1/projects              # Get projects
GET    /v1/issues/{id}/comments  # Get comments
POST   /v1/issues/{id}/comments  # Add comment
```

Expected response formats:
- Issues: `{id, key/number, title/summary, description, status, assignee, ...}`
- Projects: `{id, key/code, name, description, ...}`
- Comments: `{id, author, comment/body, created, ...}`

## Testing

Run the server directly to test:
```bash
python -m mcp_jira_server.server
```

Or test with the MCP inspector:
```bash
npx @modelcontextprotocol/inspector python -m mcp_jira_server.server
```

## Error Handling

The server includes comprehensive error handling:
- Configuration validation on startup
- API timeout and retry logic
- Graceful degradation for missing fields
- Detailed error messages with context

## Development

Install development dependencies:
```bash
pip install -e .[dev]
```

Run tests:
```bash
pytest
```

Format code:
```bash
black mcp_jira_server/
```

## License

MIT License - see LICENSE file for details.