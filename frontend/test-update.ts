const SONICJS_API_URL = 'https://api.carreras2.strydpanama.com';
const SONICJS_API_EMAIL = 'ricardosanjurg@gmail.com';
const SONICJS_API_PASSWORD = '12345ica';

async function testUpdate() {
  console.log('Testing SonicJS Update Pipeline');
  console.log(`URL: ${SONICJS_API_URL}, User: ${SONICJS_API_EMAIL}`);
  
  try {
    // 1. Login
    console.log('\n1. Logging in...');
    const loginRes = await fetch(`${SONICJS_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: SONICJS_API_EMAIL, password: SONICJS_API_PASSWORD })
    });
    
    if (!loginRes.ok) {
      console.log('Login failed:', await loginRes.text());
      return;
    }
    const loginData = await loginRes.json();
    const token = loginData.token || loginData.accessToken;
    console.log('Login successful');

    // 2. Fetch Races
    console.log('\n2. Fetching races...');
    const racesRes = await fetch(`${SONICJS_API_URL}/api/collections/races/content`, {
      headers: { 'Content-Type': 'application/json' } // GET might not need auth
    });
    
    if (!racesRes.ok) {
      console.log('Fetch races failed:', await racesRes.text());
      return;
    }
    const racesData = await racesRes.json();
    if (!racesData.data || racesData.data.length === 0) {
      console.log('No races found to test');
      return;
    }
    
    const targetRace = racesData.data[0];
    console.log(`Selected Race: ${targetRace.title} (ID: ${targetRace.id}, Collection: ${targetRace.collectionId || targetRace.collection_id})`);
    
    // 3. Update Race timerStart
    const newTimerStart = Math.floor(Date.now() / 1000);
    console.log(`\n3. Updating timerStart to: ${newTimerStart}...`);
    
    const updatedData = { ...targetRace.data, timerStart: newTimerStart, status: 'active' };
    
    const payload = {
      id: targetRace.id,
      collection_id: targetRace.collectionId || targetRace.collection_id,
      title: targetRace.title,
      status: 'published',
      data: updatedData
    };
    
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const updateRes = await fetch(`${SONICJS_API_URL}/api/content/${targetRace.id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!updateRes.ok) {
      console.log('Update failed:', updateRes.status, await updateRes.text());
      return;
    }
    
    const updateResult = await updateRes.json();
    console.log('Update Success!', updateResult);
    
    // 4. Verify Update
    console.log('\n4. Verifying update...');
    const verifyRes = await fetch(`${SONICJS_API_URL}/api/content/${targetRace.id}`);
    const verifyData = await verifyRes.json();
    
    if (verifyData.data?.timerStart === newTimerStart) {
      console.log('VERIFICATION PASSED: Database has the new value.');
    } else {
      console.log('VERIFICATION FAILED: Database value did not update!', verifyData.data?.timerStart);
    }
    
  } catch (err) {
    console.error('Test crashed:', err);
  }
}

testUpdate();
