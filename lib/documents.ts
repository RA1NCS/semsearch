import fs from 'fs';
import path from 'path';

const DOCS_DIR = path.join(process.cwd(), 'data', 'documents');

// load all documents from individual files in data/documents/
export function loadDocuments(): string[] {
    const files = fs
        .readdirSync(DOCS_DIR)
        .filter((f) => f.endsWith('.txt'))
        .sort();

    return files
        .map((f) => fs.readFileSync(path.join(DOCS_DIR, f), 'utf-8').trim())
        .filter((text) => text.length > 0);
}
