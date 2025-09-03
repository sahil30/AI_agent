#!/usr/bin/env python3
"""
MCP Jira Server - Model Context Protocol server for Jira integration.
Supports both standard Jira API and custom APIs.
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

from .client import JiraClient, JiraIssue, JiraComment, JiraProject, JiraTransition
from .config import config

# Set up logging
logging.basicConfig(level=getattr(logging, config.server.log_level))
logger = logging.getLogger(__name__)

app = Server("jira-mcp-server")


@app.list_tools()
async def handle_list_tools() -> List[types.Tool]:
    """List available tools."""
    return [
        types.Tool(
            name="jira_get_issue",
            description="Get a specific Jira issue by key",
            inputSchema={
                "type": "object",
                "properties": {
                    "issue_key": {
                        "type": "string",
                        "description": "The Jira issue key (e.g., PROJ-123)",
                    }
                },
                "required": ["issue_key"],
            },
        ),
        types.Tool(
            name="jira_search_issues",
            description="Search for Jira issues using JQL query",
            inputSchema={
                "type": "object",
                "properties": {
                    "jql": {
                        "type": "string",
                        "description": "JQL (Jira Query Language) string",
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
                "required": ["jql"],
            },
        ),
        types.Tool(
            name="jira_create_issue",
            description="Create a new Jira issue",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_key": {
                        "type": "string",
                        "description": "The project key where to create the issue",
                    },
                    "summary": {
                        "type": "string",
                        "description": "Issue summary/title",
                    },
                    "description": {
                        "type": "string",
                        "description": "Issue description",
                    },
                    "issue_type": {
                        "type": "string",
                        "description": "Issue type (e.g., Task, Bug, Story)",
                        "default": "Task",
                    },
                    "priority": {
                        "type": "string",
                        "description": "Issue priority (e.g., High, Medium, Low)",
                    },
                    "assignee": {
                        "type": "string",
                        "description": "Assignee username or email",
                    },
                    "labels": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Array of labels to add to the issue",
                    },
                },
                "required": ["project_key", "summary"],
            },
        ),
        types.Tool(
            name="jira_update_issue",
            description="Update an existing Jira issue",
            inputSchema={
                "type": "object",
                "properties": {
                    "issue_key": {
                        "type": "string",
                        "description": "The Jira issue key to update",
                    },
                    "summary": {
                        "type": "string",
                        "description": "New issue summary/title",
                    },
                    "description": {
                        "type": "string",
                        "description": "New issue description",
                    },
                    "assignee": {
                        "type": "string",
                        "description": "New assignee username or email",
                    },
                    "priority": {
                        "type": "string",
                        "description": "New issue priority",
                    },
                    "labels": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Array of labels to set on the issue",
                    },
                },
                "required": ["issue_key"],
            },
        ),
        types.Tool(
            name="jira_add_comment",
            description="Add a comment to a Jira issue",
            inputSchema={
                "type": "object",
                "properties": {
                    "issue_key": {
                        "type": "string",
                        "description": "The Jira issue key",
                    },
                    "comment": {
                        "type": "string",
                        "description": "Comment text to add",
                    },
                },
                "required": ["issue_key", "comment"],
            },
        ),
        types.Tool(
            name="jira_get_comments",
            description="Get all comments for a Jira issue",
            inputSchema={
                "type": "object",
                "properties": {
                    "issue_key": {
                        "type": "string",
                        "description": "The Jira issue key",
                    }
                },
                "required": ["issue_key"],
            },
        ),
        types.Tool(
            name="jira_get_projects",
            description="Get all available Jira projects",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        types.Tool(
            name="jira_get_transitions",
            description="Get available transitions for a Jira issue",
            inputSchema={
                "type": "object",
                "properties": {
                    "issue_key": {
                        "type": "string",
                        "description": "The Jira issue key",
                    }
                },
                "required": ["issue_key"],
            },
        ),
        types.Tool(
            name="jira_transition_issue",
            description="Transition a Jira issue to a new status",
            inputSchema={
                "type": "object",
                "properties": {
                    "issue_key": {
                        "type": "string",
                        "description": "The Jira issue key",
                    },
                    "transition_id": {
                        "type": "string",
                        "description": "The ID of the transition to execute",
                    },
                },
                "required": ["issue_key", "transition_id"],
            },
        ),
    ]


@app.call_tool()
async def handle_call_tool(
    name: str, arguments: Dict[str, Any]
) -> List[types.TextContent]:
    """Handle tool calls."""
    try:
        client = JiraClient()
        
        if name == "jira_get_issue":
            issue = client.get_issue(arguments["issue_key"])
            return [types.TextContent(type="text", text=json.dumps(issue.__dict__, indent=2, default=str))]
        
        elif name == "jira_search_issues":
            result = client.search_issues(
                arguments["jql"],
                arguments.get("max_results", config.server.max_results_default),
                arguments.get("start_at", 0)
            )
            
            # Convert JiraIssue objects to dicts for JSON serialization
            serializable_result = {
                "issues": [issue.__dict__ for issue in result["issues"]],
                "total": result["total"],
                "maxResults": result["maxResults"],
                "startAt": result["startAt"]
            }
            
            return [types.TextContent(type="text", text=json.dumps(serializable_result, indent=2, default=str))]
        
        elif name == "jira_create_issue":
            issue = client.create_issue(
                arguments["project_key"],
                arguments["summary"],
                description=arguments.get("description"),
                issue_type=arguments.get("issue_type"),
                priority=arguments.get("priority"),
                assignee=arguments.get("assignee"),
                labels=arguments.get("labels")
            )
            return [types.TextContent(type="text", text=json.dumps(issue.__dict__, indent=2, default=str))]
        
        elif name == "jira_update_issue":
            client.update_issue(
                arguments["issue_key"],
                summary=arguments.get("summary"),
                description=arguments.get("description"),
                assignee=arguments.get("assignee"),
                priority=arguments.get("priority"),
                labels=arguments.get("labels")
            )
            return [types.TextContent(type="text", text=f"Successfully updated issue {arguments['issue_key']}")]
        
        elif name == "jira_add_comment":
            comment = client.add_comment(arguments["issue_key"], arguments["comment"])
            return [types.TextContent(type="text", text=json.dumps(comment.__dict__, indent=2, default=str))]
        
        elif name == "jira_get_comments":
            comments = client.get_comments(arguments["issue_key"])
            serializable_comments = [comment.__dict__ for comment in comments]
            return [types.TextContent(type="text", text=json.dumps(serializable_comments, indent=2, default=str))]
        
        elif name == "jira_get_projects":
            projects = client.get_projects()
            serializable_projects = [project.__dict__ for project in projects]
            return [types.TextContent(type="text", text=json.dumps(serializable_projects, indent=2, default=str))]
        
        elif name == "jira_get_transitions":
            transitions = client.get_transitions(arguments["issue_key"])
            serializable_transitions = [transition.__dict__ for transition in transitions]
            return [types.TextContent(type="text", text=json.dumps(serializable_transitions, indent=2, default=str))]
        
        elif name == "jira_transition_issue":
            client.transition_issue(arguments["issue_key"], arguments["transition_id"])
            return [types.TextContent(type="text", text=f"Successfully transitioned issue {arguments['issue_key']}")]
        
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
                    server_name="jira-mcp-server",
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