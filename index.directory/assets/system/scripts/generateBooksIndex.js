/**
 * Generate Books Index Script (JavaScript version)
 * Scans the Informational.Bookz directory and creates a JSON index
 * of all PDF files with metadata
 * 
 * This is a direct JavaScript port of .github/scripts/generate_books_index.py
 */

/**
 * Extract a readable title from the filename
 * @param {string} filename - PDF filename
 * @returns {string} Formatted title
 */
function extractBookTitle(filename) {
  // Remove .pdf extension and replace underscores with spaces
  return filename.replace('.pdf', '').replace(/_/g, ' ');
}

/**
 * Scan IndexedDB for book entries
 * @returns {Promise<Array>} List of book dictionaries
 */
async function scanBooksFromDB() {
  const books = [];
  
  if (!window.PersonalPenniesDB) {
    console.error('[GenerateBooksIndex] DB not initialized');
    return books;
  }
  
  try {
    const allBooks = await window.PersonalPenniesDB.getAllBooks();
    
    for (const book of allBooks) {
      books.push({
        title: book.title || extractBookTitle(book.filename),
        file: book.file || book._key,
        filename: book.filename,
        size: book.size || 0,
        size_mb: book.size_mb || Math.round((book.size || 0) / (1024 * 1024) * 100) / 100,
        modified: book.modified || new Date().toISOString(),
        cover: book.cover || null
      });
      
      console.log(`[GenerateBooksIndex] Found book: ${books[books.length - 1].title}`);
    }
  } catch (error) {
    console.error('[GenerateBooksIndex] Error scanning books:', error);
  }
  
  return books;
}

/**
 * Main function to generate books index
 * @returns {Promise<Object>} Books index data
 */
export async function generateBooksIndex() {
  console.log('[GenerateBooksIndex] Generating books index...');
  
  // Scan for books
  const books = await scanBooksFromDB();
  
  const output = {
    books: books,
    total_count: books.length,
    generated_at: new Date().toISOString(),
    version: '1.0'
  };
  
  if (books.length === 0) {
    console.warn('[GenerateBooksIndex] No books found');
  } else {
    console.log(`[GenerateBooksIndex] Found ${books.length} book(s)`);
  }
  
  // Save to IndexedDB
  if (window.PersonalPenniesDB) {
    await window.PersonalPenniesDB.saveIndex('books-index', output);
  }
  
  console.log(`[GenerateBooksIndex] Books index generated`);
  console.log(`[GenerateBooksIndex] Total books: ${output.total_count}`);
  
  return output;
}

/**
 * Generate books index and emit event
 */
export async function generateBooksIndexAndEmit() {
  const index = await generateBooksIndex();
  
  // Emit event
  if (window.SFTiEventBus) {
    window.SFTiEventBus.emit('books:indexed', index);
  }
  
  return index;
}

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesGenerateBooksIndex = {
    generateBooksIndex,
    generateBooksIndexAndEmit
  };
}

console.log('[GenerateBooksIndex] Module loaded');
