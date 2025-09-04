# Bearer Token Authentication Guide

This guide shows you how to set up the Confluence MCP server using Bearer token authentication instead of username + API token.

## 🎯 **Why Use Bearer Tokens?**

Bearer tokens provide:
- **Simpler Authentication**: Just one token instead of username + API token
- **Better Security**: Tokens can have more granular permissions
- **Modern Standard**: More aligned with current API best practices
- **Easier Management**: No need to manage usernames separately

## 🔑 **Getting Your Bearer Token**

### Option 1: Atlassian Access Token

1. **Go to Atlassian Account Settings**:
   - Visit: https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Give it a label (e.g., "MCP Confluence Server")
   - Copy the generated token

2. **Use as Bearer Token**:
   ```bash
   CONFLUENCE_ACCESS_TOKEN=your_atlassian_api_token_here
   ```

### Option 2: Personal Access Token (PAT)

If your organization uses Personal Access Tokens:

1. **Go to Confluence Settings**:
   - Navigate to your Confluence instance
   - Go to Settings > Personal Access Tokens
   - Create a new token with appropriate permissions

2. **Use as Bearer Token**:
   ```bash
   CONFLUENCE_ACCESS_TOKEN=your_personal_access_token_here
   ```

### Option 3: OAuth 2.0 Access Token

For OAuth 2.0 applications:

1. **Complete OAuth Flow**: Get access token from your OAuth provider
2. **Use Directly**: Use the OAuth access token as the bearer token

## ⚙️ **Configuration**

### Simple Bearer Token Setup

Create your `.env` file:
```bash
# Required
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_ACCESS_TOKEN=your_access_token_here

# Authentication Method
USE_BEARER_TOKEN=true
USE_CUSTOM_API=false

# Optional Settings
LOG_LEVEL=INFO
MAX_RESULTS_DEFAULT=25
```

### Legacy Username + Token (Fallback)

If you prefer the old method:
```bash
# Required
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_USERNAME=your-email@example.com
CONFLUENCE_API_TOKEN=your-api-token-here

# Authentication Method
USE_BEARER_TOKEN=false
USE_CUSTOM_API=false
```

## 🔧 **Authentication Priority**

The server uses this authentication priority:

1. **Custom API**: If `USE_CUSTOM_API=true`, uses custom API key
2. **Bearer Token**: If `USE_BEARER_TOKEN=true` and `CONFLUENCE_ACCESS_TOKEN` is set
3. **Username/Token**: If both `CONFLUENCE_USERNAME` and `CONFLUENCE_API_TOKEN` are set
4. **Error**: If no valid authentication method is found

## ✅ **Testing Your Setup**

### Test Authentication
```bash
# Test the server directly
cd mcp-confluence-python
python -m mcp_confluence_server.server

# Should show server starting without authentication errors
```

### Test with Claude Desktop

Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "confluence": {
      "command": "python",
      "args": ["-m", "mcp_confluence_server.server"],
      "cwd": "/absolute/path/to/mcp-confluence-python"
    }
  }
}
```

Then test in Claude:
```
Get page 12345
Search for pages about documentation
```

## 🛠 **Troubleshooting**

### Common Issues

**"No valid authentication method configured"**:
- Check that `CONFLUENCE_ACCESS_TOKEN` is set
- Verify `USE_BEARER_TOKEN=true` in your .env
- Ensure no spaces in your token

**"401 Unauthorized" errors**:
- Verify your token is correct and not expired
- Check token permissions (needs read/write access to Confluence)
- Ensure base URL is correct

**"403 Forbidden" errors**:
- Token may not have sufficient permissions
- Check if your token has access to the specific space/page
- Verify your Confluence instance allows API access

### Debug Steps

1. **Enable Debug Logging**:
   ```bash
   LOG_LEVEL=DEBUG
   ```

2. **Test Token Manually**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        "https://your-domain.atlassian.net/wiki/rest/api/space"
   ```

3. **Check Token Permissions**:
   - Ensure token can read spaces
   - Verify token can create/edit pages
   - Check if token has comment permissions

## 🔐 **Security Best Practices**

1. **Token Storage**:
   - Never commit tokens to version control
   - Use environment variables
   - Consider using a secrets manager

2. **Token Permissions**:
   - Use minimum required permissions
   - Regularly audit token access
   - Set appropriate expiration dates

3. **Token Rotation**:
   - Rotate tokens regularly
   - Have a process for emergency revocation
   - Monitor token usage

## 📝 **Example .env File**

```bash
# Confluence Bearer Token Configuration
CONFLUENCE_BASE_URL=https://mycompany.atlassian.net/wiki
CONFLUENCE_ACCESS_TOKEN=ATATT3xFfGF0T4JNjMmFqEw8Ll_PaXX9gKqzXZzv123456789

# Authentication settings
USE_BEARER_TOKEN=true
USE_CUSTOM_API=false

# Server settings
LOG_LEVEL=INFO
MAX_RESULTS_DEFAULT=25
```

## 🎉 **You're Ready!**

With Bearer token authentication set up, your Confluence MCP server will use modern, secure authentication. The server will automatically handle the Bearer token in all API requests to Confluence.