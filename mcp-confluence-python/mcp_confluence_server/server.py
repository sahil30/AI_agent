#!/usr/bin/env python3
"""
MCP Confluence Server - Model Context Protocol server for Confluence integration.
Supports both standard Confluence API and custom APIs.
"""

import asyncio
import json
import logging
import sys
from typing import Any, Dict, List, Optional, Sequence

import mcp.types as types
from mcp.server import NotificationOptions, Server
from mcp.server.models import InitializationOptions
import mcp.server.stdio

from .client import ConfluenceClient, ConfluencePage, ConfluenceSpace, ConfluenceComment
from .config import config

# Set up logging
logging.basicConfig(level=getattr(logging, config.server.log_level))
logger = logging.getLogger(__name__)

app = Server("confluence-mcp-server")


@app.list_tools()
async def handle_list_tools() -> List[types.Tool]:
    """List available tools."""
    return [
        types.Tool(
            name="confluence_get_page",
            description="Get a specific Confluence page by ID",
            inputSchema={
                "type": "object",
                "properties": {
                    "page_id": {
                        "type": "string",
                        "description": "The Confluence page ID",
                    },
                    "expand": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of properties to expand (e.g., body.storage, version, space)",
                        "default": ["body.storage", "version", "space"],
                    },
                },
                "required": ["page_id"],
            },
        ),
        types.Tool(
            name="confluence_get_page_by_title",
            description="Get a Confluence page by title in a specific space",
            inputSchema={
                "type": "object",
                "properties": {
                    "space_key": {
                        "type": "string",
                        "description": "The space key",
                    },
                    "title": {
                        "type": "string",
                        "description": "The page title",
                    },
                },
                "required": ["space_key", "title"],
            },
        ),
        types.Tool(
            name="confluence_search_content",
            description="Search for Confluence content using CQL",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "CQL (Confluence Query Language) or simple search query",
                    },
                    "max_results": {
                        "type": "number",
                        "description": "Maximum number of results to return",
                        "default": config.server.max_results_default,
                    },
                    "start_at": {
                        "type": "number",
                        "description": "Starting index for pagination",
                        "default": 0,
                    },
                },
                "required": ["query"],
            },
        ),
        types.Tool(
            name="confluence_create_page",
            description="Create a new Confluence page",
            inputSchema={
                "type": "object",
                "properties": {
                    "space_key": {
                        "type": "string",
                        "description": "The space key where to create the page",
                    },
                    "title": {
                        "type": "string",
                        "description": "Page title",
                    },
                    "content": {
                        "type": "string",
                        "description": "Page content in Confluence storage format",
                    },
                    "parent_page_id": {
                        "type": "string",
                        "description": "ID of the parent page (optional)",
                    },
                },
                "required": ["space_key", "title", "content"],
            },
        ),
        types.Tool(
            name="confluence_update_page",
            description="Update an existing Confluence page",
            inputSchema={
                "type": "object",
                "properties": {
                    "page_id": {
                        "type": "string",
                        "description": "The page ID to update",
                    },
                    "title": {
                        "type": "string",
                        "description": "New page title",
                    },
                    "content": {
                        "type": "string",
                        "description": "New page content in Confluence storage format",
                    },
                    "version": {
                        "type": "number",
                        "description": "Current version number of the page",
                    },
                },
                "required": ["page_id", "title", "content", "version"],
            },
        ),
        types.Tool(
            name="confluence_delete_page",
            description="Delete a Confluence page",
            inputSchema={
                "type": "object",
                "properties": {
                    "page_id": {
                        "type": "string",
                        "description": "The page ID to delete",
                    }
                },
                "required": ["page_id"],
            },
        ),
        types.Tool(
            name="confluence_get_spaces",
            description="Get all Confluence spaces",
            inputSchema={
                "type": "object",
                "properties": {
                    "max_results": {
                        "type": "number",
                        "description": "Maximum number of results to return",
                        "default": config.server.max_results_default,
                    }
                },
            },
        ),
        types.Tool(
            name="confluence_get_space",
            description="Get a specific Confluence space",
            inputSchema={
                "type": "object",
                "properties": {
                    "space_key": {
                        "type": "string",
                        "description": "The space key",
                    }
                },
                "required": ["space_key"],
            },
        ),
        types.Tool(
            name="confluence_get_page_children",
            description="Get child pages of a Confluence page",
            inputSchema={
                "type": "object",
                "properties": {
                    "page_id": {
                        "type": "string",
                        "description": "The parent page ID",
                    }
                },
                "required": ["page_id"],
            },
        ),
        types.Tool(
            name="confluence_add_comment",
            description="Add a comment to a Confluence page",
            inputSchema={
                "type": "object",
                "properties": {
                    "page_id": {
                        "type": "string",
                        "description": "The page ID",
                    },
                    "comment": {
                        "type": "string",
                        "description": "Comment text to add",
                    },
                },
                "required": ["page_id", "comment"],
            },
        ),
        types.Tool(
            name="confluence_get_comments",
            description="Get all comments for a Confluence page",
            inputSchema={
                "type": "object",
                "properties": {
                    "page_id": {
                        "type": "string",
                        "description": "The page ID",
                    }
                },
                "required": ["page_id"],
            },
        ),
    ]


