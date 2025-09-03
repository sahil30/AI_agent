import { Parser } from 'node-java-parser';
import fs from 'fs/promises';
import path from 'path';

export class JavaProcessor {
  constructor() {
    this.parser = new Parser();
  }

  async analyzeJavaFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return this.analyzeJavaCode(content, filePath);
    } catch (error) {
      throw new Error(`Failed to analyze Java file ${filePath}: ${error.message}`);
    }
  }

  analyzeJavaCode(code, fileName = 'unknown') {
    try {
      const ast = this.parser.parse(code);
      
      return {
        fileName,
        packageName: this.extractPackageName(ast),
        imports: this.extractImports(ast),
        classes: this.extractClasses(ast),
        interfaces: this.extractInterfaces(ast),
        methods: this.extractMethods(ast),
        fields: this.extractFields(ast),
        annotations: this.extractAnnotations(ast),
        complexity: this.calculateComplexity(ast),
        linesOfCode: code.split('\n').length,
        ast
      };
    } catch (error) {
      throw new Error(`Failed to parse Java code: ${error.message}`);
    }
  }

  extractPackageName(ast) {
    return ast.packageDeclaration?.name?.value || null;
  }

  extractImports(ast) {
    return ast.imports?.map(imp => ({
      name: imp.name.value,
      static: imp.static || false,
      onDemand: imp.onDemand || false
    })) || [];
  }

  extractClasses(ast) {
    const classes = [];
    
    const visitClass = (node) => {
      if (node.node === 'ClassDeclaration') {
        classes.push({
          name: node.name.value,
          modifiers: node.modifiers || [],
          superClass: node.superClass?.name?.value || null,
          interfaces: node.superInterfaces?.map(i => i.name.value) || [],
          methods: this.extractMethodsFromClass(node),
          fields: this.extractFieldsFromClass(node),
          annotations: node.annotations || [],
          isAbstract: node.modifiers?.some(m => m.keyword === 'abstract') || false,
          isFinal: node.modifiers?.some(m => m.keyword === 'final') || false,
          visibility: this.getVisibility(node.modifiers)
        });
      }
      
      if (node.bodyDeclarations) {
        node.bodyDeclarations.forEach(visitClass);
      }
    };

    if (ast.types) {
      ast.types.forEach(visitClass);
    }
    
    return classes;
  }

  extractInterfaces(ast) {
    const interfaces = [];
    
    const visitInterface = (node) => {
      if (node.node === 'InterfaceDeclaration') {
        interfaces.push({
          name: node.name.value,
          modifiers: node.modifiers || [],
          extends: node.superInterfaces?.map(i => i.name.value) || [],
          methods: this.extractMethodsFromInterface(node),
          constants: this.extractFieldsFromClass(node),
          annotations: node.annotations || [],
          visibility: this.getVisibility(node.modifiers)
        });
      }
      
      if (node.bodyDeclarations) {
        node.bodyDeclarations.forEach(visitInterface);
      }
    };

    if (ast.types) {
      ast.types.forEach(visitInterface);
    }
    
    return interfaces;
  }

  extractMethods(ast) {
    const methods = [];
    
    const visitMethod = (node) => {
      if (node.node === 'MethodDeclaration') {
        methods.push(this.parseMethod(node));
      }
      
      if (node.bodyDeclarations) {
        node.bodyDeclarations.forEach(visitMethod);
      }
    };

    if (ast.types) {
      ast.types.forEach(visitMethod);
    }
    
    return methods;
  }

  extractMethodsFromClass(classNode) {
    return classNode.bodyDeclarations
      ?.filter(decl => decl.node === 'MethodDeclaration')
      ?.map(method => this.parseMethod(method)) || [];
  }

  extractMethodsFromInterface(interfaceNode) {
    return interfaceNode.bodyDeclarations
      ?.filter(decl => decl.node === 'MethodDeclaration')
      ?.map(method => this.parseMethod(method)) || [];
  }

  parseMethod(methodNode) {
    return {
      name: methodNode.name.value,
      returnType: methodNode.returnType?.name?.value || 'void',
      parameters: methodNode.parameters?.map(param => ({
        name: param.name.value,
        type: param.type.name?.value || param.type.toString()
      })) || [],
      modifiers: methodNode.modifiers || [],
      annotations: methodNode.annotations || [],
      isConstructor: methodNode.constructor || false,
      isAbstract: methodNode.modifiers?.some(m => m.keyword === 'abstract') || false,
      isStatic: methodNode.modifiers?.some(m => m.keyword === 'static') || false,
      isFinal: methodNode.modifiers?.some(m => m.keyword === 'final') || false,
      visibility: this.getVisibility(methodNode.modifiers),
      complexity: this.calculateMethodComplexity(methodNode)
    };
  }

  extractFields(ast) {
    const fields = [];
    
    const visitField = (node) => {
      if (node.node === 'FieldDeclaration') {
        fields.push(...this.parseField(node));
      }
      
      if (node.bodyDeclarations) {
        node.bodyDeclarations.forEach(visitField);
      }
    };

    if (ast.types) {
      ast.types.forEach(visitField);
    }
    
    return fields;
  }

  extractFieldsFromClass(classNode) {
    const fields = [];
    classNode.bodyDeclarations
      ?.filter(decl => decl.node === 'FieldDeclaration')
      ?.forEach(field => fields.push(...this.parseField(field)));
    return fields;
  }

  parseField(fieldNode) {
    return fieldNode.fragments?.map(fragment => ({
      name: fragment.name.value,
      type: fieldNode.type.name?.value || fieldNode.type.toString(),
      modifiers: fieldNode.modifiers || [],
      annotations: fieldNode.annotations || [],
      isStatic: fieldNode.modifiers?.some(m => m.keyword === 'static') || false,
      isFinal: fieldNode.modifiers?.some(m => m.keyword === 'final') || false,
      visibility: this.getVisibility(fieldNode.modifiers),
      initializer: fragment.initializer ? 'present' : null
    })) || [];
  }

  extractAnnotations(ast) {
    const annotations = [];
    
    const visitAnnotation = (node) => {
      if (node.annotations) {
        annotations.push(...node.annotations.map(ann => ({
          name: ann.typeName?.value || ann.name?.value,
          values: ann.values || []
        })));
      }
      
      if (node.bodyDeclarations) {
        node.bodyDeclarations.forEach(visitAnnotation);
      }
    };

    if (ast.types) {
      ast.types.forEach(visitAnnotation);
    }
    
    return annotations;
  }

  getVisibility(modifiers) {
    if (modifiers?.some(m => m.keyword === 'public')) return 'public';
    if (modifiers?.some(m => m.keyword === 'protected')) return 'protected';
    if (modifiers?.some(m => m.keyword === 'private')) return 'private';
    return 'package-private';
  }

  calculateComplexity(ast) {
    let complexity = 1;
    
    const countComplexity = (node) => {
      if (!node) return;
      
      switch (node.node) {
        case 'IfStatement':
        case 'WhileStatement':
        case 'ForStatement':
        case 'DoStatement':
        case 'SwitchStatement':
        case 'ConditionalExpression':
          complexity++;
          break;
        case 'CatchClause':
          complexity++;
          break;
      }
      
      Object.values(node).forEach(child => {
        if (Array.isArray(child)) {
          child.forEach(countComplexity);
        } else if (child && typeof child === 'object') {
          countComplexity(child);
        }
      });
    };
    
    countComplexity(ast);
    return complexity;
  }

  calculateMethodComplexity(methodNode) {
    let complexity = 1;
    
    const countComplexity = (node) => {
      if (!node) return;
      
      switch (node.node) {
        case 'IfStatement':
        case 'WhileStatement':
        case 'ForStatement':
        case 'DoStatement':
        case 'SwitchStatement':
        case 'ConditionalExpression':
          complexity++;
          break;
        case 'CatchClause':
          complexity++;
          break;
      }
      
      Object.values(node).forEach(child => {
        if (Array.isArray(child)) {
          child.forEach(countComplexity);
        } else if (child && typeof child === 'object') {
          countComplexity(child);
        }
      });
    };
    
    countComplexity(methodNode);
    return complexity;
  }

  generateJavaClass(className, options = {}) {
    const {
      packageName,
      imports = [],
      superClass,
      interfaces = [],
      fields = [],
      methods = [],
      annotations = [],
      modifiers = ['public']
    } = options;

    let code = '';
    
    if (packageName) {
      code += `package ${packageName};\n\n`;
    }
    
    if (imports.length > 0) {
      imports.forEach(imp => {
        code += `import ${imp};\n`;
      });
      code += '\n';
    }
    
    if (annotations.length > 0) {
      annotations.forEach(ann => {
        code += `@${ann}\n`;
      });
    }
    
    code += `${modifiers.join(' ')} class ${className}`;
    
    if (superClass) {
      code += ` extends ${superClass}`;
    }
    
    if (interfaces.length > 0) {
      code += ` implements ${interfaces.join(', ')}`;
    }
    
    code += ' {\n';
    
    if (fields.length > 0) {
      fields.forEach(field => {
        code += `    ${field.modifiers?.join(' ') || 'private'} ${field.type} ${field.name}`;
        if (field.initializer) {
          code += ` = ${field.initializer}`;
        }
        code += ';\n';
      });
      code += '\n';
    }
    
    if (methods.length > 0) {
      methods.forEach(method => {
        if (method.annotations) {
          method.annotations.forEach(ann => {
            code += `    @${ann}\n`;
          });
        }
        
        code += `    ${method.modifiers?.join(' ') || 'public'} ${method.returnType || 'void'} ${method.name}(`;
        
        if (method.parameters) {
          code += method.parameters.map(p => `${p.type} ${p.name}`).join(', ');
        }
        
        code += ') {\n';
        code += method.body || '        // TODO: Implement method\n';
        code += '    }\n\n';
      });
    }
    
    code += '}\n';
    
    return code;
  }

  async writeJavaFile(filePath, content) {
    try {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf8');
      return true;
    } catch (error) {
      throw new Error(`Failed to write Java file ${filePath}: ${error.message}`);
    }
  }

  async findJavaFiles(directory) {
    try {
      const files = [];
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.findJavaFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.java')) {
          files.push(fullPath);
        }
      }
      
      return files;
    } catch (error) {
      throw new Error(`Failed to find Java files in ${directory}: ${error.message}`);
    }
  }
}