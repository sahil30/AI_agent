import { AIAgent } from './agent/aiAgent.js';
import { validateConfig } from './config/index.js';
import logger from './utils/logger.js';
import readline from 'readline';

async function main() {
  try {
    validateConfig();
    logger.info('Configuration validated successfully');
    
    const agent = new AIAgent();
    logger.info('AI Agent initialized successfully');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'AI Agent> '
    });

    console.log('\n🤖 AI Integration Agent');
    console.log('Capabilities: Jira, Confluence, Java Code Processing');
    console.log('Type "help" for available commands or "exit" to quit\n');

    rl.prompt();

    rl.on('line', async (input) => {
      const command = input.trim();
      
      if (command === 'exit') {
        console.log('Goodbye! 👋');
        rl.close();
        return;
      }
      
      if (command === 'help') {
        showHelp();
        rl.prompt();
        return;
      }
      
      if (command === '') {
        rl.prompt();
        return;
      }

      try {
        console.log('🔄 Processing...');
        const result = await agent.processCommand(command);
        
        console.log('\n📋 Result:');
        console.log(JSON.stringify(result, null, 2));
        
      } catch (error) {
        console.error('❌ Error:', error.message);
        logger.error('Command processing error', { command, error: error.message });
      }
      
      console.log();
      rl.prompt();
    });

    rl.on('close', () => {
      console.log('\nExiting AI Agent...');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start AI Agent', { error: error.message });
    console.error('❌ Failed to start AI Agent:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
📖 Available Commands:

JIRA Commands:
  - "Get issue PROJ-123" - Get a specific Jira issue
  - "Search issues in project PROJ" - Search issues using JQL
  - "Create issue in PROJ: Fix login bug" - Create a new issue
  - "Add comment to PROJ-123: Working on this" - Add comment

Confluence Commands:
  - "Get page 12345" - Get a Confluence page
  - "Search pages about authentication" - Search content
  - "Create page in SPACE: API Documentation" - Create new page

Java Code Commands:
  - "Analyze Java code: [paste code]" - Analyze code structure
  - "Generate class UserService" - Generate Java class
  - "Create documentation for issue PROJ-123 in SPACE" - Auto-generate docs

General Commands:
  - "help" - Show this help
  - "exit" - Exit the application

💡 Examples:
  - "Get issue ABC-123"
  - "Search issues: project = MYPROJ AND status = Open"
  - "Analyze Java project /path/to/project"
  - "Create documentation for ABC-123 in DEV"
  `);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}