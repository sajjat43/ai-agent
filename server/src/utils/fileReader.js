import fs from 'fs';

// File reading utility
export const readFileContent = async (filePath, mimetype) => {
  try {
    console.log(`📖 Reading file content: ${filePath}`);
    console.log(`📄 MIME type: ${mimetype}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    console.log(`📊 File size: ${stats.size} bytes`);
    
    if (mimetype.startsWith('text/') || mimetype === 'application/json') {
      console.log(`📝 Reading as text file`);
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`✅ Text content read, length: ${content.length} characters`);
      return content;
    } else if (mimetype === 'application/pdf') {
      console.log(`📄 Reading as PDF file`);
      try {
        const pdfBuffer = fs.readFileSync(filePath);
        console.log(`📄 PDF buffer size: ${pdfBuffer.length} bytes`);
        
        if (pdfBuffer.length === 0) {
          throw new Error('PDF file is empty');
        }
        
        // Dynamic import to avoid startup issues with pdf-parse
        const pdfParse = (await import('pdf-parse')).default;
        const pdfDataResult = await pdfParse(pdfBuffer);
        
        if (!pdfDataResult || !pdfDataResult.text) {
          throw new Error('PDF parsing returned no text content');
        }
        
        console.log(`✅ PDF parsed, text length: ${pdfDataResult.text.length} characters`);
        
        if (pdfDataResult.text.length === 0) {
          return '[PDF file contains no readable text content]';
        }
        
        return pdfDataResult.text;
      } catch (pdfError) {
        console.error(`❌ PDF parsing failed: ${pdfError.message}`);
        console.error(`❌ PDF error stack: ${pdfError.stack}`);
        
        // Return a more helpful error message
        if (pdfError.message.includes('Invalid PDF')) {
          throw new Error('Invalid PDF file format. Please ensure the file is a valid PDF.');
        } else if (pdfError.message.includes('encrypted')) {
          throw new Error('PDF file is encrypted or password-protected. Please upload an unprotected PDF.');
        } else {
          throw new Error(`Failed to parse PDF: ${pdfError.message}`);
        }
      }
    } else if (mimetype.includes('word') || mimetype.includes('excel')) {
      console.log(`📄 Office document detected (not implemented)`);
      // For Office documents, return placeholder - you might want to add mammoth or xlsx libraries
      return '[Office document content - Office document parsing not implemented yet]';
    } else {
      console.log(`📄 Reading as generic text file`);
      const content = fs.readFileSync(filePath, 'utf8');
      console.log(`✅ Generic content read, length: ${content.length} characters`);
      return content;
    }
  } catch (error) {
    console.error(`❌ Failed to read file content: ${error.message}`);
    console.error(`❌ File path: ${filePath}`);
    console.error(`❌ MIME type: ${mimetype}`);
    throw new Error(`Failed to read file content: ${error.message}`);
  }
}; 