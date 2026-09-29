-- Military Asset Management System
-- PostgreSQL demo dump
-- All data is fictional.

CREATE TABLE IF NOT EXISTS bases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN','BASE_COMMANDER','LOGISTICS_OFFICER')),
    base_id INT REFERENCES bases(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    base_id INT NOT NULL REFERENCES bases(id),
    equipment_type_id INT NOT NULL REFERENCES equipment_types(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    purchase_date DATE NOT NULL,
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    from_base_id INT NOT NULL REFERENCES bases(id),
    to_base_id INT NOT NULL REFERENCES bases(id),
    equipment_type_id INT NOT NULL REFERENCES equipment_types(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    transfer_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by INT NOT NULL REFERENCES users(id),
    CHECK (from_base_id <> to_base_id)
);

CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    base_id INT NOT NULL REFERENCES bases(id),
    equipment_type_id INT NOT NULL REFERENCES equipment_types(id),
    assigned_to VARCHAR(150) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    assigned_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by INT NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS expenditures (
    id SERIAL PRIMARY KEY,
    base_id INT NOT NULL REFERENCES bases(id),
    equipment_type_id INT NOT NULL REFERENCES equipment_types(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    expenditure_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_by INT NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO bases (id, name, location) VALUES
(1, 'North Base', 'Demo Location A'),
(2, 'Central Base', 'Demo Location B'),
(3, 'South Base', 'Demo Location C')
ON CONFLICT (id) DO NOTHING;

INSERT INTO equipment_types (id, name, category) VALUES
(1, 'Vehicle', 'Transport'),
(2, 'Communications Equipment', 'Communications'),
(3, 'Protective Equipment', 'Safety')
ON CONFLICT (id) DO NOTHING;

-- Demo passwords are bcrypt hashes for the README credentials.
INSERT INTO users (id, name, email, password_hash, role, base_id) VALUES
(1, 'System Admin', 'admin@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN', NULL),
(2, 'Base Commander', 'commander@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC4kqg1uJ5fQ4Xc3p1bS', 'BASE_COMMANDER', 1),
(3, 'Logistics Officer', 'logistics@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC4kqg1uJ5fQ4Xc3p1bS', 'LOGISTICS_OFFICER', 1)
ON CONFLICT (id) DO NOTHING;

-- Example transactions
INSERT INTO purchases (base_id, equipment_type_id, quantity, purchase_date, created_by)
VALUES (1,1,20,CURRENT_DATE,1), (2,2,40,CURRENT_DATE,1);

INSERT INTO transfers (from_base_id, to_base_id, equipment_type_id, quantity, created_by)
VALUES (1,2,1,5,1);

INSERT INTO assignments (base_id, equipment_type_id, assigned_to, quantity, created_by)
VALUES (1,1,'Demo Personnel A',2,1);

INSERT INTO expenditures (base_id, equipment_type_id, quantity, recorded_by)
VALUES (1,3,1,1);

INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
VALUES (1,'DATABASE_SEED','SYSTEM',NULL,'{"source":"demo dump"}');

SELECT setval('bases_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM bases),1));
SELECT setval('users_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM users),1));
SELECT setval('equipment_types_id_seq', GREATEST((SELECT COALESCE(MAX(id),1) FROM equipment_types),1));
