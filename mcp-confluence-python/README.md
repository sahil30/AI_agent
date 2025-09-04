# MCP Confluence Server - Python 3.12

A Model Context Protocol (MCP) server that provides integration with Confluence for Claude Desktop and other MCP clients. Supports both standard Atlassian Confluence API and custom APIs.

## Features

📖 **Comprehensive Confluence Integration**
- Get, search, create, update, delete pages
- Manage spaces and navigate page hierarchies
- Add and retrieve comments
- Full text search with CQL support

🔌 **Flexible API Support**
- **Standard Confluence API**: Traditional Atlassian Confluence integration
- **Custom API**: Use your own API endpoints with automatic format adaptation
- **Seamless Switching**: Change between API types via configuration

🤖 **MCP Compatible**
- Works with Claude Desktop
- Provides structured tools and resources
- Async/await architecture for performance

## Requirements

- Python 3.12+
- MCP library
- **Either**: Atlassian Confluence (username + API token)
- **Or**: Custom API (base URL + API key)

## Installation

1. Clone or download the project:
```bash
git clone <repository-url>
cd mcp-confluence-python
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

### Option A: Standard Confluence API (Bearer Token)
```bash
# .env file
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_ACCESS_TOKEN=your-confluence-access-token
USE_CUSTOM_API=false
USE_BEARER_TOKEN=true
LOG_LEVEL=INFO
MAX_RESULTS_DEFAULT=25
```

### Option A (Legacy): Standard Confluence API (Username + API Token)
```bash
# .env file
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_USERNAME=your-email@example.com
CONFLUENCE_API_TOKEN=your-confluence-api-token
USE_CUSTOM_API=false
USE_BEARER_TOKEN=false
LOG_LEVEL=INFO
MAX_RESULTS_DEFAULT=25
```

### Option B: Custom API
```bash
# .env file
CUSTOM_API_BASE_URL=https://your-api-domain.com
CUSTOM_API_KEY=your-custom-api-key
CUSTOM_API_VERSION=v1
USE_CUSTOM_API=true
LOG_LEVEL=INFO
MAX_RESULTS_DEFAULT=25
```

## Claude Desktop Setup

Add this server to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "confluence": {
      "command": "python",
      "args": ["-m", "mcp_confluence_server.server"],
      "cwd": "/path/to/mcp-confluence-python"
    }
  }
}
```

## Available Tools

### Page Management
- `confluence_get_page` - Get a specific page by ID
- `confluence_get_page_by_title` - Get a page by title in a space
- `confluence_create_page` - Create a new page
- `confluence_update_page` - Update an existing page
- `confluence_delete_page` - Delete a page

### Search
- `confluence_search_content` - Search pages using CQL or simple queries

### Space Management
- `confluence_get_spaces` - Get all available spaces
- `confluence_get_space` - Get a specific space

### Navigation
- `confluence_get_page_children` - Get child pages of a page

### Comments
- `confluence_add_comment` - Add a comment to a page
- `confluence_get_comments` - Get all comments for a page

## Usage Examples

### In Claude Desktop

```
Get page 12345
```

```
Search for pages about "API documentation"
```

```
Create a page in space DEV with title "REST API Guide" and content about our new API endpoints
```

```
Get all child pages of page 67890
```

```
Add comment to page 12345: "This documentation looks great! Thanks for the update."
```

### CQL Search Examples

```
Search for: space = DEV AND type = page AND title ~ "API"
```

```
Search for: text ~ "authentication" AND space = DOCS
```

### Custom API Integration

The server automatically adapts to your custom API format. Your API should support these endpoint patterns:

```
GET    /v1/pages/{id}            # Get page
GET    /v1/pages/search          # Search pages
POST   /v1/pages                 # Create page
PUT    /v1/pages/{id}            # Update page
DELETE /v1/pages/{id}            # Delete page
GET    /v1/spaces                # Get spaces
GET    /v1/pages/{id}/children   # Get child pages
GET    /v1/pages/{id}/comments   # Get comments
POST   /v1/pages/{id}/comments   # Add comment
```

Expected response formats:
- Pages: `{id, title/name, content/body, space, version, created, updated, ...}`
- Spaces: `{key/id, name/title, description, ...}`
- Comments: `{id, author, comment/body/content, created, ...}`

## Content Formats

### Confluence Storage Format
When creating/updating pages, content should be in Confluence storage format:

```html
<p>This is a paragraph with <strong>bold</strong> text.</p>
<h2>This is a heading</h2>
<ul>
  <li>Bullet point 1</li>
  <li>Bullet point 2</li>
</ul>
```

### Simple HTML
For custom APIs, simple HTML is also supported:

```html
<h1>Page Title</h1>
<p>Page content with <em>emphasis</em>.</p>
```

## Testing

Run the server directly to test:
```bash
python -m mcp_confluence_server.server
```

Or test with the MCP inspector:
```bash
npx @modelcontextprotocol/inspector python -m mcp_confluence_server.server
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
black mcp_confluence_server/
```

## API Mapping

### Confluence API → Custom API
The server automatically translates between formats:

| Confluence Field | Custom API Field | Description |
|------------------|------------------|-------------|
| `id` | `id`, `page_id` | Page identifier |
| `title` | `title`, `name` | Page title |
| `body.storage.value` | `content`, `body`, `text` | Page content |
| `space.key` | `space`, `space_key` | Space identifier |
| `version.number` | `version`, `revision` | Version number |

### Search Translation
- CQL queries are simplified for custom APIs
- Complex operators are converted to simple text search
- Space and type filters are preserved where possible

## License

MIT License - see LICENSE file for details.