@app.call_tool()
async def handle_call_tool(
    name: str, arguments: Dict[str, Any]
) -> List[types.TextContent]:
    """Handle tool calls."""
    try:
        client = ConfluenceClient()
        
        if name == "confluence_get_page":
            page = client.get_page(
                arguments["page_id"],
                arguments.get("expand", ["body.storage", "version", "space"])
            )
            return [types.TextContent(type="text", text=json.dumps(page.__dict__, indent=2, default=str))]
        
        elif name == "confluence_get_page_by_title":
            page = client.get_page_by_title(arguments["space_key"], arguments["title"])
            if page:
                return [types.TextContent(type="text", text=json.dumps(page.__dict__, indent=2, default=str))]
            else:
                return [types.TextContent(type="text", text=f"Page '{arguments['title']}' not found in space {arguments['space_key']}")]
        
        elif name == "confluence_search_content":
            result = client.search_content(
                arguments["query"],
                arguments.get("max_results", config.server.max_results_default),
                arguments.get("start_at", 0)
            )
            
            # Convert ConfluencePage objects to dicts for JSON serialization
            serializable_result = {
                "results": [page.__dict__ for page in result["results"]],
                "start": result["start"],
                "limit": result["limit"],
                "size": result["size"]
            }
            
            return [types.TextContent(type="text", text=json.dumps(serializable_result, indent=2, default=str))]
        
        elif name == "confluence_create_page":
            page = client.create_page(
                arguments["space_key"],
                arguments["title"],
                arguments["content"],
                arguments.get("parent_page_id")
            )
            return [types.TextContent(type="text", text=json.dumps(page.__dict__, indent=2, default=str))]
        
        elif name == "confluence_update_page":
            page = client.update_page(
                arguments["page_id"],
                arguments["title"],
                arguments["content"],
                arguments["version"]
            )
            return [types.TextContent(type="text", text=json.dumps(page.__dict__, indent=2, default=str))]
        
        elif name == "confluence_delete_page":
            client.delete_page(arguments["page_id"])
            return [types.TextContent(type="text", text=f"Successfully deleted page {arguments['page_id']}")]
        
        elif name == "confluence_get_spaces":
            spaces = client.get_spaces(arguments.get("max_results", config.server.max_results_default))
            serializable_spaces = [space.__dict__ for space in spaces]
            return [types.TextContent(type="text", text=json.dumps(serializable_spaces, indent=2, default=str))]
        
        elif name == "confluence_get_space":
            space = client.get_space(arguments["space_key"])
            return [types.TextContent(type="text", text=json.dumps(space.__dict__, indent=2, default=str))]
        
        elif name == "confluence_get_page_children":
            children = client.get_page_children(arguments["page_id"])
            serializable_children = [child.__dict__ for child in children]
            return [types.TextContent(type="text", text=json.dumps(serializable_children, indent=2, default=str))]
        
        elif name == "confluence_add_comment":
            comment = client.add_comment(arguments["page_id"], arguments["comment"])
            return [types.TextContent(type="text", text=json.dumps(comment.__dict__, indent=2, default=str))]
        
        elif name == "confluence_get_comments":
            comments = client.get_comments(arguments["page_id"])
            serializable_comments = [comment.__dict__ for comment in comments]
            return [types.TextContent(type="text", text=json.dumps(serializable_comments, indent=2, default=str))]
        
        else:
            raise ValueError(f"Unknown tool: {name}")
    
    except Exception as e:
        error_msg = f"Error executing tool {name}: {str(e)}"
        logger.error(error_msg)
        return [types.TextContent(type="text", text=error_msg)]


async def main():
    """Main entry point for the server."""
    try:
        # Validate configuration
        config.validate()
        
        # Run the server using stdin/stdout streams
        async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
            await app.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="confluence-mcp-server",
                    server_version="1.0.0",
                    capabilities=app.get_capabilities(
                        notification_options=NotificationOptions(),
                        experimental_capabilities={},
                    ),
                ),
            )
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())