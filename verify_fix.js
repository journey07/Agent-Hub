// verify_fix.js
// Simulates an API call to the Dashboard Brain to verify KST Date Logic and Metadata storage

async function test() {
    const url = 'http://localhost:5001/api/stats';
    const payload = {
        agentId: 'agent-worldlocker-001',
        apiType: 'calculate',
        responseTime: 120,
        isError: false,
        shouldCountApi: true,
        shouldCountTask: true,
        model: 'gemini-pro-vision-verified',
        account: 'verified-admin@example.com',
        apiKey: 'sk-proj-verified-key'
    };

    try {
        console.log('Sending payload:', payload);
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            console.error('Error:', await res.text());
            return;
        }

        const data = await res.json();
        console.log('Updated Stats Response:', data);

        // Verification Checks
        const receivedModel = data.model;
        const receivedAccount = data.account;
        const todayTasks = data.todayTasks; // Should be present due to camelCase mapping

        console.log('--- Verification Results ---');
        console.log(`Model matches? ${receivedModel === 'gemini-pro-vision-verified'} (${receivedModel})`);
        console.log(`Account matches? ${receivedAccount === 'verified-admin@example.com'} (${receivedAccount})`);
        console.log(`todayTasks exists? ${todayTasks !== undefined} (Value: ${todayTasks})`);

    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
