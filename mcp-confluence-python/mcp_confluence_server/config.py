"""Configuration management for the MCP Confluence server."""

import os
from typing import Optional
from dotenv import load_dotenv
from pydantic import BaseSettings, validator

load_dotenv()


class ConfluenceConfig(BaseSettings):
    """Confluence API configuration."""
    base_url: str
    access_token: Optional[str] = None
    username: Optional[str] = None
    api_token: Optional[str] = None

    class Config:
        env_prefix = "CONFLUENCE_"


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
    max_results_default: int = 25
    use_custom_api: bool = False
    use_bearer_token: bool = True

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
            # Create a fake Confluence config for compatibility
            self.confluence = ConfluenceConfig(
                base_url=self.custom_api.base_url,
                access_token=self.custom_api.api_key,
                username="custom-api-user",
                api_token=self.custom_api.api_key
            )
        else:
            self.confluence = ConfluenceConfig()

    def validate(self) -> None:
        """Validate the configuration."""
        if self.server.use_custom_api:
            required_vars = ['CUSTOM_API_BASE_URL', 'CUSTOM_API_KEY']
        else:
            required_vars = ['CONFLUENCE_BASE_URL']
            
            # Check authentication method
            if self.server.use_bearer_token:
                if not os.getenv('CONFLUENCE_ACCESS_TOKEN'):
                    required_vars.append('CONFLUENCE_ACCESS_TOKEN')
            else:
                # Legacy username/token auth
                if not (os.getenv('CONFLUENCE_USERNAME') and os.getenv('CONFLUENCE_API_TOKEN')):
                    required_vars.extend(['CONFLUENCE_USERNAME', 'CONFLUENCE_API_TOKEN'])
        
        missing = [var for var in required_vars if not os.getenv(var)]
        
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")


# Global configuration instance
config = Config()