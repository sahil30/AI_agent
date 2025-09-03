"""Jira client with support for both standard and custom APIs."""

import re
import requests
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from .config import config


@dataclass
class JiraIssue:
    """Jira issue representation."""
    id: str
    key: str
    summary: str
    description: Optional[str] = None
    status: Optional[str] = None
    assignee: Optional[str] = None
    reporter: Optional[str] = None
    created: Optional[str] = None
    updated: Optional[str] = None
    priority: Optional[str] = None
    issue_type: Optional[str] = None
    project: Optional[str] = None
    labels: List[str] = None

    def __post_init__(self):
        if self.labels is None:
            self.labels = []


@dataclass
class JiraComment:
    """Jira comment representation."""
    id: str
    author: str
    body: str
    created: str
    updated: Optional[str] = None


@dataclass
class JiraProject:
    """Jira project representation."""
    id: str
    key: str
    name: str
    description: Optional[str] = None
    lead: Optional[str] = None


@dataclass
class JiraTransition:
    """Jira transition representation."""
    id: str
    name: str
    to_status: str


class JiraClient:
    """Client for interacting with Jira API or custom API."""

    def __init__(self):
        self.base_url = config.jira.base_url.rstrip('/')
        self.use_custom_api = config.server.use_custom_api
        self.timeout = 30
        
        self.session = requests.Session()
        
        if self.use_custom_api:
            self.session.headers.update({
                'Authorization': f'Bearer {config.custom_api.api_key}',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            })
        else:
            self.session.auth = (config.jira.username, config.jira.api_token)
            self.session.headers.update({
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            })

    def get_issue(self, issue_key: str) -> JiraIssue:
        """Get a specific issue by key."""
        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/issues/{issue_key}"
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_custom_issue(response.json())
        else:
            url = f"{self.base_url}/rest/api/3/issue/{issue_key}"
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_jira_issue(response.json())

    def search_issues(self, jql: str, max_results: int = None, start_at: int = 0) -> Dict[str, Any]:
        """Search for issues using JQL."""
        if max_results is None:
            max_results = config.server.max_results_default

        if self.use_custom_api:
            filters = self._parse_jql_to_filters(jql)
            url = f"{self.base_url}/{config.custom_api.version}/issues/search"
            params = {**filters, 'limit': max_results, 'offset': start_at}
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_custom_search_result(response.json(), max_results, start_at)
        else:
            url = f"{self.base_url}/rest/api/3/search"
            payload = {
                'jql': jql,
                'maxResults': max_results,
                'startAt': start_at,
                'fields': ['summary', 'status', 'assignee', 'reporter', 'created', 'updated', 'priority', 'issuetype', 'project', 'labels', 'description']
            }
            response = self.session.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            return {
                'issues': [self._normalize_jira_issue(issue) for issue in data.get('issues', [])],
                'total': data.get('total', 0),
                'maxResults': data.get('maxResults', max_results),
                'startAt': data.get('startAt', start_at)
            }

    def create_issue(self, project_key: str, summary: str, **kwargs) -> JiraIssue:
        """Create a new issue."""
        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/issues"
            payload = {
                'project': project_key,
                'title': summary,
                'description': kwargs.get('description', ''),
                'type': kwargs.get('issue_type', 'Task').lower(),
                'priority': kwargs.get('priority'),
                'assignee': kwargs.get('assignee'),
                'labels': kwargs.get('labels', []),
            }
            response = self.session.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_custom_issue(response.json())
        else:
            url = f"{self.base_url}/rest/api/3/issue"
            payload = {
                'fields': {
                    'project': {'key': project_key},
                    'summary': summary,
                    'issuetype': {'name': kwargs.get('issue_type', 'Task')},
                }
            }
            
            if kwargs.get('description'):
                payload['fields']['description'] = {
                    'type': 'doc',
                    'version': 1,
                    'content': [{
                        'type': 'paragraph',
                        'content': [{'type': 'text', 'text': kwargs['description']}]
                    }]
                }
            
            if kwargs.get('priority'):
                payload['fields']['priority'] = {'name': kwargs['priority']}
            if kwargs.get('assignee'):
                payload['fields']['assignee'] = {'name': kwargs['assignee']}
            if kwargs.get('labels'):
                payload['fields']['labels'] = kwargs['labels']

            response = self.session.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            created_issue = response.json()
            return self.get_issue(created_issue['key'])

    def update_issue(self, issue_key: str, **kwargs) -> None:
        """Update an existing issue."""
        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/issues/{issue_key}"
            payload = {}
            if kwargs.get('summary'):
                payload['title'] = kwargs['summary']
            if kwargs.get('description'):
                payload['description'] = kwargs['description']
            if kwargs.get('assignee'):
                payload['assignee'] = kwargs['assignee']
            if kwargs.get('priority'):
                payload['priority'] = kwargs['priority']
            if kwargs.get('labels'):
                payload['labels'] = kwargs['labels']
            
            response = self.session.put(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
        else:
            url = f"{self.base_url}/rest/api/3/issue/{issue_key}"
            fields = {}
            
            if kwargs.get('summary'):
                fields['summary'] = kwargs['summary']
            if kwargs.get('description'):
                fields['description'] = {
                    'type': 'doc',
                    'version': 1,
                    'content': [{
                        'type': 'paragraph',
                        'content': [{'type': 'text', 'text': kwargs['description']}]
                    }]
                }
            if kwargs.get('assignee'):
                fields['assignee'] = {'name': kwargs['assignee']}
            if kwargs.get('priority'):
                fields['priority'] = {'name': kwargs['priority']}
            if kwargs.get('labels'):
                fields['labels'] = kwargs['labels']

            payload = {'fields': fields}
            response = self.session.put(url, json=payload, timeout=self.timeout)
            response.raise_for_status()

    def add_comment(self, issue_key: str, comment: str) -> JiraComment:
        """Add a comment to an issue."""
        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/issues/{issue_key}/comments"
            payload = {'comment': comment}
            response = self.session.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_custom_comment(response.json())
        else:
            url = f"{self.base_url}/rest/api/3/issue/{issue_key}/comment"
            payload = {
                'body': {
                    'type': 'doc',
                    'version': 1,
                    'content': [{
                        'type': 'paragraph',
                        'content': [{'type': 'text', 'text': comment}]
                    }]
                }
            }
            response = self.session.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_jira_comment(response.json())

    def get_comments(self, issue_key: str) -> List[JiraComment]:
        """Get all comments for an issue."""
        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/issues/{issue_key}/comments"
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            comments = data.get('comments', data.get('data', []))
            return [self._normalize_custom_comment(comment) for comment in comments]
        else:
            url = f"{self.base_url}/rest/api/3/issue/{issue_key}/comment"
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            return [self._normalize_jira_comment(comment) for comment in data.get('comments', [])]

    def get_projects(self) -> List[JiraProject]:
        """Get all projects."""
        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/projects"
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            projects = data.get('projects', data.get('data', []))
            return [self._normalize_custom_project(project) for project in projects]
        else:
            url = f"{self.base_url}/rest/api/3/project"
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            return [self._normalize_jira_project(project) for project in response.json()]

    def get_transitions(self, issue_key: str) -> List[JiraTransition]:
        """Get available transitions for an issue."""
        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/issues/{issue_key}/transitions"
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            transitions = data.get('transitions', data.get('data', []))
            return [self._normalize_custom_transition(t) for t in transitions]
        else:
            url = f"{self.base_url}/rest/api/3/issue/{issue_key}/transitions"
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            return [self._normalize_jira_transition(t) for t in data.get('transitions', [])]

    def transition_issue(self, issue_key: str, transition_id: str) -> None:
        """Transition an issue to a new status."""
        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/issues/{issue_key}/transitions"
            payload = {'transition': transition_id}
            response = self.session.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
        else:
            url = f"{self.base_url}/rest/api/3/issue/{issue_key}/transitions"
            payload = {'transition': {'id': transition_id}}
            response = self.session.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()

    def _normalize_jira_issue(self, data: Dict[str, Any]) -> JiraIssue:
        """Normalize Jira API issue response."""
        fields = data.get('fields', {})
        
        # Handle description
        description = fields.get('description')
        if description and isinstance(description, dict):
            # Extract text from ADF format
            description = self._extract_text_from_adf(description)
        
        return JiraIssue(
            id=data.get('id', ''),
            key=data.get('key', ''),
            summary=fields.get('summary', ''),
            description=description,
            status=fields.get('status', {}).get('name'),
            assignee=fields.get('assignee', {}).get('displayName') if fields.get('assignee') else None,
            reporter=fields.get('reporter', {}).get('displayName') if fields.get('reporter') else None,
            created=fields.get('created'),
            updated=fields.get('updated'),
            priority=fields.get('priority', {}).get('name') if fields.get('priority') else None,
            issue_type=fields.get('issuetype', {}).get('name'),
            project=fields.get('project', {}).get('key'),
            labels=fields.get('labels', [])
        )

    def _normalize_custom_issue(self, data: Dict[str, Any]) -> JiraIssue:
        """Normalize custom API issue response."""
        return JiraIssue(
            id=data.get('id') or data.get('issue_id') or '',
            key=data.get('key') or data.get('id') or data.get('number') or '',
            summary=data.get('title') or data.get('summary') or data.get('name') or '',
            description=data.get('description') or data.get('body') or data.get('content'),
            status=data.get('status') or data.get('state'),
            assignee=self._get_user_name(data.get('assignee')),
            reporter=self._get_user_name(data.get('reporter') or data.get('created_by')),
            created=data.get('created') or data.get('created_at'),
            updated=data.get('updated') or data.get('updated_at'),
            priority=data.get('priority'),
            issue_type=data.get('type') or data.get('issue_type') or 'Task',
            project=data.get('project') or data.get('project_key'),
            labels=data.get('labels') or data.get('tags') or []
        )

    def _normalize_jira_comment(self, data: Dict[str, Any]) -> JiraComment:
        """Normalize Jira API comment response."""
        body = data.get('body', {})
        if isinstance(body, dict):
            body = self._extract_text_from_adf(body)
        
        return JiraComment(
            id=data.get('id', ''),
            author=data.get('author', {}).get('displayName', 'Unknown'),
            body=body or '',
            created=data.get('created', ''),
            updated=data.get('updated')
        )

    def _normalize_custom_comment(self, data: Dict[str, Any]) -> JiraComment:
        """Normalize custom API comment response."""
        return JiraComment(
            id=data.get('id') or data.get('comment_id') or '',
            author=data.get('author') or data.get('user') or data.get('created_by') or 'Unknown',
            body=data.get('comment') or data.get('body') or data.get('content') or '',
            created=data.get('created') or data.get('created_at') or '',
            updated=data.get('updated') or data.get('updated_at')
        )

    def _normalize_jira_project(self, data: Dict[str, Any]) -> JiraProject:
        """Normalize Jira API project response."""
        return JiraProject(
            id=data.get('id', ''),
            key=data.get('key', ''),
            name=data.get('name', ''),
            description=data.get('description'),
            lead=data.get('lead', {}).get('displayName') if data.get('lead') else None
        )

    def _normalize_custom_project(self, data: Dict[str, Any]) -> JiraProject:
        """Normalize custom API project response."""
        return JiraProject(
            id=data.get('id') or data.get('project_id') or '',
            key=data.get('key') or data.get('code') or data.get('id') or '',
            name=data.get('name') or data.get('title') or '',
            description=data.get('description'),
            lead=self._get_user_name(data.get('lead') or data.get('owner'))
        )

    def _normalize_jira_transition(self, data: Dict[str, Any]) -> JiraTransition:
        """Normalize Jira API transition response."""
        return JiraTransition(
            id=data.get('id', ''),
            name=data.get('name', ''),
            to_status=data.get('to', {}).get('name', '')
        )

    def _normalize_custom_transition(self, data: Dict[str, Any]) -> JiraTransition:
        """Normalize custom API transition response."""
        return JiraTransition(
            id=data.get('id') or data.get('transition_id') or '',
            name=data.get('name') or data.get('status') or data.get('to_status') or '',
            to_status=data.get('to_status') or data.get('target_status') or data.get('name') or ''
        )

    def _normalize_custom_search_result(self, data: Dict[str, Any], max_results: int, start_at: int) -> Dict[str, Any]:
        """Normalize custom API search response."""
        issues = data.get('issues', data.get('data', data.get('results', [])))
        return {
            'issues': [self._normalize_custom_issue(issue) for issue in issues],
            'total': data.get('total', len(issues)),
            'maxResults': max_results,
            'startAt': start_at
        }

    def _parse_jql_to_filters(self, jql: str) -> Dict[str, Any]:
        """Convert simple JQL queries to filter parameters."""
        filters = {}
        
        # Extract project
        project_match = re.search(r'project\s*=\s*([^\s]+)', jql, re.IGNORECASE)
        if project_match:
            filters['project'] = project_match.group(1).strip('"\'')
        
        # Extract status
        status_match = re.search(r'status\s*=\s*([^\s]+)', jql, re.IGNORECASE)
        if status_match:
            filters['status'] = status_match.group(1).strip('"\'').replace('"', '')
        
        # Extract assignee
        assignee_match = re.search(r'assignee\s*=\s*([^\s]+)', jql, re.IGNORECASE)
        if assignee_match:
            assignee = assignee_match.group(1).strip('"\'')
            if assignee == 'currentuser()':
                assignee = 'me'
            filters['assignee'] = assignee
        
        return filters

    def _extract_text_from_adf(self, adf_content: Dict[str, Any]) -> str:
        """Extract plain text from Atlassian Document Format."""
        if not adf_content or not isinstance(adf_content, dict):
            return ""
        
        text_parts = []
        
        def extract_text(node):
            if isinstance(node, dict):
                if node.get('type') == 'text':
                    text_parts.append(node.get('text', ''))
                elif 'content' in node:
                    for child in node['content']:
                        extract_text(child)
            elif isinstance(node, list):
                for item in node:
                    extract_text(item)
        
        extract_text(adf_content)
        return ' '.join(text_parts)

    def _get_user_name(self, user_data: Any) -> Optional[str]:
        """Extract user name from various user data formats."""
        if not user_data:
            return None
        if isinstance(user_data, str):
            return user_data
        if isinstance(user_data, dict):
            return user_data.get('name') or user_data.get('displayName') or user_data.get('email')
        return str(user_data)