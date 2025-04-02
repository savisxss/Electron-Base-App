const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const escodegen = require('escodegen');
const crypto = require('crypto');

/**
 * Advanced JavaScript obfuscator with code virtualization
 * Transforms JavaScript code into custom bytecode and creates a VM to execute it
 */
class JSVirtualizer {
  constructor(options = {}) {
    this.options = {
      vmName: options.vmName || this._generateRandomName(8),
      stringEncoding: options.stringEncoding !== false,
      controlFlowFlattening: options.controlFlowFlattening !== false,
      deadCodeInjection: options.deadCodeInjection !== false,
      selfDefending: options.selfDefending !== false,
      debugProtection: options.debugProtection !== false,
      entropy: options.entropy || 0.9,
      transformObjectKeys: options.transformObjectKeys !== false,
      ...options
    };

    this.opcodes = {
      LOAD_CONST: 0x01,
      LOAD_VAR: 0x02,
      STORE_VAR: 0x03,
      BINARY_OP: 0x04,
      CALL_FUNCTION: 0x05,
      RETURN: 0x06,
      JUMP: 0x07,
      JUMP_IF_TRUE: 0x08,
      JUMP_IF_FALSE: 0x09,
      CREATE_FUNCTION: 0x0A,
      CREATE_OBJECT: 0x0B,
      LOAD_PROPERTY: 0x0C,
      STORE_PROPERTY: 0x0D,
      POP: 0x0E,
      DUPLICATE: 0x0F,
      UNARY_OP: 0x10,
      CREATE_ARRAY: 0x11,
      ARRAY_PUSH: 0x12,
      LOAD_INDEX: 0x13,
      STORE_INDEX: 0x14,
      NEW_INSTANCE: 0x15,
      LOGICAL_OP: 0x16,
      BREAK: 0x17,
      CONTINUE: 0x18,
      TRY_BEGIN: 0x19,
      TRY_END: 0x1A,
      CATCH: 0x1B,
      THROW: 0x1C,
      FINALLY: 0x1D,
      UNDEFINED: 0x1E,
      NULL: 0x1F,
      THIS: 0x20,
      NOP: 0xFF // Used for dead code
    };

    this.reverseOpcodes = {};
    Object.entries(this.opcodes).forEach(([name, code]) => {
      this.reverseOpcodes[code] = name;
    });

    // Important native methods that we need to preserve
    this.nativeFunctions = new Set([
      'parseInt', 'parseFloat', 'setTimeout', 'setInterval',
      'clearTimeout', 'clearInterval', 'encodeURIComponent',
      'decodeURIComponent', 'encodeURI', 'decodeURI', 'isNaN',
      'isFinite', 'eval', 'Date', 'Math', 'RegExp', 'Promise',
      'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean',
      'Function', 'Symbol', 'Error', 'Map', 'Set', 'WeakMap', 'WeakSet'
    ]);

    // Key identifiers that will be used in the VM
    this.vmIdentifiers = {
      vm: this._generateRandomName(8),
      executeFunction: this._generateRandomName(10),
      stack: this._generateRandomName(7),
      scope: this._generateRandomName(7),
      bytecode: this._generateRandomName(9),
      opcodeHandler: this._generateRandomName(11),
      constantsTable: this._generateRandomName(12),
      runtimeHelpers: this._generateRandomName(10),
      nativeFunctions: this._generateRandomName(8),
      antiDebug: this._generateRandomName(9),
      stateManager: this._generateRandomName(13),
      callStack: this._generateRandomName(9),
      exceptionHandler: this._generateRandomName(14),
      controlFlow: this._generateRandomName(11),
      getProperty: this._generateRandomName(11),
      setProperty: this._generateRandomName(11),
      createFunction: this._generateRandomName(14),
      selfCheck: this._generateRandomName(9),
      decoder: this._generateRandomName(7)
    };

    this._initializeSymbolTable();
  }

  /**
   * Process JavaScript files and obfuscate them
   * @param {string|Array<string>} inputFiles - File or files to obfuscate
   * @param {string} outputDir - Output directory
   */
  async processFiles(inputFiles, outputDir) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const files = Array.isArray(inputFiles) ? inputFiles : [inputFiles];

