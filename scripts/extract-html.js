#!/usr/bin/env node
/**
 * HTML Extractor Script
 * Extracts HTML from welcomePanel.ts and splits into template files
 * 
 * Usage: node extract-html.js
 */

const fs = require('fs');
const path = require('path');

const WELCOME_PANEL_PATH = path.join(__dirname, '../src/ui/panels/welcomePanel.ts');
const TEMPLATES_DIR = path.join(__dirname, '../src/ui/panels/templates');
const PARTIALS_DIR = path.join(TEMPLATES_DIR, 'partials');

// Ensure directories exist
if (!fs.existsSync(PARTIALS_DIR)) {
  fs.mkdirSync(PARTIALS_DIR, { recursive: true });
}

// Read the TypeScript file
const content = fs.readFileSync(WELCOME_PANEL_PATH, 'utf8');

// Find the _getHtmlContent method
const methodStart = content.indexOf('private _getHtmlContent(context: vscode.ExtensionContext): string {');
const methodEnd = content.indexOf('\n  }', methodStart);
const methodContent = content.substring(methodStart, methodEnd);

// Extract the return statement
const returnMatch = methodContent.match(/return `([\s\S]*)`;\s*$/);
if (!returnMatch) {
  console.error('❌ Could not find HTML content in return statement');
  process.exit(1);
}

const htmlContent = returnMatch[1];

console.log('✅ Found HTML content, length:', htmlContent.length);
console.log('📝 Extracting sections...\n');

// Extract sections by markers
const sections = {
  styles: {
    start: '<style>',
    end: '</style>',
    file: 'partials/styles.html'
  },
  header: {
    start: '<div class="header">',
    end: '</div>\n        \n        <div class="actions">',
    file: 'partials/header.html',
    keepStart: true,
    keepEnd: false
  },
  actions: {
    start: '<div class="actions">',
    end: '</div>\n        \n        <!-- Recent Workspaces -->',
    file: 'partials/actions.html',
    keepStart: true,
    keepEnd: false
  },
  workspaces: {
    start: '<!-- Recent Workspaces -->',
    end: '<!-- Command Reference -->',
    file: 'partials/workspaces.html',
    keepStart: false,
    keepEnd: false
  },
  commands: {
    start: '<!-- Command Reference -->',
    end: '<!-- Module Browser -->',
    file: 'partials/commands.html',
    keepStart: false,
    keepEnd: false
  },
  modules: {
    start: '<!-- Module Browser -->',
    end: '<div class="footer">',
    file: 'partials/modules.html',
    keepStart: false,
    keepEnd: false
  },
  footer: {
    start: '<div class="footer">',
    end: '</div>\n        \n        <script>',
    file: 'partials/footer.html',
    keepStart: true,
    keepEnd: false
  },
  scripts: {
    start: '<script>',
    end: '</script>',
    file: 'partials/scripts.html'
  }
};

// Extract each section
for (const [name, config] of Object.entries(sections)) {
  try {
    const startIndex = htmlContent.indexOf(config.start);
    const endIndex = htmlContent.indexOf(config.end, startIndex);
    
    if (startIndex === -1 || endIndex === -1) {
      console.warn(`⚠️  Could not extract ${name} section`);
      continue;
    }
    
    const actualStart = config.keepStart !== false ? startIndex : startIndex + config.start.length;
    const actualEnd = config.keepEnd ? endIndex + config.end.length : endIndex;
    
    let sectionContent = htmlContent.substring(actualStart, actualEnd).trim();
    
    // Remove extra indentation (8 spaces which is common in template strings)
    sectionContent = sectionContent.split('\n').map(line => {
      if (line.startsWith('        ')) {
        return line.substring(8);
      }
      return line;
    }).join('\n');
    
    const filePath = path.join(TEMPLATES_DIR, config.file);
    fs.writeFileSync(filePath, sectionContent + '\n', 'utf8');
    console.log(`✅ Extracted ${name} → ${config.file} (${sectionContent.length} bytes)`);
  } catch (error) {
    console.error(`❌ Error extracting ${name}:`, error.message);
  }
}

// Create main template
const mainTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to RapidKit</title>
    {{> styles}}
</head>
<body>
    <div class="container">
        {{> header}}
        {{> actions}}
        {{> workspaces}}
        {{> commands}}
        {{> modules}}
        {{> footer}}
    </div>
    {{> scripts}}
</body>
</html>
`;

fs.writeFileSync(path.join(TEMPLATES_DIR, 'welcome.html'), mainTemplate, 'utf8');
console.log('\n✅ Created main template → welcome.html');

console.log('\n🎉 Extraction complete!');
console.log(`📂 Templates directory: ${TEMPLATES_DIR}`);
