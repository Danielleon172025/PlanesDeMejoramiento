import { getConnection } from './src/config/db.js';
import fs from 'fs';
import path from 'path';

async function seed() {
    try {
        const pool = await getConnection();
        const sqlContent = fs.readFileSync('../05_seed_permissions.sql', 'utf8');

        // Split by GO since mssql driver doesn't support GO batches directly
        const batches = sqlContent.split(/\bGO\b/i).filter(b => b.trim() !== '');

        for (const batch of batches) {
            if (batch.trim()) {
                console.log('Executing batch...');
                await pool.request().query(batch);
            }
        }
        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (e) {
        console.error('Error seeding:', e);
        process.exit(1);
    }
}

seed();
