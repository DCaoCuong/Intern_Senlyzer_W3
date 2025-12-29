import { pgTable, uuid, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';

/**
 * REFERENCE ONLY - These tables already exist in Supabase (Booking system)
 * We're defining them here for Drizzle ORM type inference and relationships
 */

export const clinics = pgTable('clinics', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    description: text('description'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const services = pgTable('services', {
    id: uuid('id').primaryKey().defaultRandom(),
    clinic_id: uuid('clinic_id').references(() => clinics.id, { onDelete: 'cascade' }),
    patient_name: varchar('patient_name', { length: 255 }).notNull(),
    price: integer('price'),
    description: text('description'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const clinic_services = pgTable('clinic_services', {
    id: uuid('id').primaryKey().defaultRandom(),
    clinic_id: uuid('clinic_id').references(() => clinics.id, { onDelete: 'cascade' }),
    patient_name: varchar('patient_name', { length: 255 }).notNull(),
    gender: varchar('gender', { length: 20 }),
    booking_date: timestamp('booking_date').notNull(),
    booking_time: varchar('booking_time', { length: 50 }),
    status: varchar('status', { length: 50 }).default('pending'),
    service_id: uuid('service_id').references(() => services.id),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type Clinic = typeof clinics.$inferSelect;
export type Service = typeof services.$inferSelect;
export type ClinicService = typeof clinic_services.$inferSelect;
