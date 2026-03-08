import { pgTable, text, timestamp, integer, boolean, serial, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  passwordHash: text('password_hash'),
  notifyDelays: boolean('notify_delays').default(true),
  notifyGateChanges: boolean('notify_gate_changes').default(true),
  notifyBoarding: boolean('notify_boarding').default(true),
  notifyCancellations: boolean('notify_cancellations').default(true),
  notifyInboundDelays: boolean('notify_inbound_delays').default(true),
  notifyConnectionRisk: boolean('notify_connection_risk').default(true),
  minDelayMinutes: integer('min_delay_minutes').default(15),
  createdAt: timestamp('created_at').defaultNow(),
})

export const accounts = pgTable('accounts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
})

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const trips = pgTable('trips', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  index('trips_user_id_idx').on(t.userId),
])

export const flightLegs = pgTable('flight_legs', {
  id: serial('id').primaryKey(),
  tripId: integer('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  sequenceNumber: integer('sequence_number').notNull().default(0),
  flightNumber: text('flight_number').notNull(),
  airlineIata: text('airline_iata').notNull(),
  originIata: text('origin_iata').notNull(),
  destinationIata: text('destination_iata').notNull(),
  scheduledDeparture: timestamp('scheduled_departure', { withTimezone: true }).notNull(),
  scheduledArrival: timestamp('scheduled_arrival', { withTimezone: true }).notNull(),
  actualDeparture: timestamp('actual_departure', { withTimezone: true }),
  actualArrival: timestamp('actual_arrival', { withTimezone: true }),
  estimatedDeparture: timestamp('estimated_departure', { withTimezone: true }),
  estimatedArrival: timestamp('estimated_arrival', { withTimezone: true }),
  status: text('status').notNull().default('scheduled'),
  delayMinutes: integer('delay_minutes').default(0),
  aircraftRegistration: text('aircraft_registration'),
  aircraftType: text('aircraft_type'),
  gateDeparture: text('gate_departure'),
  gateArrival: text('gate_arrival'),
  terminalDeparture: text('terminal_departure'),
  terminalArrival: text('terminal_arrival'),
  nextCheckAt: timestamp('next_check_at', { withTimezone: true }),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  index('flight_legs_trip_id_idx').on(t.tripId),
  index('flight_legs_next_check_idx').on(t.nextCheckAt),
])

export const flightStatusHistory = pgTable('flight_status_history', {
  id: serial('id').primaryKey(),
  flightLegId: integer('flight_leg_id').notNull().references(() => flightLegs.id, { onDelete: 'cascade' }),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow(),
  status: text('status').notNull(),
  delayMinutes: integer('delay_minutes').default(0),
  gate: text('gate'),
  terminal: text('terminal'),
  estimatedDeparture: timestamp('estimated_departure', { withTimezone: true }),
  estimatedArrival: timestamp('estimated_arrival', { withTimezone: true }),
  source: text('source').notNull().default('flightaware'),
  rawData: jsonb('raw_data'),
}, (t) => [
  index('fsh_flight_leg_id_idx').on(t.flightLegId),
])

export const inboundLegs = pgTable('inbound_legs', {
  id: serial('id').primaryKey(),
  flightLegId: integer('flight_leg_id').notNull().references(() => flightLegs.id, { onDelete: 'cascade' }),
  inboundFlightNumber: text('inbound_flight_number').notNull(),
  inboundAirline: text('inbound_airline'),
  inboundDate: text('inbound_date').notNull(),
  inboundOriginIata: text('inbound_origin_iata'),
  inboundStatus: text('inbound_status').default('unknown'),
  inboundDelayMinutes: integer('inbound_delay_minutes').default(0),
  inboundScheduledArrival: timestamp('inbound_scheduled_arrival', { withTimezone: true }),
  inboundActualArrival: timestamp('inbound_actual_arrival', { withTimezone: true }),
  inboundEstimatedArrival: timestamp('inbound_estimated_arrival', { withTimezone: true }),
  lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('inbound_legs_flight_leg_id_idx').on(t.flightLegId),
])

export const airportDelays = pgTable('airport_delays', {
  id: serial('id').primaryKey(),
  airportIata: text('airport_iata').notNull(),
  delayType: text('delay_type').notNull(),
  reason: text('reason'),
  avgDelayMinutes: integer('avg_delay_minutes').default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('airport_delays_iata_idx').on(t.airportIata),
])

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('push_subs_user_id_idx').on(t.userId),
])

export const notificationLog = pgTable('notification_log', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  flightLegId: integer('flight_leg_id').references(() => flightLegs.id),
  type: text('type').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow(),
  channel: text('channel').notNull().default('push'),
  payload: jsonb('payload'),
}, (t) => [
  index('notif_log_user_id_idx').on(t.userId),
])

// Relations
export const tripsRelations = relations(trips, ({ many }) => ({
  flightLegs: many(flightLegs),
}))

export const flightLegsRelations = relations(flightLegs, ({ one, many }) => ({
  trip: one(trips, { fields: [flightLegs.tripId], references: [trips.id] }),
  inboundLeg: one(inboundLegs, { fields: [flightLegs.id], references: [inboundLegs.flightLegId] }),
  statusHistory: many(flightStatusHistory),
}))

export const inboundLegsRelations = relations(inboundLegs, ({ one }) => ({
  flightLeg: one(flightLegs, { fields: [inboundLegs.flightLegId], references: [flightLegs.id] }),
}))

export const flightStatusHistoryRelations = relations(flightStatusHistory, ({ one }) => ({
  flightLeg: one(flightLegs, { fields: [flightStatusHistory.flightLegId], references: [flightLegs.id] }),
}))
