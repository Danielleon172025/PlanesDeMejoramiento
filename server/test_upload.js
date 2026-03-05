import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api';

const testUpload = async () => {
    try {
        // 1. Test Base64 Upload
        console.log('Testing Upload...');
        const base64File = 'data:text/plain;base64,SGVsbG8gV29ybGQ='; // "Hello World"
        const uploadRes = await fetch(`${API_URL}/files/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: base64File,
                filename: 'test.txt',
                mimetype: 'text/plain'
            })
        });

        if (!uploadRes.ok) {
            console.error('Upload failed:', await uploadRes.text());
            return;
        }

        const uploadData = await uploadRes.json();
        console.log('Upload success:', uploadData);

        // 2. Test Download (optional, via URL)
        console.log(`Verify URL: ${API_URL}/files/${uploadData.filename}`);
        const downloadRes = await fetch(`${API_URL}/files/${uploadData.filename}`);
        if (downloadRes.ok) {
            const text = await downloadRes.text();
            console.log('Downloaded content:', text);
            if (text === 'Hello World') {
                console.log('Content match: YES');
            } else {
                console.log('Content match: NO');
            }
        } else {
            console.error('Download failed');
        }

        // 3. Test Create Evaluacion (Mocking an action ID - assumption: action ID 1 exists)
        // If action 1 doesn't exist, this might fail with foreign key error.
        // We can just skip this or try.
        /*
        console.log('Testing Create Evaluacion...');
        const evalRes = await fetch(`${API_URL}/acciones/1/evaluaciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fecha: new Date().toISOString(),
                avance: 50,
                avance_cualitativo: 'Prueba de avance con archivo',
                archivo: uploadData.url
            })
        });
        
        if (evalRes.ok) {
            console.log('Evaluacion created:', await evalRes.json());
        } else {
            console.log('Evaluacion creation failed (expected if Action 1 missing):', await evalRes.text());
        }
        */

    } catch (error) {
        console.error('Test error:', error);
    }
};

testUpload();
