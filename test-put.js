const run = async () => {
    // login
    const r1 = await fetch('https://api.carreras.strydpanama.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@strydpanama.com', password: 'StrydPanama2026!' })
    });
    const d1 = await r1.json();
    const token = d1.token || d1.accessToken;

    const r2 = await fetch('https://api.carreras.strydpanama.com/api/content/eed7f684-59e7-4156-a574-41776fe3dc6c', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            id: 'eed7f684-59e7-4156-a574-41776fe3dc6c',
            collectionId: 'col-participants-93d1ac21',
            collection_id: 'col-participants-93d1ac21',
            status: 'published',
            title: 'Ricardo Sanjur - General - Dorsal 3 [cb377ad9]',
            data: {
                paymentStatus: 'Pagado',
                transactionId: 'TEST_MANUAL'
            }
        })
    });
    console.log(r2.status);
    console.log(await r2.text());
};
run();
