// Test to see which FormData we're importing
const FormDataPackage = require('form-data');
console.log('form-data package constructor name:', FormDataPackage.name);

// Test creating an instance
const form = new FormDataPackage();
console.log('form-data package instance created successfully');

// Check if it has the expected methods
console.log('has append method:', typeof form.append === 'function');
console.log('has getHeaders method:', typeof form.getHeaders === 'function');

// Create a test buffer
const testBuffer = Buffer.from('test data');

// Try to append the buffer
try {
  form.append('test', testBuffer, {
    filename: 'test.txt',
    contentType: 'text/plain',
    knownLength: testBuffer.length
  });
  console.log('Buffer appended successfully');
} catch (error) {
  console.error('Error appending buffer:', error.message);
  console.error('Error stack:', error.stack);
}