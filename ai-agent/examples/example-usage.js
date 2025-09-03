import { AIAgent } from '../src/agent/aiAgent.js';
import { validateConfig } from '../src/config/index.js';

async function examples() {
  try {
    validateConfig();
    const agent = new AIAgent();
    
    console.log('🤖 AI Agent Examples\n');

    // Example 1: Get a Jira issue
    console.log('📋 Example 1: Getting Jira Issue');
    try {
      const result1 = await agent.processCommand('Get issue DEMO-1');
      console.log('Result:', JSON.stringify(result1, null, 2));
    } catch (error) {
      console.log('Note: Replace DEMO-1 with a real issue key from your Jira instance');
    }
    console.log('\n---\n');

    // Example 2: Search Jira issues
    console.log('📋 Example 2: Searching Jira Issues');
    try {
      const result2 = await agent.processCommand('Search issues: project = DEMO AND status = "To Do"');
      console.log('Result:', JSON.stringify(result2, null, 2));
    } catch (error) {
      console.log('Note: Adjust the JQL query for your project');
    }
    console.log('\n---\n');

    // Example 3: Analyze Java code
    console.log('☕ Example 3: Analyzing Java Code');
    const javaCode = `
package com.example.service;

import java.util.List;
import java.util.Optional;

/**
 * User service for managing user operations
 */
public class UserService {
    
    private UserRepository userRepository;
    
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    public Optional<User> findById(Long id) {
        if (id == null || id <= 0) {
            return Optional.empty();
        }
        return userRepository.findById(id);
    }
    
    public List<User> findAll() {
        return userRepository.findAll();
    }
    
    public User save(User user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null");
        }
        return userRepository.save(user);
    }
}`;

    const result3 = await agent.processCommand(`Analyze this Java code: ${javaCode}`);
    console.log('Java Analysis Result:', JSON.stringify(result3, null, 2));
    console.log('\n---\n');

    // Example 4: Generate Java class
    console.log('☕ Example 4: Generating Java Class');
    const result4 = await agent.processCommand('Generate a ProductService class with CRUD operations');
    console.log('Generated Class Result:', JSON.stringify(result4, null, 2));
    console.log('\n---\n');

    // Example 5: Search Confluence content
    console.log('📖 Example 5: Searching Confluence Content');
    try {
      const result5 = await agent.processCommand('Search Confluence for "API documentation"');
      console.log('Confluence Search Result:', JSON.stringify(result5, null, 2));
    } catch (error) {
      console.log('Note: Adjust the search query for your Confluence instance');
    }

  } catch (error) {
    console.error('Example execution error:', error.message);
    console.log('\n💡 Make sure to:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Fill in your Jira, Confluence, and OpenAI credentials');
    console.log('3. Ensure your Jira/Confluence instances are accessible');
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  examples().catch(console.error);
}