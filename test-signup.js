// Test signup with invitation
const testSignup = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Sheriii',
        email: 'sheharbanoofficial@gmail.com',
        password: 'test123',
        accountType: 'user',
        membershipPlan: 'invited',
        inviteToken: 'f7dcd0ff6d574188cf0863983caafdea02c0476fcd35d07bee1c4185c8a9712'
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testSignup();
