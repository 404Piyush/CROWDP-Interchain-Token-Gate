import fs from 'fs';
import path from 'path';

const apiDir = path.join(__dirname, '../src/app/api');

// Files to update with security headers
const filesToUpdate = [
  'auth/wallet-challenge/route.ts',
  'user/assign-roles/route.ts', 
  'user/save/route.ts',
  'roles/route.ts',
  'auth/verify-signature/route.ts',
  'test-role/route.ts',
  'auth/discord/route.ts',
  'auth/discord/callback/route.ts',
  'user/role/route.ts'
];

function updateFile(filePath) {
  const fullPath = path.join(apiDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${fullPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Add security headers import if not present
  if (!content.includes('createSecureResponse')) {
    const importLine = "import { createSecureResponse, createSecureErrorResponse } from '@/lib/security-headers';";
    
    // Find the last import statement
    const importRegex = /import.*from.*['"];/g;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      content = content.replace(lastImport, lastImport + '\n' + importLine);
    } else {
      // If no imports found, add at the beginning
      content = importLine + '\n\n' + content;
    }
  }
  
  // Replace NextResponse.json with secure alternatives
  content = content.replace(
    /return NextResponse\.json\(\s*\{\s*error:\s*([^}]+)\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\);/g,
    'return createSecureErrorResponse($1, $2);'
  );
  
  content = content.replace(
    /return NextResponse\.json\(\s*([^,]+)\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\);/g,
    'return createSecureResponse($1, $2);'
  );
  
  content = content.replace(
    /return NextResponse\.json\(\s*([^)]+)\s*\);/g,
    'return createSecureResponse($1);'
  );
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated: ${filePath}`);
}

// Update all files
filesToUpdate.forEach(updateFile);

console.log('Security headers update completed!');