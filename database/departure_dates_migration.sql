-- Create trip_departure_dates table to support multiple departure dates for each trip
CREATE TABLE IF NOT EXISTS trip_departure_dates (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    trip_type VARCHAR(50) NOT NULL, -- 'normal' or 'weekend'
    departure_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted INTEGER DEFAULT 0
);

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_trip_dates ON trip_departure_dates(trip_id, trip_type);
