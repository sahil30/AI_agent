# Requirements Guide for All Projects

This guide covers the Python package requirements for all the AI integration projects.

## 📦 **Project Overview**

### 1. **AI Integration Agent** (`ai-agent-python/`)
Full-featured AI agent with Jira, Confluence, and Java code processing

### 2. **MCP Jira Server** (`mcp-jira-python/`)  
Model Context Protocol server for Jira integration with Claude Desktop

### 3. **MCP Confluence Server** (`mcp-confluence-python/`)
Model Context Protocol server for Confluence integration with Claude Desktop

## 🔧 **Installation Options**

For each project, you have two installation methods:

### Option 1: Install from requirements.txt (Recommended)
```bash
cd project-directory
pip install -r requirements.txt
```

### Option 2: Install as package (includes dependencies)
```bash
cd project-directory
pip install -e .
```

## 📋 **Detailed Requirements**

### Core Dependencies (All Projects)

| Package | Version | Purpose |
|---------|---------|---------|
| `requests` | `>=2.31.0` | HTTP client for API requests |
| `python-dotenv` | `>=1.0.0` | Environment variable management |
| `pydantic` | `>=2.5.0` | Data validation and settings |
| `typing-extensions` | `>=4.8.0` | Enhanced type hints for Python 3.12 |

### AI Integration Agent Specific

| Package | Version | Purpose |
|---------|---------|---------|
| `openai` | `>=1.3.0` | OpenAI API integration |
| `javalang` | `>=0.13.0` | Java code parsing and analysis |
| `atlassian-python-api` | `>=3.41.0` | Alternative Atlassian API client |
| `pyyaml` | `>=6.0.1` | YAML configuration support |
| `click` | `>=8.1.7` | Command-line interface framework |

### MCP Servers Specific

| Package | Version | Purpose |
|---------|---------|---------|
| `mcp` | `>=1.0.0` | Model Context Protocol framework |

### Development Dependencies (Optional)

| Package | Version | Purpose |
|---------|---------|---------|
| `pytest` | `>=7.0` | Testing framework |
| `black` | `>=23.0` | Code formatting |
| `flake8` | `>=6.0` | Code linting |
| `mypy` | `>=1.0` | Static type checking |

## 🚀 **Quick Setup for All Projects**

### Install Everything
```bash
# AI Integration Agent
cd ai-agent-python
pip install -r requirements.txt

# MCP Jira Server
cd ../mcp-jira-python  
pip install -r requirements.txt

# MCP Confluence Server
cd ../mcp-confluence-python
pip install -r requirements.txt
```

### Virtual Environment (Recommended)
```bash
# Create virtual environment
python3.12 -m venv ai-integration-env
source ai-integration-env/bin/activate  # On Windows: ai-integration-env\Scripts\activate

# Install all projects
cd ai-agent-python && pip install -r requirements.txt && cd ..
cd mcp-jira-python && pip install -r requirements.txt && cd ..
cd mcp-confluence-python && pip install -r requirements.txt && cd ..
```

## 🔍 **Dependency Explanations**

### Why These Versions?

**Python 3.12+**: 
- Latest stable Python with improved performance
- Enhanced type hints and error messages
- Better async/await support

**requests >= 2.31.0**:
- HTTP/2 support
- Security improvements
- Better SSL handling

**pydantic >= 2.5.0**:
- Faster validation (Rust-based)
- Better type hints integration  
- Improved error messages

**openai >= 1.3.0**:
- Latest OpenAI API features
- Async support
- Function calling improvements

**mcp >= 1.0.0**:
- Stable MCP protocol implementation
- Claude Desktop compatibility
- Tool and resource support

## 🛠 **Development Setup**

### Enable Development Dependencies
```bash
# In any project's requirements.txt, uncomment:
pytest>=7.0
black>=23.0  
flake8>=6.0
mypy>=1.0
```

### Development Commands
```bash
# Format code
black project_directory/

# Lint code
flake8 project_directory/

# Type check
mypy project_directory/

# Run tests
pytest
```

## 🔒 **Security Dependencies**

All projects use secure, up-to-date packages:

- **No known vulnerabilities** in required versions
- **Regular security updates** for HTTP libraries
- **Secure authentication** methods supported
- **Environment variable** protection for secrets

## 🐛 **Troubleshooting**

### Common Issues

**Import errors**:
```bash
# Ensure all requirements installed
pip install -r requirements.txt

# Check Python version
python --version  # Should be 3.12+
```

**Version conflicts**:
```bash
# Create fresh virtual environment
python3.12 -m venv fresh-env
source fresh-env/bin/activate
pip install -r requirements.txt
```

**Missing MCP package**:
```bash
# Install MCP framework
pip install mcp>=1.0.0
```

### Platform-Specific Notes

**macOS**:
```bash
# May need to install certificates
/Applications/Python\ 3.12/Install\ Certificates.command
```

**Windows**:
```bash
# Use Windows-style paths in scripts
# Ensure Python is added to PATH
```

**Linux**:
```bash
# May need development headers
sudo apt-get install python3.12-dev  # Ubuntu/Debian
sudo yum install python312-devel     # RHEL/CentOS
```

## 📊 **Requirements Summary by Project**

### AI Integration Agent
- **Total Dependencies**: 8 core + 4 optional
- **Installation Size**: ~50MB
- **Python Version**: 3.12+
- **Key Features**: Full AI integration with OpenAI

### MCP Jira Server  
- **Total Dependencies**: 5 core + 4 optional
- **Installation Size**: ~20MB
- **Python Version**: 3.12+
- **Key Features**: Claude Desktop integration

### MCP Confluence Server
- **Total Dependencies**: 5 core + 4 optional  
- **Installation Size**: ~20MB
- **Python Version**: 3.12+
- **Key Features**: Bearer token auth, Claude Desktop integration

## 🎯 **Production Deployment**

### Minimal Production Requirements
```bash
# Only install core dependencies
pip install --no-dev -r requirements.txt
```

### Docker Requirements
```dockerfile
FROM python:3.12-slim
COPY requirements.txt .
RUN pip install -r requirements.txt
```

### Performance Considerations
- **Fast startup**: Core dependencies load quickly
- **Memory efficient**: ~50MB total memory footprint
- **CPU optimized**: Pydantic v2 uses Rust for speed

## ✅ **Verification**

### Test All Installations
```bash
# Test AI Agent
cd ai-agent-python
python -c "from src.agent import AIAgent; print('✅ AI Agent OK')"

# Test MCP Jira
cd ../mcp-jira-python
python -c "from mcp_jira_server.client import JiraClient; print('✅ Jira MCP OK')"

# Test MCP Confluence  
cd ../mcp-confluence-python
python -c "from mcp_confluence_server.client import ConfluenceClient; print('✅ Confluence MCP OK')"
```

All projects are now equipped with comprehensive `requirements.txt` files for easy installation and dependency management! 🚀