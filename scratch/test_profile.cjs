const fs = require('fs');
const path = require('path');
const http = require('http');

const DB_PATH = path.join(__dirname, '..', 'backend', 'database.json');
console.log("Database path resolved to:", DB_PATH);

async function runTests() {
  try {
    console.log("\n--- Starting Registration Flow Tests on Running Server ---");

    // 1. Sign Up
    const signupData = await makeRequest('POST', '/api/auth/signup', {
      name: "Test User",
      email: "test_" + Date.now() + "@example.com",
      password: "TestPassword123!"
    });
    
    console.log("Sign up response user fields:", Object.keys(signupData.user));
    console.log("Sign up response user profilePicture:", signupData.user.profilePicture);
    console.log("Sign up response user profileImage:", signupData.user.profileImage);
    console.log("Sign up response user avatarUrl:", signupData.user.avatarUrl);
    
    const token = signupData.token;

    // 2. Complete Registration (PUT Profile)
    const mockImage = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/";
    const profileUpdateData = await makeRequest('PUT', '/api/users/profile', {
      title: "Software Engineer",
      bio: "Test Bio",
      about: "Test About",
      teaches: ["Coding"],
      wants: ["Design"],
      availability: "Weekdays",
      language: "English",
      experience: "2+ Years",
      profilePicture: mockImage
    }, token);

    console.log("\nProfile update response keys:", Object.keys(profileUpdateData));
    console.log("Profile update response profilePicture length:", profileUpdateData.profilePicture ? profileUpdateData.profilePicture.length : 0);
    console.log("Profile update response profileImage length:", profileUpdateData.profileImage ? profileUpdateData.profileImage.length : 0);
    console.log("Profile update response avatarUrl length:", profileUpdateData.avatarUrl ? profileUpdateData.avatarUrl.length : 0);

    // 3. GET Profile Details
    const freshProfile = await makeRequest('GET', '/api/users/profile', null, token);
    console.log("\nFresh GET Profile response keys:", Object.keys(freshProfile));
    console.log("Fresh GET Profile profilePicture length:", freshProfile.profilePicture ? freshProfile.profilePicture.length : 0);
    console.log("Fresh GET Profile profileImage length:", freshProfile.profileImage ? freshProfile.profileImage.length : 0);
    console.log("Fresh GET Profile avatarUrl length:", freshProfile.avatarUrl ? freshProfile.avatarUrl.length : 0);

    // 4. Inspect Database File Directly
    const dbContent = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const savedUser = dbContent.users.find(u => u.id === signupData.user.id);
    console.log("\nDirect DB Inspection saved user keys:", Object.keys(savedUser));
    console.log("Direct DB Saved profilePicture length:", savedUser.profilePicture ? savedUser.profilePicture.length : 0);
    console.log("Direct DB Saved profileImage length:", savedUser.profileImage ? savedUser.profileImage.length : 0);
    console.log("Direct DB Saved avatarUrl length:", savedUser.avatarUrl ? savedUser.avatarUrl.length : 0);

    console.log("\n--- Tests Completed Successfully ---");
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    process.exit(0);
  }
}

runTests();

function makeRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject({ status: res.statusCode, error: parsed });
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject({ status: res.statusCode, error: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (body) {
      req.write(postData);
    }
    req.end();
  });
}
