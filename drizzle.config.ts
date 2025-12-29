import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export default {
    schema: [
        './src/lib/db/schema-users.ts',
        './src/lib/db/schema-booking.ts',
        './src/lib/db/schema-session.ts',
        './src/lib/db/schema.ts'
    ],
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
} satisfies Config;
