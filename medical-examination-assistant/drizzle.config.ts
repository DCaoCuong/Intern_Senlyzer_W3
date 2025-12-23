import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export default {
    schema: ['./src/lib/db/schema.ts', './src/lib/db/schema-session.ts'],
    out: './drizzle',
    dialect: 'sqlite',
    dbCredentials: {
        url: 'data/db/medical_assistant.db',
    },
} satisfies Config;
