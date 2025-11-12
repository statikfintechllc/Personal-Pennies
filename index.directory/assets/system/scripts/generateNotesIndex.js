/**
 * Generate Notes Index Script (JavaScript version)
 * Scans the SFTi.Notez directory and creates a JSON index
 * of all markdown files with metadata and excerpts
 * 
 * This is a direct JavaScript port of .github/scripts/generate_notes_index.py
 */

/**
 * Extract YAML frontmatter from markdown content
 * @param {string} content - Markdown content
 * @returns {Object} {frontmatter: Object, body: string}
 */
function extractFrontmatter(content) {
  if (!content.startsWith('---')) {
    return { frontmatter: {}, body: content };
  }
  
  try {
    const parts = content.split('---');
    if (parts.length < 3) {
      return { frontmatter: {}, body: content };
    }
    
    // Parse YAML-like frontmatter (simple parser)
    const frontmatterText = parts[1];
    const body = parts.slice(2).join('---').trim();
    const frontmatter = {};
    
    const lines = frontmatterText.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        const key = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        frontmatter[key] = value;
      }
    }
    
    return { frontmatter, body };
  } catch (error) {
    console.error('[GenerateNotesIndex] Error parsing frontmatter:', error);
    return { frontmatter: {}, body: content };
  }
}

/**
 * Extract title from markdown content or filename
 * @param {string} content - Markdown content
 * @param {string} filename - File name as fallback
 * @returns {string} Title
 */
function extractTitleFromMarkdown(content, filename) {
  // Try to find first H1 heading
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.substring(2).trim();
    } else if (line.startsWith('**') && line.endsWith('**')) {
      // Handle bold text as title
      return line.replace(/\*\*/g, '').trim();
    }
  }
  
  // Fallback to filename
  return filename.replace('.md', '').replace(/\./g, ' ').replace(/_/g, ' ');
}

/**
 * Extract a short excerpt from markdown content
 * @param {string} content - Markdown content
 * @param {number} maxLength - Maximum excerpt length
 * @returns {string} Excerpt
 */
function extractExcerpt(content, maxLength = 150) {
  const lines = content.split('\n');
  const paragraphs = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip headings, horizontal rules, code blocks, quotes, and empty lines
    if (trimmed.startsWith('#') || 
        trimmed.startsWith('---') || 
        trimmed.startsWith('```') ||
        trimmed.startsWith('>') ||
        trimmed.startsWith('<') ||
        !trimmed) {
      continue;
    }
    
    // Stop at image tags
    if (trimmed.includes('![') || trimmed.includes('<img')) {
      continue;
    }
    
    paragraphs.push(trimmed);
    
    // Get first meaningful paragraph
    const joined = paragraphs.join(' ');
    if (joined.length > 50) {
      // Truncate to max length
      if (joined.length > maxLength) {
        return joined.substring(0, maxLength).trim() + '...';
      }
      return joined;
    }
  }
  
  const result = paragraphs.join(' ');
  if (result.length > maxLength) {
    return result.substring(0, maxLength).trim() + '...';
  }
  return result || 'No excerpt available';
}

/**
 * Scan IndexedDB for note entries
 * @returns {Promise<Array>} List of note dictionaries
 */
async function scanNotesFromDB() {
  const notes = [];
  
  if (!window.PersonalPenniesDB) {
    console.error('[GenerateNotesIndex] DB not initialized');
    return notes;
  }
  
  try {
    const allNotes = await window.PersonalPenniesDB.getAllNotes();
    
    for (const note of allNotes) {
      const content = note.markdown_content || note.content || '';
      const { frontmatter, body } = extractFrontmatter(content);
      
      const title = frontmatter.title || extractTitleFromMarkdown(body, note.filename || note._key);
      const excerpt = extractExcerpt(body);
      
      notes.push({
        title: title,
        file: note.file || note._key,
        filename: note.filename || note._key,
        date: note.date || frontmatter.date || new Date().toISOString().split('T')[0],
        category: note.category || frontmatter.category || 'General',
        tags: note.tags || frontmatter.tags || [],
        excerpt: excerpt,
        modified: note.modified || note._saved_at || new Date().toISOString()
      });
      
      console.log(`[GenerateNotesIndex] Found note: ${title}`);
    }
  } catch (error) {
    console.error('[GenerateNotesIndex] Error scanning notes:', error);
  }
  
  return notes;
}

/**
 * Main function to generate notes index
 * @returns {Promise<Object>} Notes index data
 */
export async function generateNotesIndex() {
  console.log('[GenerateNotesIndex] Generating notes index...');
  
  // Scan for notes
  const notes = await scanNotesFromDB();
  
  // Sort by date (most recent first)
  notes.sort((a, b) => b.date.localeCompare(a.date));
  
  const output = {
    notes: notes,
    total_count: notes.length,
    generated_at: new Date().toISOString(),
    version: '1.0'
  };
  
  if (notes.length === 0) {
    console.warn('[GenerateNotesIndex] No notes found');
  } else {
    console.log(`[GenerateNotesIndex] Found ${notes.length} note(s)`);
  }
  
  // Save to IndexedDB
  if (window.PersonalPenniesDB) {
    await window.PersonalPenniesDB.saveIndex('notes-index', output);
  }
  
  console.log(`[GenerateNotesIndex] Notes index generated`);
  console.log(`[GenerateNotesIndex] Total notes: ${output.total_count}`);
  
  return output;
}

/**
 * Generate notes index and emit event
 */
export async function generateNotesIndexAndEmit() {
  const index = await generateNotesIndex();
  
  // Emit event
  if (window.SFTiEventBus) {
    window.SFTiEventBus.emit('notes:indexed', index);
  }
  
  return index;
}

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesGenerateNotesIndex = {
    generateNotesIndex,
    generateNotesIndexAndEmit
  };
}

console.log('[GenerateNotesIndex] Module loaded');
