-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    uploadimage VARCHAR(255),
    tours INTEGER DEFAULT 0,
    price VARCHAR(100) NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    highlights TEXT,
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    overview TEXT,
    things_to_carry TEXT,
    max_group_size INTEGER,
    age_limit VARCHAR(100),
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dateofmodification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BIT(1) DEFAULT B'0'
);

-- Create weekendtrips table
CREATE TABLE IF NOT EXISTS weekendtrips (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    uploadimage VARCHAR(255),
    tours INTEGER DEFAULT 0,
    price VARCHAR(100) NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    highlights TEXT,
    available_days VARCHAR(255),
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    overview TEXT,
    things_to_carry TEXT,
    max_group_size INTEGER,
    age_limit VARCHAR(100),
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dateofmodification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BIT(1) DEFAULT B'0'
);

-- Create itineraries table
CREATE TABLE IF NOT EXISTS itineraries (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    day_title VARCHAR(255),
    description TEXT,
    meals VARCHAR(255),
    accommodation VARCHAR(255),
    activities TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dateofmodification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted INTEGER DEFAULT 0
);

-- Insert sample data for trips
INSERT INTO trips (title, duration, uploadimage, tours, price, difficulty, highlights, status)
VALUES 
('Himalayan Escape', '5-7 days', 'https://picsum.photos/seed/himalayas/600/400', 15, '₹12,499', 'Moderate', 'Mountain view, Trekking, Local Food', TRUE),
('Goa Beach Tour', '3-4 days', 'https://picsum.photos/seed/goa/600/400', 20, '₹5,999', 'Easy', 'Beach party, Water sports, Sea food', TRUE)
ON CONFLICT DO NOTHING;

-- Insert sample data for weekendtrips
INSERT INTO weekendtrips (title, duration, uploadimage, tours, price, difficulty, highlights, available_days, status)
VALUES 
('Rishikesh Adventure', '2 days', 'https://picsum.photos/seed/rishikesh/600/400', 12, '₹3,499', 'Easy', 'Rafting, Camping, Bonfire', 'Saturday, Sunday', TRUE),
('Mussoorie Gateway', '2 days', 'https://picsum.photos/seed/mussoorie/600/400', 8, '₹2,999', 'Easy', 'Clouds end, Mall road, Waterfall', 'Saturday, Sunday', TRUE)
ON CONFLICT DO NOTHING;
