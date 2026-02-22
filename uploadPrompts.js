import fs from 'fs';
import path from 'path';

const REPO_PATH = 'd:/vibeCode/agents-repo/agents-main';
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbx9m2P0QZDx-dZSrn0x6R0BL6itWYszwjZYCYe49PWf6N6UefXUWYZ3cjhCgOTDxYuSXw/exec';

function parseAgentFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Parse YAML frontmatter roughly
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (!match) return null;

    const frontmatter = match[1];
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

    const name = nameMatch ? nameMatch[1].trim() : path.basename(filePath, '.md');
    const description = descMatch ? descMatch[1].trim() : '';

    const prompt = content.replace(frontmatterRegex, '').trim();

    return {
        id: name,
        name: name,
        description: description,
        prompt: prompt
    };
}

function scanAgentsDir(dir) {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            results = results.concat(scanAgentsDir(fullPath));
        } else if (file.endsWith('.md') && file !== 'README.md') {
            const parsed = parseAgentFile(fullPath);
            if (parsed) {
                results.push(parsed);
            }
        }
    }
    return results;
}

async function uploadPrompts() {
    console.log(`Scanning directory: ${REPO_PATH}`);
    const prompts = scanAgentsDir(REPO_PATH);
    console.log(`Found ${prompts.length} agent templates. Uploading...`);

    if (prompts.length === 0) {
        console.log("No prompts found.");
        return;
    }

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action: 'UPLOAD_PROMPTS',
                prompts: prompts
            })
        });

        const result = await response.json();
        if (result.success) {
            console.log(`Successfully uploaded ${result.count} prompts to Google Sheets!`);
        } else {
            console.error("Upload failed:", result);
        }
    } catch (e) {
        console.error("Network error:", e);
    }
}

uploadPrompts();
