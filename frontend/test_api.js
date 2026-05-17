import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const API_URL = 'http://localhost:5000/api ';
let token = '';
let folderId = '';

async function runTests() {
  console.log('Starting API tests...');
  try {
    // 1. Register User
    const uniqueEmail = `testuser_${Date.now()}@test.com`;
    console.log('\n--- 1. Testing Registration ---');
    let res = await axios.post(`${API_URL}/auth/register`, {
      name: 'Test User',
      email: uniqueEmail,
      password: 'password123'
    });
    console.log('✅ Register successful:', res.data.name);

    // 2. Login User
    console.log('\n--- 2. Testing Login ---');
    res = await axios.post(`${API_URL}/auth/login`, {
      email: uniqueEmail,
      password: 'password123'
    });
    token = res.data.token;
    console.log('✅ Login successful, obtained token.');

    const headers = { Authorization: `Bearer ${token}` };

    // 3. Create Folder
    console.log('\n--- 3. Testing Folder Creation ---');
    res = await axios.post(`${API_URL}/folders`, {
      folderName: 'Test Folder',
      color: '#ff0000'
    }, { headers });
    folderId = res.data._id;
    console.log('✅ Folder created with ID:', folderId);

    // 4. Get Folders
    console.log('\n--- 4. Testing Get Folders ---');
    res = await axios.get(`${API_URL}/folders`, { headers });
    console.log(`✅ Found ${res.data.length} folder(s).`);

    // 5. Upload File
    console.log('\n--- 5. Testing File Upload ---');
    const formData = new FormData();
    fs.writeFileSync('dummy.txt', 'Hello world');
    formData.append('file', fs.createReadStream('dummy.txt'));
    formData.append('folderId', folderId);
    
    res = await axios.post(`${API_URL}/files`, formData, {
      headers: {
        ...headers,
        ...formData.getHeaders()
      }
    });
    console.log('✅ File uploaded with ID:', res.data._id);

    // 6. Create Note
    console.log('\n--- 6. Testing Note Creation ---');
    res = await axios.post(`${API_URL}/notes`, {
      title: 'Test Note',
      content: '<p>This is a test note.</p>',
      folderId: folderId
    }, { headers });
    console.log('✅ Note created with ID:', res.data._id);

    // Clean up
    fs.unlinkSync('dummy.txt');
    console.log('\n🎉 All backend API features tested successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

runTests();
