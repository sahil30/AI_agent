"""Configuration management for the MCP Jira server."""

import os
from typing import Optional
from dotenv import load_dotenv
from pydantic import BaseSettings, validator

load_dotenv()


class JiraConfig(BaseSettings):
    """Jira API configuration."""
    base_url: str
    username: Optional[str] = None
    api_token: Optional[str] = None
    access_token: Optional[str] = None

    class Config:
        env_prefix = "JIRA_"


class CustomAPIConfig(BaseSettings):
    """Custom API configuration."""
    base_url: str
    api_key: str
    version: str = "v1"

    class Config:
        env_prefix = "CUSTOM_API_"


class ServerConfig(BaseSettings):
    """Server configuration."""
    log_level: str = "INFO"
    max_results_default: int = 50
    use_custom_api: bool = False
    use_bearer_token: bool = False

    @validator('use_custom_api', pre=True)
    def validate_use_custom_api(cls, v):
        if isinstance(v, str):
            return v.lower() == 'true'
        return v

    @validator('use_bearer_token', pre=True)
    def validate_use_bearer_token(cls, v):
        if isinstance(v, str):
            return v.lower() == 'true'
        return v

    class Config:
        env_prefix = ""


class Config:
    """Main configuration class."""
    
    def __init__(self):
        self.server = ServerConfig()
        
        if self.server.use_custom_api:
            self.custom_api = CustomAPIConfig()
            # Create a fake Jira config for compatibility
            self.jira = JiraConfig(
                base_url=self.custom_api.base_url,
                username="custom-api-user",
                api_token=self.custom_api.api_key
            )
        else:
            self.jira = JiraConfig()

    def validate(self) -> None:
        """Validate the configuration."""
        if self.server.use_custom_api:
            required_vars = ['CUSTOM_API_BASE_URL', 'CUSTOM_API_KEY']
        else:
            required_vars = ['JIRA_BASE_URL']
            if self.server.use_bearer_token:
                required_vars.append('JIRA_ACCESS_TOKEN')
            else:
                required_vars.extend(['JIRA_USERNAME', 'JIRA_API_TOKEN'])
        
        missing = [var for var in required_vars if not os.getenv(var)]
        
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        
        # Validate authentication configuration
        if not self.server.use_custom_api:
            if self.server.use_bearer_token and not self.jira.access_token:
                raise ValueError("Bearer token authentication enabled but JIRA_ACCESS_TOKEN not provided")
            if not self.server.use_bearer_token and (not self.jira.username or not self.jira.api_token):
                raise ValueError("Basic authentication enabled but JIRA_USERNAME or JIRA_API_TOKEN not provided")


# Global configuration instance
config = Config()