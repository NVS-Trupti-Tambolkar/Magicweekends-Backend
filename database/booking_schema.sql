-- ============================================
-- Booking System Database Schema
-- Database: PostgreSQL (Neon)
-- ============================================

-- Create ENUM types for better data integrity
CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE booking_status_enum AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE trip_type_enum AS ENUM ('normal', 'weekend');
CREATE TYPE payment_method_enum AS ENUM ('paytm', 'gpay', 'bank_transfer', 'cash');

-- ============================================
-- Main Bookings Table
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    
    -- Trip reference
    trip_id INTEGER NOT NULL,
    trip_type trip_type_enum NOT NULL,
    
    -- Customer details
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    
    -- Booking details
    travel_date DATE NOT NULL,
    number_of_people INTEGER NOT NULL CHECK (number_of_people > 0),
    
    -- Pricing
    price_per_person NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    
    -- Payment information
    payment_method payment_method_enum,
    payment_status payment_status_enum DEFAULT 'pending',
    transaction_id VARCHAR(255),
    payment_date TIMESTAMP,
    
    -- Booking state
    booking_status booking_status_enum DEFAULT 'pending',
    
    -- Traveler details (stored as JSONB for flexibility)
    -- Example: [{"name": "John Doe", "age": 30, "gender": "male", "id_proof": "Passport"}]
    travelers_data JSONB,
    
    -- Special requests
    special_request TEXT,
    
    -- System fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bookings_trip_lookup 
    ON bookings(trip_id, trip_type) 
    WHERE deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_bookings_email 
    ON bookings(email) 
    WHERE deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_bookings_status 
    ON bookings(booking_status) 
    WHERE deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_bookings_created_at 
    ON bookings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_travel_date 
    ON bookings(travel_date) 
    WHERE deleted = FALSE;

-- ============================================
-- View for Active Bookings
-- ============================================
CREATE OR REPLACE VIEW bookings_view AS
SELECT
    id,
    trip_id,
    trip_type,
    full_name,
    email,
    phone,
    travel_date,
    number_of_people,
    total_amount,
    payment_method,
    payment_status,
    booking_status,
    created_at
FROM bookings
WHERE deleted = FALSE;

-- ============================================
-- Trigger Function to Update Timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger to Auto-Update updated_at
-- ============================================
DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================
-- INSERT INTO bookings (
--     trip_id, 
--     trip_type, 
--     full_name, 
--     email, 
--     phone, 
--     travel_date, 
--     number_of_people, 
--     price_per_person, 
--     total_amount,
--     payment_method,
--     travelers_data,
--     special_request
-- ) VALUES (
--     1,
--     'normal',
--     'John Doe',
--     'john.doe@example.com',
--     '+91-9876543210',
--     '2026-03-15',
--     2,
--     5000.00,
--     10000.00,
--     'paytm',
--     '[
--         {"name": "John Doe", "age": 30, "gender": "male", "id_proof": "Passport"},
--         {"name": "Jane Doe", "age": 28, "gender": "female", "id_proof": "Aadhar"}
--     ]'::jsonb,
--     'Need vegetarian meals'
-- );