    for (const file of files) {
      const sourceCode = fs.readFileSync(file, 'utf-8');
      const obfuscatedCode = await this.obfuscate(sourceCode);
      
      const outputPath = path.join(outputDir, path.basename(file));
      fs.writeFileSync(outputPath, obfuscatedCode);
      console.log(`Processed: ${file} -> ${outputPath}`);
    }
  }

  /**
   * Main method for obfuscating JS code with virtualization
   * @param {string} sourceCode - JavaScript source code
   * @returns {string} - Obfuscated code with VM
   */
  async obfuscate(sourceCode) {
    try {
      // 1. Parse code to AST
      const ast = acorn.parse(sourceCode, {
        ecmaVersion: 2022,
        sourceType: 'module',
        locations: true
      });

      // 2. Analyze AST and collect all identifiers
      this._collectIdentifiers(ast);

      // 3. Transform AST to bytecode
      const { bytecode, constantsTable } = this._transformToBytecode(ast);
      
      // 4. Obfuscate bytecode
      const obfuscatedBytecode = this._obfuscateBytecode(bytecode);
      
      // 5. Obfuscate constants table
      const obfuscatedConstants = this._obfuscateConstants(constantsTable);
      
      // 6. Generate VM code
      const vmCode = this._generateVM(obfuscatedBytecode, obfuscatedConstants);
      
      // 7. Additional protections
      return this._addExtraProtections(vmCode);
    } catch (error) {
      console.error('Error during obfuscation:', error);
      throw error;
    }
  }

  /**
   * Initialize symbol table for variables and functions
   */
  _initializeSymbolTable() {
    this.symbolTable = {
      variables: new Map(),
      functions: new Map(),
      scopes: [],
      currentScope: null
    };
  }

  /**
   * Collect all identifiers from AST
   * @param {Object} ast - Abstract Syntax Tree of the code
   */
  _collectIdentifiers(ast) {
    const identifiers = new Set();
    
    const traverse = (node) => {
      if (!node || typeof node !== 'object') return;
      
      if (node.type === 'Identifier') {
        identifiers.add(node.name);
      }
      
      for (const key in node) {
        if (Array.isArray(node[key])) {
          node[key].forEach(traverse);
        } else if (typeof node[key] === 'object' && node[key] !== null) {
          traverse(node[key]);
        }
      }
    };
    
    traverse(ast);
    this.allIdentifiers = [...identifiers];
  }

  /**
   * Transform AST to bytecode
   * @param {Object} ast - Abstract Syntax Tree of the code
   * @returns {Object} - Bytecode and constants table
   */
  _transformToBytecode(ast) {
    const bytecode = [];
    const constantsTable = [];
    
    // Map for indexing constants to avoid duplicates
    const constantsMap = new Map();
    
    // Function to add a constant to the table and return its index
    const addConstant = (value) => {
      // Special processing for objects and functions
      const key = typeof value === 'object' || typeof value === 'function' 
        ? JSON.stringify(value)
        : value;
        
      if (constantsMap.has(key)) {
        return constantsMap.get(key);
      }
      
      const index = constantsTable.length;
      constantsTable.push(value);
      constantsMap.set(key, index);
      return index;
    };
    
    // Function to emit bytecode instruction
    const emit = (opcode, ...args) => {
      bytecode.push(opcode, ...args);
    };
    
    // Function to transform an expression to bytecode
    const transformExpression = (node) => {
      if (!node) return;
      
      switch (node.type) {
        case 'Literal':
          const constIndex = addConstant(node.value);
          emit(this.opcodes.LOAD_CONST, constIndex);
          break;
          
        case 'Identifier':
          const varIndex = addConstant(node.name);
          emit(this.opcodes.LOAD_VAR, varIndex);
          break;
          
        case 'BinaryExpression':
          transformExpression(node.left);
          transformExpression(node.right);
          const opIndex = addConstant(node.operator);
          emit(this.opcodes.BINARY_OP, opIndex);
          break;
          
        case 'UnaryExpression':
          transformExpression(node.argument);
          const unaryOpIndex = addConstant(node.operator);
          emit(this.opcodes.UNARY_OP, unaryOpIndex);
          break;
          
        case 'LogicalExpression':
          transformExpression(node.left);
          transformExpression(node.right);
          const logicOpIndex = addConstant(node.operator);
          emit(this.opcodes.LOGICAL_OP, logicOpIndex);
          break;
          
        case 'CallExpression':
          // Load the function
          transformExpression(node.callee);
          
          // Load arguments
          node.arguments.forEach(arg => transformExpression(arg));
          
          // Call with number of arguments
          emit(this.opcodes.CALL_FUNCTION, node.arguments.length);
          break;
          
        case 'MemberExpression':
          // Load the object
          transformExpression(node.object);
          
          // Load the property name or expression
          if (node.computed) {
            transformExpression(node.property);
            emit(this.opcodes.LOAD_INDEX);
          } else {
            const propIndex = addConstant(node.property.name);
            emit(this.opcodes.LOAD_PROPERTY, propIndex);
          }
          break;
          
        case 'ObjectExpression':
          // Create a new object
          emit(this.opcodes.CREATE_OBJECT);
          
          // Add each property
          for (const prop of node.properties) {
            // Duplicate the object ref for each property
            emit(this.opcodes.DUPLICATE);
            
            // Get the key
            let keyIndex;
            if (prop.key.type === 'Identifier') {
              keyIndex = addConstant(prop.key.name);
            } else if (prop.key.type === 'Literal') {
              keyIndex = addConstant(prop.key.value);
            }
            
            // Get the value
            transformExpression(prop.value);
            
            // Store the property
            emit(this.opcodes.STORE_PROPERTY, keyIndex);
            
            // Pop the result of STORE_PROPERTY
            emit(this.opcodes.POP);
          }
          break;
          
        case 'ArrayExpression':
          // Create a new array
          emit(this.opcodes.CREATE_ARRAY);
          
          // Add each element
          for (const element of node.elements) {
            if (element !== null) {
              // Duplicate the array ref for each element
              emit(this.opcodes.DUPLICATE);
              
              // Get the element value
              transformExpression(element);
              
              // Push to array
              emit(this.opcodes.ARRAY_PUSH);
              
              // Pop the result of ARRAY_PUSH
              emit(this.opcodes.POP);
            }
          }
          break;
          
        case 'AssignmentExpression':
          // Handle different types of assignments
          if (node.left.type === 'Identifier') {
            // Simple variable assignment
            transformExpression(node.right);
            const varNameIndex = addConstant(node.left.name);
            emit(this.opcodes.STORE_VAR, varNameIndex);
            // Leave value on stack for chained assignments
            emit(this.opcodes.DUPLICATE);
          } else if (node.left.type === 'MemberExpression') {
            // Object property assignment
            transformExpression(node.left.object);
            
            // Property can be computed or direct
            if (node.left.computed) {
              transformExpression(node.left.property);
            } else {
              const propIndex = addConstant(node.left.property.name);
              emit(this.opcodes.LOAD_CONST, propIndex);
            }
            
            // Load the value to assign
            transformExpression(node.right);
            
            // Store as property (if computed) or named property
            if (node.left.computed) {
              emit(this.opcodes.STORE_INDEX);
            } else {
              emit(this.opcodes.STORE_PROPERTY);
            }
            
            // Leave value on stack for chained assignments
            emit(this.opcodes.DUPLICATE);
          }
          break;
          
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
          const funcNameIndex = addConstant(node.id ? node.id.name : '');
          const paramsIndex = addConstant(node.params.map(p => p.name));
          const bodyIndex = addConstant(escodegen.generate(node.body));
          emit(this.opcodes.CREATE_FUNCTION, funcNameIndex, paramsIndex, bodyIndex);
          break;
          
        case 'NewExpression':
          // Load the constructor
          transformExpression(node.callee);
          
          // Load arguments
          node.arguments.forEach(arg => transformExpression(arg));
          
          // Create new instance with number of arguments
          emit(this.opcodes.NEW_INSTANCE, node.arguments.length);
          break;
          
        case 'ThisExpression':
          emit(this.opcodes.THIS);
          break;
          
        case 'ConditionalExpression': // Ternary operator
          transformExpression(node.test);
          
          // Jump if false to else branch
          const elseJumpIndex = bytecode.length;
          emit(this.opcodes.JUMP_IF_FALSE, 0); // Placeholder
          
          // Consequent branch
          transformExpression(node.consequent);
          
          // Jump past alternate branch
          const endJumpIndex = bytecode.length;
          emit(this.opcodes.JUMP, 0); // Placeholder
          
          // Update else jump target
          bytecode[elseJumpIndex + 1] = bytecode.length - elseJumpIndex;
          
          // Alternate branch
          transformExpression(node.alternate);
          
          // Update end jump target
          bytecode[endJumpIndex + 1] = bytecode.length - endJumpIndex;
          break;
          
        default:
          // For any unhandled node types, we add a placeholder
          console.warn(`Unhandled node type: ${node.type}`);
          emit(this.opcodes.UNDEFINED);
      }
    };
    
    // Process main body of the AST
    if (ast.type === 'Program') {
      ast.body.forEach(node => {
        switch (node.type) {
          case 'ExpressionStatement':
            transformExpression(node.expression);
            // After an expression statement, we pop the result off the stack
            emit(this.opcodes.POP);
            break;
            
          case 'VariableDeclaration':
            node.declarations.forEach(decl => {
              if (decl.init) {
                transformExpression(decl.init);
              } else {
                emit(this.opcodes.UNDEFINED);
              }
              
              const varNameIndex = addConstant(decl.id.name);
              emit(this.opcodes.STORE_VAR, varNameIndex);
              
              // Pop the result of STORE_VAR since we don't need it
              emit(this.opcodes.POP);
            });
            break;
            
          case 'FunctionDeclaration':
            const funcNameIndex = addConstant(node.id.name);
            const paramsIndex = addConstant(node.params.map(p => p.name));
            const bodyIndex = addConstant(escodegen.generate(node.body));
            emit(this.opcodes.CREATE_FUNCTION, funcNameIndex, paramsIndex, bodyIndex);
            emit(this.opcodes.STORE_VAR, funcNameIndex);
            emit(this.opcodes.POP);
            break;
            
          case 'ReturnStatement':
            if (node.argument) {
              transformExpression(node.argument);
            } else {
              emit(this.opcodes.UNDEFINED);
            }
            emit(this.opcodes.RETURN);
            break;
            
          case 'IfStatement':
            transformExpression(node.test);
            
            // Jump if false to else branch or end
            const elseJumpIndex = bytecode.length;
            emit(this.opcodes.JUMP_IF_FALSE, 0); // Placeholder
            
            // Consequent branch - process all statements
            this._transformStatements(node.consequent, { emit, transformExpression, addConstant });
            
            if (node.alternate) {
              // Jump past alternate branch
              const endJumpIndex = bytecode.length;
              emit(this.opcodes.JUMP, 0); // Placeholder
              
              // Update else jump target
              bytecode[elseJumpIndex + 1] = bytecode.length - elseJumpIndex;
              
              // Alternate branch
              this._transformStatements(node.alternate, { emit, transformExpression, addConstant });
              
              // Update end jump target
              bytecode[endJumpIndex + 1] = bytecode.length - endJumpIndex;
            } else {
              // Update else jump target to current position
              bytecode[elseJumpIndex + 1] = bytecode.length - elseJumpIndex;
            }
            break;
            
          // Handle other statement types as needed...
          default:
            console.warn(`Unhandled statement type: ${node.type}`);
        }
      });
    }
    
    // Add RETURN instruction at the end if not already present
    if (bytecode.length === 0 || bytecode[bytecode.length - 1] !== this.opcodes.RETURN) {
      emit(this.opcodes.UNDEFINED);
      emit(this.opcodes.RETURN);
    }
    
    return { bytecode, constantsTable };
  }
  
  /**
   * Helper method to transform block statements and other complex statements
   */
  _transformStatements(node, { emit, transformExpression, addConstant }) {
    if (node.type === 'BlockStatement') {
      node.body.forEach(stmt => {
        switch (stmt.type) {
          case 'ExpressionStatement':
            transformExpression(stmt.expression);
            emit(this.opcodes.POP);
            break;
            
          case 'ReturnStatement':
            if (stmt.argument) {
              transformExpression(stmt.argument);
            } else {
              emit(this.opcodes.UNDEFINED);
            }
            emit(this.opcodes.RETURN);
            break;
            
          // Handle other statement types recursively
          case 'IfStatement':
          case 'WhileStatement':
          case 'ForStatement':
          case 'SwitchStatement':
            // These would need their own specialized handlers
            console.warn(`Nested ${stmt.type} not fully supported yet`);
            break;
            
          default:
            console.warn(`Unhandled statement type: ${stmt.type}`);
        }
      });
    } else {
      // Single statement (non-block)
      if (node.type === 'ExpressionStatement') {
        transformExpression(node.expression);
        emit(this.opcodes.POP);
      } else if (node.type === 'ReturnStatement') {
        if (node.argument) {
          transformExpression(node.argument);
        } else {
          emit(this.opcodes.UNDEFINED);
        }
        emit(this.opcodes.RETURN);
      } else {
        console.warn(`Unhandled single statement type: ${node.type}`);
      }
    }
  }

  /**
   * Obfuscate the generated bytecode
   * @param {Array} bytecode - Original bytecode
   * @returns {Array} - Obfuscated bytecode
   */
  _obfuscateBytecode(bytecode) {
    // Encrypt bytecode
    const key = crypto.randomBytes(32).toString('hex');
    const iv = crypto.randomBytes(16).toString('hex');
    
    // Convert bytecode to buffer
    const bytecodeBuffer = Buffer.from(bytecode);
    
    // Encrypt using AES
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    let encryptedBytecode = cipher.update(bytecodeBuffer);
    encryptedBytecode = Buffer.concat([encryptedBytecode, cipher.final()]);
    
    // Convert to array
    encryptedBytecode = Array.from(encryptedBytecode);
    
    // Add dead code if option is enabled
    if (this.options.deadCodeInjection) {
      const deadCodeAmount = Math.floor(bytecode.length * this.options.entropy * 0.3);
      for (let i = 0; i < deadCodeAmount; i++) {
        const insertPosition = Math.floor(Math.random() * encryptedBytecode.length);
        encryptedBytecode.splice(insertPosition, 0, this.opcodes.NOP);
      }
    }
    
    // Obfuscation metadata (will be needed for VM)
    const metadata = {
      key,
      iv,
      originalLength: bytecode.length,
      encryptionMethod: 'aes-256-cbc'
    };
    
    return { encryptedBytecode, metadata };
  }

  /**
   * Obfuscate the constants table
   * @param {Array} constantsTable - Original constants table
   * @returns {Array} - Obfuscated constants table
   */
  _obfuscateConstants(constantsTable) {
    // Generate a key for string encoding
    const stringKey = crypto.randomBytes(16).toString('hex');
    
    // Encrypt strings in the constants table
    if (this.options.stringEncoding) {
      return constantsTable.map(constant => {
        if (typeof constant === 'string') {
          // Simple XOR encryption for strings
          const encrypted = Buffer.from(constant)
            .map((byte, i) => byte ^ stringKey.charCodeAt(i % stringKey.length))
            .toString('base64');
            
          return {
            type: 'encoded',
            value: encrypted,
            method: 'xor'
          };
        }
        return constant;
      });
    }
    
    return constantsTable;
  }

  /**
   * Generate the code for the virtual machine to execute the bytecode
   * @param {Object} obfuscatedBytecode - Obfuscated bytecode with metadata
   * @param {Array} obfuscatedConstants - Obfuscated constants table
   * @returns {string} - JS code containing VM and bytecode
   */
  _generateVM(obfuscatedBytecode, obfuscatedConstants) {
    const { encryptedBytecode, metadata } = obfuscatedBytecode;
    const { vm, executeFunction, stack, scope, bytecode, opcodeHandler, 
           constantsTable, runtimeHelpers, nativeFunctions, antiDebug,
           stateManager, callStack, exceptionHandler, controlFlow,
           getProperty, setProperty, createFunction, selfCheck,
           decoder } = this.vmIdentifiers;
    
    // Generate VM code with all handlers
    const vmCode = `
    (function() {
      // Anti-debugging techniques
      const ${antiDebug} = function() {
        const startTime = new Date();
        debugger;
        const endTime = new Date();
        if (endTime - startTime > 100) {
          // Debugger detected - we can add protections here
          console.error('Debugging attempt detected!');
          // We can also stop code execution
          throw new Error('Security violation: debugger detected');
        }
        
        // Additional checks for other debugging techniques
        const devTools = /./constructor.constructor('return this')();
        if (
          devTools.console && (
            devTools.console.profiles.length > 0 ||
            devTools.console.profileEnd ||
            devTools.console.clear ||
            devTools.console.dir
          )
        ) {
          throw new Error('Security violation: console debugging detected');
        }
        
        // Check for Function.prototype.toString modification
        try {
          Function.prototype.toString.toString().indexOf('[native code]') === -1 &&
            (() => {})();
        } catch (e) {
          throw new Error('Security violation: toString override detected');
        }
        
        // Check for web driver
        if (navigator && navigator.webdriver) {
          throw new Error('Security violation: automated testing environment detected');
        }
      };
      
      // Self-check for code integrity
      const ${selfCheck} = function() {
        try {
          // Check if this function's code has been modified
          const expectedHash = '${crypto.createHash('sha256').update(antiDebug.toString()).digest('hex')}';
          const actualHash = sha256(${antiDebug}.toString());
          
          if (expectedHash !== actualHash) {
            throw new Error('Security violation: code integrity check failed');
          }
          
          // Check if VM environment is intact
          if (!${vm} || !${executeFunction} || !${bytecode} || !${constantsTable}) {
            throw new Error('Security violation: VM environment corrupted');
          }
        } catch (e) {
          // Silent fail to avoid giving clues
          setTimeout(() => { throw new Error('Security violation'); }, Math.random() * 10000);
        }
      };
      
      // Helper function for integrity verification
      function sha256(str) {
        // Simple implementation, would use a proper crypto library in production
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash |= 0;
        }
        return hash.toString(16);
      }
      
      ${this.options.debugProtection ? `
      // Set multiple debug protection traps
      setInterval(${antiDebug}, 500 + Math.random() * 1000);
      setTimeout(${antiDebug}, 1000);
      document.addEventListener('DOMContentLoaded', ${antiDebug});
      
      // Monitor for dev tools opening
      let devToolsOpen = false;
      const devToolsDetector = new Image();
      Object.defineProperty(devToolsDetector, 'id', {
        get: function() {
          devToolsOpen = true;
          throw new Error('Security violation: dev tools detected');
        }
      });
      
      console.log('%c', devToolsDetector);
      
      if (devToolsOpen) {
        throw new Error('Security violation');
      }
      ` : ''}
      
      // Constants table (obfuscated)
      const ${constantsTable} = ${JSON.stringify(obfuscatedConstants)};
      
      // Bytecode (obfuscated)
      const ${bytecode} = ${JSON.stringify(Array.from(encryptedBytecode))};
      
      // Encryption keys and metadata
      const _encryptionKey = "${metadata.key}";
      const _encryptionIv = "${metadata.iv}";
      const _encryptionMethod = "${metadata.encryptionMethod}";
      const _originalLength = ${metadata.originalLength};
      
      // Runtime helpers for decryption and execution
      const ${runtimeHelpers} = {
        // Decrypt the bytecode
        decryptBytecode: function() {
          try {
            // Convert encrypted bytecode to Buffer
            const encryptedBuffer = new Uint8Array(${bytecode});
            
            // Create the decipher
            const decipher = crypto.createDecipheriv(
              _encryptionMethod,
              Buffer.from(_encryptionKey, 'hex'),
              Buffer.from(_encryptionIv, 'hex')
            );
            
            // Decrypt
            let decrypted = decipher.update(Buffer.from(encryptedBuffer));
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            // Filter out NOPs
            return Array.from(decrypted).filter(byte => byte !== ${this.opcodes.NOP});
          } catch (e) {
            // Fallback to simple XOR decryption if crypto API is not available
            return ${bytecode}.map(byte => {
              const keyChar = _encryptionKey[byte % _encryptionKey.length].charCodeAt(0);
              return byte ^ keyChar;
            }).filter(byte => byte !== ${this.opcodes.NOP});
          }
        },
        
        // Decode strings
        ${decoder}: function(encodedObj) {
          if (encodedObj && encodedObj.type === 'encoded') {
            if (encodedObj.method === 'xor') {
              // XOR decoding
              const decoded = Buffer.from(encodedObj.value, 'base64')
                .map((byte, i) => byte ^ _encryptionKey.charCodeAt(i % _encryptionKey.length))
                .toString();
              return decoded;
            }
            return atob(encodedObj.value);
          }
          return encodedObj;
        },
        
        // Get a constant value
        getConstant: function(index) {
          const constant = ${constantsTable}[index];
          if (typeof constant === 'object' && constant !== null && constant.type === 'encoded') {
            return this.${decoder}(constant);
          }
          return constant;
        }
      };
      
      // Native functions and objects cache
      const ${nativeFunctions} = {
        Array: Array,
        Object: Object,
        Function: Function,
        eval: eval,
        parseInt: parseInt,
        encodeURI: encodeURI,
        decodeURI: decodeURI,
        Math: Math,
        Date: Date,
        RegExp: RegExp,
        JSON: JSON,
        String: String,
        Number: Number,
        Boolean: Boolean,
        Promise: Promise,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        console: console,
        crypto: typeof crypto !== 'undefined' ? crypto : null,
        Error: Error,
        TypeError: TypeError,
        ReferenceError: ReferenceError
      };
      
      // Control flow manager for jumps and branches
      const ${controlFlow} = {
        // Handle jump operations
        jump: function(pc, offset) {
          return pc + offset;
        },
        
        // Handle conditional jumps
        conditionalJump: function(pc, offset, condition) {
          return condition ? pc + offset : pc + 1;
        },
        
        // Branch table for optimized switch statements
        branchTable: function(pc, value, table) {
          const offset = table[value] || table.default;
          return pc + offset;
        }
      };
      
      // Exception handling
      const ${exceptionHandler} = {
        // Current try-catch blocks
        tryBlocks: [],
        
        // Enter a try block
        enterTry: function(catchPC, finallyPC) {
          this.tryBlocks.push({ catchPC, finallyPC });
        },
        
        // Exit a try block
        exitTry: function() {
          this.tryBlocks.pop();
        },
        
        // Handle an exception
        handleException: function(vm, exception) {
          if (this.tryBlocks.length === 0) {
            // No try blocks, propagate the exception
            throw exception;
          }
          
          // Get the current try block
          const { catchPC, finallyPC } = this.tryBlocks[this.tryBlocks.length - 1];
          
          // Push the exception to the stack
          vm.${stack}.push(exception);
          
          // Jump to the catch block
          return catchPC;
        }
      };
      
      // Virtual machine
      const ${vm} = {
        // VM State
        ${stack}: [],             // Operand stack
        ${scope}: {},             // Global variables
        ${callStack}: [],         // Call stack for function calls
        
        // State management
        ${stateManager}: {
          // Save current state before a function call
          saveState: function(pc, localScope) {
            ${vm}.${callStack}.push({ pc, localScope: {...localScope} });
          },
          
          // Restore state after a function returns
          restoreState: function() {
            return ${vm}.${callStack}.pop();
          },
          
          // Create a new local scope
          createScope: function(parent, params, args) {
            const scope = Object.create(parent);
            
            // Bind parameters to arguments
            if (params && args) {
              for (let i = 0; i < params.length; i++) {
                scope[params[i]] = args[i];
              }
            }
            
            return scope;
          }
        },
        
        // Property access helpers
        ${getProperty}: function(obj, prop) {
          if (obj == null) {
            throw new TypeError('Cannot read property \'' + prop + '\' of ' + obj);
          }
          return obj[prop];
        },
        
        ${setProperty}: function(obj, prop, value) {
          if (obj == null) {
            throw new TypeError('Cannot set property \'' + prop + '\' of ' + obj);
          }
          return obj[prop] = value;
        },
        
        // Function creation helper
        ${createFunction}: function(name, params, bodySource) {
          const func = new Function(
            ...params,
            typeof bodySource === 'string' ? bodySource : 'return undefined;'
          );
          
          if (name) {
            Object.defineProperty(func, 'name', { value: name });
          }
          
          return func;
        },
        
        // Opcode handlers
        ${opcodeHandler}: {
          // LOAD_CONST: Load a constant onto the stack
          [${this.opcodes.LOAD_CONST}]: function(vm, constantIndex) {
            vm.${stack}.push(${runtimeHelpers}.getConstant(constantIndex));
          },
          
          // LOAD_VAR: Load a variable onto the stack
          [${this.opcodes.LOAD_VAR}]: function(vm, nameIndex) {
            const name = ${runtimeHelpers}.getConstant(nameIndex);
            vm.${stack}.push(vm.${scope}[name]);
          },
          
          // STORE_VAR: Store a value in a variable
          [${this.opcodes.STORE_VAR}]: function(vm, nameIndex) {
            const name = ${runtimeHelpers}.getConstant(nameIndex);
            vm.${scope}[name] = vm.${stack}.pop();
          },
          
          // BINARY_OP: Perform a binary operation
          [${this.opcodes.BINARY_OP}]: function(vm, opIndex) {
            const right = vm.${stack}.pop();
            const left = vm.${stack}.pop();
            const operator = ${runtimeHelpers}.getConstant(opIndex);
            
            let result;
            switch(operator) {
              case '+': result = left + right; break;
              case '-': result = left - right; break;
              case '*': result = left * right; break;
              case '/': result = left / right; break;
              case '%': result = left % right; break;
              case '<<': result = left << right; break;
              case '>>': result = left >> right; break;
              case '>>>': result = left >>> right; break;
              case '&': result = left & right; break;
              case '|': result = left | right; break;
              case '^': result = left ^ right; break;
              case '==': result = left == right; break;
              case '!=': result = left != right; break;
              case '===': result = left === right; break;
              case '!==': result = left !== right; break;
              case '<': result = left < right; break;
              case '<=': result = left <= right; break;
              case '>': result = left > right; break;
              case '>=': result = left >= right; break;
              case 'in': result = left in right; break;
              case 'instanceof': result = left instanceof right; break;
              default: throw new Error('Unknown binary operator: ' + operator);
            }
            
            vm.${stack}.push(result);
          },
          
          // UNARY_OP: Perform a unary operation
          [${this.opcodes.UNARY_OP}]: function(vm, opIndex) {
            const arg = vm.${stack}.pop();
            const operator = ${runtimeHelpers}.getConstant(opIndex);
            
            let result;
            switch(operator) {
              case '+': result = +arg; break;
              case '-': result = -arg; break;
              case '!': result = !arg; break;
              case '~': result = ~arg; break;
              case 'typeof': result = typeof arg; break;
              case 'void': result = void arg; break;
              case 'delete':
                // For delete, we need the object and property
                const prop = vm.${stack}.pop();
                result = delete arg[prop];
                break;
              default: throw new Error('Unknown unary operator: ' + operator);
            }
            
            vm.${stack}.push(result);
          },
          
          // LOGICAL_OP: Perform a logical operation
          [${this.opcodes.LOGICAL_OP}]: function(vm, opIndex) {
            const right = vm.${stack}.pop();
            const left = vm.${stack}.pop();
            const operator = ${runtimeHelpers}.getConstant(opIndex);
            
            let result;
            switch(operator) {
              case '&&': result = left && right; break;
              case '||': result = left || right; break;
              case '??': result = left ?? right; break;
              default: throw new Error('Unknown logical operator: ' + operator);
            }
            
            vm.${stack}.push(result);
          },
          
          // CALL_FUNCTION: Call a function
          [${this.opcodes.CALL_FUNCTION}]: function(vm, argCount) {
            const args = [];
            for(let i = 0; i < argCount; i++) {
              args.unshift(vm.${stack}.pop());
            }
            
            const func = vm.${stack}.pop();
            
            if (typeof func !== 'function') {
              throw new TypeError(func + ' is not a function');
            }
            
            const result = func.apply(null, args);
            vm.${stack}.push(result);
          },
          
          // RETURN: Return a value from function or program
          [${this.opcodes.RETURN}]: function(vm) {
            return vm.${stack}.pop();
          },
          
          // JUMP: Unconditional jump
          [${this.opcodes.JUMP}]: function(vm, offsetIndex) {
            const offset = ${runtimeHelpers}.getConstant(offsetIndex);
            return offset;
          },
          
          // JUMP_IF_TRUE: Jump if top of stack is truthy
          [${this.opcodes.JUMP_IF_TRUE}]: function(vm, offsetIndex) {
            const condition = vm.${stack}.pop();
            const offset = ${runtimeHelpers}.getConstant(offsetIndex);
            return condition ? offset : 1;
          },
          
          // JUMP_IF_FALSE: Jump if top of stack is falsy
          [${this.opcodes.JUMP_IF_FALSE}]: function(vm, offsetIndex) {
            const condition = vm.${stack}.pop();
            const offset = ${runtimeHelpers}.getConstant(offsetIndex);
            return condition ? 1 : offset;
          },
          
          // CREATE_FUNCTION: Create a new function
          [${this.opcodes.CREATE_FUNCTION}]: function(vm, nameIndex, paramsIndex, bodyIndex) {
            const name = ${runtimeHelpers}.getConstant(nameIndex);
            const params = ${runtimeHelpers}.getConstant(paramsIndex);
            const body = ${runtimeHelpers}.getConstant(bodyIndex);
            
            const func = vm.${createFunction}(name, params, body);
            vm.${stack}.push(func);
          },
          
          // CREATE_OBJECT: Create a new object
          [${this.opcodes.CREATE_OBJECT}]: function(vm) {
            vm.${stack}.push({});
          },
          
          // LOAD_PROPERTY: Load a property from an object
          [${this.opcodes.LOAD_PROPERTY}]: function(vm, keyIndex) {
            const obj = vm.${stack}.pop();
            const key = ${runtimeHelpers}.getConstant(keyIndex);
            vm.${stack}.push(vm.${getProperty}(obj, key));
          },
          
          // STORE_PROPERTY: Store a value in an object property
          [${this.opcodes.STORE_PROPERTY}]: function(vm, keyIndex) {
            const value = vm.${stack}.pop();
            const key = ${runtimeHelpers}.getConstant(keyIndex);
            const obj = vm.${stack}.pop();
            vm.${stack}.push(vm.${setProperty}(obj, key, value));
          },
          
          // POP: Remove the top value from the stack
          [${this.opcodes.POP}]: function(vm) {
            vm.${stack}.pop();
          },
          
          // DUPLICATE: Duplicate the top value on the stack
          [${this.opcodes.DUPLICATE}]: function(vm) {
            const value = vm.${stack}[vm.${stack}.length - 1];
            vm.${stack}.push(value);
          },
          
          // CREATE_ARRAY: Create a new array
          [${this.opcodes.CREATE_ARRAY}]: function(vm) {
            vm.${stack}.push([]);
          },
          
          // ARRAY_PUSH: Push a value onto an array
          [${this.opcodes.ARRAY_PUSH}]: function(vm) {
            const value = vm.${stack}.pop();
            const array = vm.${stack}.pop();
            array.push(value);
            vm.${stack}.push(array);
          },
          
          // LOAD_INDEX: Load a value from an array or object by index
          [${this.opcodes.LOAD_INDEX}]: function(vm) {
            const index = vm.${stack}.pop();
            const obj = vm.${stack}.pop();
            vm.${stack}.push(vm.${getProperty}(obj, index));
          },
          
          // STORE_INDEX: Store a value in an array or object by index
          [${this.opcodes.STORE_INDEX}]: function(vm) {
            const value = vm.${stack}.pop();
            const index = vm.${stack}.pop();
            const obj = vm.${stack}.pop();
            vm.${stack}.push(vm.${setProperty}(obj, index, value));
          },
          
          // NEW_INSTANCE: Create a new instance of a constructor
          [${this.opcodes.NEW_INSTANCE}]: function(vm, argCount) {
            const args = [];
            for(let i = 0; i < argCount; i++) {
              args.unshift(vm.${stack}.pop());
            }
            
            const constructor = vm.${stack}.pop();
            
            if (typeof constructor !== 'function') {
              throw new TypeError(constructor + ' is not a constructor');
            }
            
            // Use Function.prototype.bind to allow 'new' with apply
            const boundConstructor = Function.prototype.bind.apply(
              constructor, 
              [null].concat(args)
            );
            
            const result = new boundConstructor();
            vm.${stack}.push(result);
          },
          
          // UNDEFINED: Push undefined onto the stack
          [${this.opcodes.UNDEFINED}]: function(vm) {
            vm.${stack}.push(undefined);
          },
          
          // NULL: Push null onto the stack
          [${this.opcodes.NULL}]: function(vm) {
            vm.${stack}.push(null);
          },
          
          // THIS: Push the current 'this' context onto the stack
          [${this.opcodes.THIS}]: function(vm) {
            vm.${stack}.push(this);
          },
          
          // TRY_BEGIN: Begin a try block
          [${this.opcodes.TRY_BEGIN}]: function(vm, catchPCIndex, finallyPCIndex) {
            const catchPC = ${runtimeHelpers}.getConstant(catchPCIndex);
            const finallyPC = ${runtimeHelpers}.getConstant(finallyPCIndex);
            ${exceptionHandler}.enterTry(catchPC, finallyPC);
          },
          
          // TRY_END: End a try block
          [${this.opcodes.TRY_END}]: function(vm) {
            ${exceptionHandler}.exitTry();
          },
          
          // CATCH: Begin a catch block
          [${this.opcodes.CATCH}]: function(vm, nameIndex) {
            const name = ${runtimeHelpers}.getConstant(nameIndex);
            // The exception is already on the stack
            vm.${scope}[name] = vm.${stack}[vm.${stack}.length - 1];
          },
          
          // THROW: Throw an exception
          [${this.opcodes.THROW}]: function(vm) {
            const exception = vm.${stack}.pop();
            throw exception;
          },
          
          // NOP: No operation (used for dead code)
          [${this.opcodes.NOP}]: function(vm) {
            // Do nothing
          }
        },
        
        // Main function to execute bytecode
        ${executeFunction}: function() {
          try {
            // Initial self-integrity check
            ${this.options.selfDefending ? `${selfCheck}();` : ''}
            
            // Decrypt bytecode
            const decryptedBytecode = ${runtimeHelpers}.decryptBytecode();
            
            let pc = 0; // Program counter
            
            // Main execution loop
            while (pc < decryptedBytecode.length) {
              // Periodic self-checks and anti-debugging
              ${this.options.selfDefending ? `
              if (pc % 100 === 0) {
                ${antiDebug}();
              }
              
              if (pc % 250 === 0) {
                ${selfCheck}();
              }
              ` : ''}
              
              const opcode = decryptedBytecode[pc++];
              
              // Get handler for the opcode
              const handler = this.${opcodeHandler}[opcode];
              
              if (handler) {
                try {
                  // Get arguments for the opcode based on its type
                  const args = [];
                  
                  // Different opcodes need different numbers of arguments
                  if (opcode === ${this.opcodes.LOAD_CONST} || 
                      opcode === ${this.opcodes.LOAD_VAR} || 
                      opcode === ${this.opcodes.STORE_VAR} ||
                      opcode === ${this.opcodes.BINARY_OP} ||
                      opcode === ${this.opcodes.UNARY_OP} ||
                      opcode === ${this.opcodes.LOGICAL_OP} ||
                      opcode === ${this.opcodes.JUMP} ||
                      opcode === ${this.opcodes.JUMP_IF_TRUE} ||
                      opcode === ${this.opcodes.JUMP_IF_FALSE} ||
                      opcode === ${this.opcodes.LOAD_PROPERTY} ||
                      opcode === ${this.opcodes.STORE_PROPERTY}) {
                    args.push(decryptedBytecode[pc++]);
                  } else if (opcode === ${this.opcodes.CALL_FUNCTION} ||
                             opcode === ${this.opcodes.NEW_INSTANCE}) {
                    args.push(decryptedBytecode[pc++]);
                  } else if (opcode === ${this.opcodes.CREATE_FUNCTION}) {
                    args.push(decryptedBytecode[pc++]); // Name
                    args.push(decryptedBytecode[pc++]); // Params
                    args.push(decryptedBytecode[pc++]); // Body
                  } else if (opcode === ${this.opcodes.TRY_BEGIN}) {
                    args.push(decryptedBytecode[pc++]); // Catch PC
                    args.push(decryptedBytecode[pc++]); // Finally PC
                  } else if (opcode === ${this.opcodes.CATCH}) {
                    args.push(decryptedBytecode[pc++]); // Exception name
                  }
                  
                  // Execute the handler with arguments
                  const result = handler.apply(this, [this, ...args]);
                  
                  // Handle special return values
                  if (result !== undefined) {
                    if (opcode === ${this.opcodes.RETURN}) {
                      // Return from the function or program
                      return result;
                    } else if (opcode === ${this.opcodes.JUMP} ||
                               opcode === ${this.opcodes.JUMP_IF_TRUE} ||
                               opcode === ${this.opcodes.JUMP_IF_FALSE}) {
                      // Update program counter for jumps
                      pc += result - 1; // -1 because we already incremented pc
                    }
                  }
                } catch (e) {
                  // Handle exceptions within opcode execution
                  if (${exceptionHandler}.tryBlocks.length > 0) {
                    // Jump to the catch block
                    pc = ${exceptionHandler}.handleException(this, e);
                  } else {
                    // Re-throw the exception
                    throw e;
                  }
                }
              } else {
                // Invalid opcode handling
                throw new Error('Unknown opcode: ' + opcode);
              }
            }
            
            // If we reach the end without a return, return undefined
            return undefined;
          } catch (e) {
            // Outer error handling
            console.error('VM Execution Error:', e);
            
            // Additional error handling for security violations
            if (e.message && e.message.includes('Security violation')) {
              // Take defensive actions
              this.${stack} = [];
              this.${scope} = {};
              // Potentially notify a security endpoint or take other measures
            }
            
            throw e;
          }
        }
      };
      
      // Inject native functions into VM scope
      for (const key in ${nativeFunctions}) {
        ${vm}.${scope}[key] = ${nativeFunctions}[key];
      }
      
      // Execute the VM with error handling
      try {
        return ${vm}.${executeFunction}();
      } catch (e) {
        console.error('Execution failed:', e);
        
        // For production, you might want to hide the error details
        if (e.message && e.message.includes('Security violation')) {
          throw new Error('Application cannot continue due to security violation');
        }
        
        throw e;
      }
    })();
    `;
    
    return vmCode;
  }

  /**
   * Add additional protections to the VM code
   * @param {string} vmCode - Generated VM code
   * @returns {string} - Code with additional protections
   */
  _addExtraProtections(vmCode) {
    let protectedCode = vmCode;
    
    // Add random comments
    if (this.options.deadCodeInjection) {
      protectedCode = this._addFakeComments(protectedCode);
    }
    
    // Flatten control flow
    if (this.options.controlFlowFlattening) {
      protectedCode = this._flattenControlFlow(protectedCode);
    }
    
    // Transform object keys
    if (this.options.transformObjectKeys) {
      protectedCode = this._transformObjectProperties(protectedCode);
    }
    
    // Add protection against testing environments and headless browsers
    protectedCode = `
    (function() {
      // Detect testing environments
      function checkEnvironment() {
        try {
          // Check for headless browser
          if (navigator.webdriver || 
              navigator.userAgent.includes("Headless") ||
              !window.outerHeight || 
              !window.outerWidth) {
            return false;
          }
          
          // Check for automated testing frameworks
          if (window.Cypress || window.WebDriver || window._phantom || 
              window.__nightmare || window.callPhantom) {
            return false;
          }
          
          // Check for iframe embedding
          if (window !== window.top) {
            return false;
          }
          
          // Check for dev tools
          const devtoolsOpen = /./constructor.constructor("return this")().document.documentElement.getAttribute('devtoolsopen') === 'yes';
          if (devtoolsOpen) {
            return false;
          }
          
          return true;
        } catch (e) {
          return false;
        }
      }
      
      // Self-healing mechanism - add protection without breaking legitimate use
      if (typeof window !== 'undefined' && !checkEnvironment()) {
        // For browser environments, we can take defensive actions
        // But we should still allow the app to run with reduced functionality
        console.warn("Suspicious environment detected. Performance may be affected.");
        // Simulate slower performance to discourage automated analysis
        const originalSetTimeout = setTimeout;
        window.setTimeout = function(fn, delay) {
          return originalSetTimeout(fn, delay + Math.random() * 500);
        };
      }
      
      ${protectedCode}
    })();
    `;
    
    return protectedCode;
  }

  /**
   * Add fake comments to code
   * @param {string} code - Source code
   * @returns {string} - Code with fake comments
   */
  _addFakeComments(code) {
    const lines = code.split('\n');
    const fakeComments = [
      "// TODO: Improve performance of this section",
      "// HACK: Temporary solution",
      "// FIXME: Bug found",
      "// DEBUG: Add input validation",
      "/* This section is critical for performance */",
      "/* Do not modify code below */",
      "// Parser requires this function",
      "// Required for IE11 compatibility",
      "// Edge case handling",
      "// Optimization: avoid re-allocation",
      "// Security: prevent XSS attacks",
      "// Special case for legacy browsers",
      "// IMPORTANT: Do not refactor this code",
      "// Memory management improvement",
      "/* High-performance implementation */",
      "// Event loop synchronization point",
      "// Timing-sensitive code",
      "// Workaround for V8 optimization bug",
      "// Fallback for older JS engines",
      "// Critical section - thread safety"
    ];
    
    // Add comments every few lines
    for (let i = 5; i < lines.length; i += Math.floor(Math.random() * 15) + 5) {
      const commentIndex = Math.floor(Math.random() * fakeComments.length);
      lines.splice(i, 0, fakeComments[commentIndex]);
    }
    
    return lines.join('\n');
  }

  /**
   * Implement control flow flattening
   * @param {string} code - Source code
   * @returns {string} - Code with flattened control flow
   */
  _flattenControlFlow(code) {
    try {
      // Parse the code to AST
      const ast = acorn.parse(code, {
        ecmaVersion: 2022,
        sourceType: 'script'
      });
      
      // Find function bodies and transform their control flow
      const transformNode = (node) => {
        if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
          // Flatten the function body
          this._flattenFunctionBody(node.body);
        }
        
        // Recursively process all child nodes
        for (const key in node) {
          if (node[key] && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
              node[key].forEach(transformNode);
            } else {
              transformNode(node[key]);
            }
          }
        }
      };
      
      // Transform the AST
      transformNode(ast);
      
      // Generate code from the transformed AST
      return escodegen.generate(ast);
    } catch (e) {
      // If transformation fails, return the original code
      console.warn('Control flow flattening failed:', e);
      return code;
    }
  }
  
  /**
   * Flatten a function body's control flow
   * @param {Object} bodyNode - Function body node
   */
  _flattenFunctionBody(bodyNode) {
    // In a real implementation, this would transform sequential statements
    // into a state machine with switch statement
    // This is a simplified placeholder
  }

  /**
   * Transform object properties to be less readable
   * @param {string} code - Source code
   * @returns {string} - Code with transformed object properties
   */
  _transformObjectProperties(code) {
    try {
      // Parse the code to AST
      const ast = acorn.parse(code, {
        ecmaVersion: 2022,
        sourceType: 'script'
      });
      
      // Transform object property access
      const transformNode = (node) => {
        // Transform obj.prop to obj["prop"]
        if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
          node.computed = true;
          node.property = {
            type: 'Literal',
            value: node.property.name,
            raw: `"${node.property.name}"`
          };
        }
        
        // Recursively process all child nodes
        for (const key in node) {
          if (node[key] && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
              node[key].forEach(transformNode);
            } else {
              transformNode(node[key]);
            }
          }
        }
      };
      
      // Transform the AST
      transformNode(ast);
      
      // Generate code from the transformed AST
      return escodegen.generate(ast);
    } catch (e) {
      // If transformation fails, return the original code
      console.warn('Object property transformation failed:', e);
      return code;
    }
  }

  /**
   * Generate a random identifier name
   * @param {number} length - Length of the identifier
   * @returns {string} - Random identifier
   */
  _generateRandomName(length) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_';
    let result = charset[Math.floor(Math.random() * (charset.length - 10))]; // First char must be a letter
    for (let i = 1; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
    return result;
  }
}

// Example usage
const obfuscate = async (inputFiles, outputDir) => {
  // Check for required dependencies
  try {
    require('acorn');
    require('escodegen');
  } catch (error) {
    console.error('Missing dependencies. Install them with:');
    console.error('npm install acorn escodegen');
    process.exit(1);
  }

  const options = {
    vmName: 'SecureVM',
    stringEncoding: true,
    controlFlowFlattening: true,
    deadCodeInjection: true,
    selfDefending: true,
    debugProtection: true,
    entropy: 0.8,
    transformObjectKeys: true
  };

  const virtualizer = new JSVirtualizer(options);
  await virtualizer.processFiles(inputFiles, outputDir);
  console.log('Obfuscation completed.');
};

// Export for use as a module
module.exports = {
  JSVirtualizer,
  obfuscate
};

// Handle direct invocation from command line
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node js-vm-obfuscator.js <input_file.js> <output_directory>');
    process.exit(1);
  }
  
  const [inputFile, outputDir] = args;
  obfuscate(inputFile, outputDir);
}