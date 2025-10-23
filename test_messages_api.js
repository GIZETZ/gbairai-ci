// Test direct de l'API messages avec authentification
async function testMessagesAPI() {
    console.log('Test de l\'API messages...');
    
    try {
        // Premier test : login pour obtenir un cookie valide
        const loginResponse = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'Kouame',
                password: 'password123'
            })
        });

        const cookie = loginResponse.headers.get('set-cookie');
        console.log('Cookie obtenu:', cookie);

        // Test des messages avec le cookie
        const messagesResponse = await fetch('http://localhost:5000/api/conversations/1/messages', {
            headers: {
                'Cookie': cookie
            }
        });

        const messages = await messagesResponse.json();
        console.log('Réponse API messages:');
        console.log('Status:', messagesResponse.status);
        console.log('Nombre de messages:', messages.length);
        console.log('Messages:', JSON.stringify(messages, null, 2));

    } catch (error) {
        console.error('Erreur:', error);
    }
}

testMessagesAPI();