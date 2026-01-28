async function testAPI() {
  try {
    console.log('Testing GET...');
    const getResponse = await fetch('http://localhost:3000/api/sync-transactions');
    const getText = await getResponse.text();
    console.log('GET Response status:', getResponse.status);
    console.log('GET Response text (first 500 chars):', getText.substring(0, 500));

    console.log('\nTesting POST...');
    const postResponse = await fetch('http://localhost:3000/api/sync-transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: "2026-01-01",
        endDate: "2026-01-10"
      })
    });
    const postText = await postResponse.text();
    console.log('POST Response status:', postResponse.status);
    console.log('POST Response text (first 500 chars):', postText.substring(0, 500));
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();