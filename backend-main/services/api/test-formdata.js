const FormData = require('form-data');
const fs = require('fs');

// Create a small test buffer
const testBuffer = Buffer.from('test image data for verification');

console.log('Testing form-data with buffer...');

try {
  const form = new FormData();
  
  // Test appending buffer directly
  form.append('image_data', testBuffer, {
    filename: 'test.jpg',
    contentType: 'image/jpeg',
    knownLength: testBuffer.length
  });
  
  console.log('SUCCESS: Buffer appended to form-data without error');
  console.log('Form headers:', form.getHeaders());
  
} catch (error) {
  console.error('ERROR with form-data:', error.message);
  console.error('Stack trace:', error.stack);
}

// Also test with a fake file object similar to what multer creates
const fakeFile = {
  buffer: testBuffer,
  originalname: 'test.jpg',
  mimetype: 'image/jpeg',
  size: testBuffer.length
};

try {
  const form2 = new FormData();
  form2.append('image_data', fakeFile.buffer, {
    filename: fakeFile.originalname || 'image.jpg',
    contentType: fakeFile.mimetype || 'image/jpeg',
    knownLength: fakeFile.buffer.length
  });
  
  console.log('\nSUCCESS: Fake file buffer appended to form-data without error');
  console.log('Form headers:', form2.getHeaders());
  
} catch (error) {
  console.error('\nERROR with fake file buffer:', error.message);
  console.error('Stack trace:', error.stack);
}