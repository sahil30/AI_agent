"""Confluence client with support for both standard and custom APIs."""

import re
import requests
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from .config import config


@dataclass
class ConfluencePage:
    """Confluence page representation."""
    id: str
    title: str
    content: Optional[str] = None
    space_key: Optional[str] = None
    space_name: Optional[str] = None
    status: Optional[str] = None
    version: Optional[int] = None
    created: Optional[str] = None
    updated: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    url: Optional[str] = None


@dataclass
class ConfluenceSpace:
    """Confluence space representation."""
    key: str
    name: str
    description: Optional[str] = None
    type: Optional[str] = None
    url: Optional[str] = None


@dataclass
class ConfluenceComment:
    """Confluence comment representation."""
    id: str
    content: str
    author: str
    created: str
    updated: Optional[str] = None


class ConfluenceClient:
    """Client for interacting with Confluence API or custom API."""

    def __init__(self):
        self.base_url = config.confluence.base_url.rstrip('/')
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
            self.session.auth = (config.confluence.username, config.confluence.api_token)
            self.session.headers.update({
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            })

    def get_page(self, page_id: str, expand: Optional[List[str]] = None) -> ConfluencePage:
        """Get a specific page by ID."""
        if expand is None:
            expand = ['body.storage', 'version', 'space']

        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/pages/{page_id}"
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_custom_page(response.json())
        else:
            url = f"{self.base_url}/rest/api/content/{page_id}"
            params = {'expand': ','.join(expand)}
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_confluence_page(response.json())

    def get_page_by_title(self, space_key: str, title: str) -> Optional[ConfluencePage]:
        """Get a page by title in a specific space."""
        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/pages/search"
            params = {'q': title, 'space': space_key, 'limit': 1}
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            pages = data.get('pages', data.get('data', data.get('results', [])))
            
            for page in pages:
                page_title = (page.get('title') or page.get('name', '')).lower()
                if page_title == title.lower():
                    return self._normalize_custom_page(page)
            return None
        else:
            url = f"{self.base_url}/rest/api/content"
            params = {
                'spaceKey': space_key,
                'title': title,
                'expand': 'body.storage,version,space'
            }
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            results = data.get('results', [])
            return self._normalize_confluence_page(results[0]) if results else None

    def search_content(self, query: str, max_results: int = None, start_at: int = 0) -> Dict[str, Any]:
        """Search for content."""
        if max_results is None:
            max_results = config.server.max_results_default

        if self.use_custom_api:
            simple_query = self._parse_cql_to_simple_query(query)
            url = f"{self.base_url}/{config.custom_api.version}/pages/search"
            params = {'q': simple_query, 'limit': max_results, 'offset': start_at}
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            pages = data.get('pages', data.get('data', data.get('results', [])))
            return {
                'results': [self._normalize_custom_page(page) for page in pages],
                'start': start_at,
                'limit': max_results,
                'size': len(pages)
            }
        else:
            url = f"{self.base_url}/rest/api/content/search"
            params = {
                'cql': query,
                'limit': max_results,
                'start': start_at,
                'expand': 'body.storage,space,version'
            }
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            return {
                'results': [self._normalize_confluence_page(page) for page in data.get('results', [])],
                'start': data.get('start', start_at),
                'limit': data.get('limit', max_results),
                'size': data.get('size', 0)
            }

    def create_page(self, space_key: str, title: str, content: str, parent_page_id: Optional[str] = None) -> ConfluencePage:
        """Create a new page."""
        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/pages"
            payload = {
                'title': title,
                'content': content,
                'space': space_key,
            }
            if parent_page_id:
                payload['parent_id'] = parent_page_id
            
            response = self.session.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_custom_page(response.json())
        else:
            url = f"{self.base_url}/rest/api/content"
            payload = {
                'type': 'page',
                'title': title,
                'space': {'key': space_key},
                'body': {
                    'storage': {
                        'value': content,
                        'representation': 'storage'
                    }
                }
            }
            if parent_page_id:
                payload['ancestors'] = [{'id': parent_page_id}]
            
            response = self.session.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_confluence_page(response.json())

    def update_page(self, page_id: str, title: str, content: str, version: int) -> ConfluencePage:
        """Update an existing page."""
        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/pages/{page_id}"
            payload = {
                'title': title,
                'content': content,
                'version': version + 1
            }
            response = self.session.put(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_custom_page(response.json())
        else:
            url = f"{self.base_url}/rest/api/content/{page_id}"
            payload = {
                'version': {
                    'number': version + 1
                },
                'title': title,
                'type': 'page',
                'body': {
                    'storage': {
                        'value': content,
                        'representation': 'storage'
                    }
                }
            }
            response = self.session.put(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_confluence_page(response.json())

    def delete_page(self, page_id: str) -> None:
        """Delete a page."""
        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/pages/{page_id}"
        else:
            url = f"{self.base_url}/rest/api/content/{page_id}"
        
        response = self.session.delete(url, timeout=self.timeout)
        response.raise_for_status()

    def get_spaces(self, max_results: int = None) -> List[ConfluenceSpace]:
        """Get all spaces."""
        if max_results is None:
            max_results = config.server.max_results_default

        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/spaces"
            params = {'limit': max_results}
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            spaces = data.get('spaces', data.get('data', []))
            return [self._normalize_custom_space(space) for space in spaces]
        else:
            url = f"{self.base_url}/rest/api/space"
            params = {'limit': max_results}
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            return [self._normalize_confluence_space(space) for space in data.get('results', [])]

    def get_space(self, space_key: str) -> ConfluenceSpace:
        """Get a specific space."""
        if self.use_custom_api:
            spaces = self.get_spaces()
            for space in spaces:
                if space.key == space_key or space.name == space_key:
                    return space
            raise ValueError(f"Space {space_key} not found")
        else:
            url = f"{self.base_url}/rest/api/space/{space_key}"
            params = {'expand': 'description,homepage'}
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_confluence_space(response.json())

    def get_page_children(self, page_id: str) -> List[ConfluencePage]:
        """Get child pages of a page."""
        if self.use_custom_api:
            try:
                url = f"{self.base_url}/{config.custom_api.version}/pages/{page_id}/children"
                response = self.session.get(url, timeout=self.timeout)
                response.raise_for_status()
                data = response.json()
                children = data.get('children', data.get('data', []))
                return [self._normalize_custom_page(child) for child in children]
            except requests.RequestException:
                return []
        else:
            url = f"{self.base_url}/rest/api/content/{page_id}/child/page"
            params = {'expand': 'body.storage,space,version'}
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            return [self._normalize_confluence_page(page) for page in data.get('results', [])]

    def add_comment(self, page_id: str, comment: str) -> ConfluenceComment:
        """Add a comment to a page."""
        if self.use_custom_api:
            url = f"{self.base_url}/{config.custom_api.version}/pages/{page_id}/comments"
            payload = {'comment': comment}
            response = self.session.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_custom_comment(response.json())
        else:
            url = f"{self.base_url}/rest/api/content"
            payload = {
                'type': 'comment',
                'container': {'id': page_id},
                'body': {
                    'storage': {
                        'value': comment,
                        'representation': 'storage'
                    }
                }
            }
            response = self.session.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            return self._normalize_confluence_comment(response.json())

    def get_comments(self, page_id: str) -> List[ConfluenceComment]:
        """Get all comments for a page."""
        if self.use_custom_api:
            try:
                url = f"{self.base_url}/{config.custom_api.version}/pages/{page_id}/comments"
                response = self.session.get(url, timeout=self.timeout)
                response.raise_for_status()
                data = response.json()
                comments = data.get('comments', data.get('data', []))
                return [self._normalize_custom_comment(comment) for comment in comments]
            except requests.RequestException:
                return []
        else:
            url = f"{self.base_url}/rest/api/content/{page_id}/child/comment"
            params = {'expand': 'body.storage,version'}
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            return [self._normalize_confluence_comment(comment) for comment in data.get('results', [])]

    def _normalize_confluence_page(self, data: Dict[str, Any]) -> ConfluencePage:
        """Normalize Confluence API page response."""
        space_data = data.get('space', {})
        version_data = data.get('version', {})
        body_data = data.get('body', {}).get('storage', {})
        history_data = data.get('history', {})
        
        return ConfluencePage(
            id=data.get('id', ''),
            title=data.get('title', ''),
            content=body_data.get('value', ''),
            space_key=space_data.get('key'),
            space_name=space_data.get('name'),
            status=data.get('status'),
            version=version_data.get('number'),
            created=history_data.get('createdDate'),
            updated=version_data.get('when'),
            created_by=history_data.get('createdBy', {}).get('displayName'),
            updated_by=version_data.get('by', {}).get('displayName'),
            url=data.get('_links', {}).get('webui')
        )

    def _normalize_custom_page(self, data: Dict[str, Any]) -> ConfluencePage:
        """Normalize custom API page response."""
        space = data.get('space') or data.get('space_key') or data.get('namespace')
        
        return ConfluencePage(
            id=data.get('id') or data.get('page_id') or '',
            title=data.get('title') or data.get('name') or '',
            content=data.get('content') or data.get('body') or data.get('text') or '',
            space_key=space if isinstance(space, str) else space.get('key') if space else None,
            space_name=space if isinstance(space, str) else space.get('name') if space else None,
            status=data.get('status', 'current'),
            version=data.get('version') or data.get('revision'),
            created=data.get('created') or data.get('created_at'),
            updated=data.get('updated') or data.get('updated_at'),
            created_by=data.get('created_by') or data.get('author'),
            updated_by=data.get('updated_by') or data.get('author'),
            url=data.get('url') or data.get('link')
        )

    def _normalize_confluence_space(self, data: Dict[str, Any]) -> ConfluenceSpace:
        """Normalize Confluence API space response."""
        description_data = data.get('description', {}).get('plain', {})
        
        return ConfluenceSpace(
            key=data.get('key', ''),
            name=data.get('name', ''),
            description=description_data.get('value') if description_data else None,
            type=data.get('type'),
            url=data.get('_links', {}).get('webui')
        )

    def _normalize_custom_space(self, data: Dict[str, Any]) -> ConfluenceSpace:
        """Normalize custom API space response."""
        return ConfluenceSpace(
            key=data.get('key') or data.get('id') or data.get('code') or '',
            name=data.get('name') or data.get('title') or '',
            description=data.get('description'),
            type=data.get('type', 'global'),
            url=data.get('url') or data.get('link')
        )

    def _normalize_confluence_comment(self, data: Dict[str, Any]) -> ConfluenceComment:
        """Normalize Confluence API comment response."""
        body_data = data.get('body', {}).get('storage', {})
        version_data = data.get('version', {})
        
        return ConfluenceComment(
            id=data.get('id', ''),
            content=body_data.get('value', ''),
            author=version_data.get('by', {}).get('displayName', 'Unknown'),
            created=version_data.get('when', ''),
            updated=version_data.get('when')
        )

    def _normalize_custom_comment(self, data: Dict[str, Any]) -> ConfluenceComment:
        """Normalize custom API comment response."""
        return ConfluenceComment(
            id=data.get('id') or data.get('comment_id') or '',
            content=data.get('comment') or data.get('body') or data.get('content') or '',
            author=data.get('author') or data.get('user') or data.get('created_by') or 'Unknown',
            created=data.get('created') or data.get('created_at') or '',
            updated=data.get('updated') or data.get('updated_at')
        )

    def _parse_cql_to_simple_query(self, cql: str) -> str:
        """Convert simple CQL queries to basic search terms."""
        # Remove CQL operators and extract search terms
        query = re.sub(r'\b(and|or|not)\b', ' ', cql, flags=re.IGNORECASE)
        query = re.sub(r'(space|type|title|text)\s*=\s*["\']?([^"\']+)["\']?', r'\2', query, flags=re.IGNORECASE)
        
        # Clean up and return
        terms = [term for term in query.split() if len(term) > 2]
        return ' '.join(terms)