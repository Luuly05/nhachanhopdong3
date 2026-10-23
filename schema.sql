-- Database Schema for Ocean Deadline Tracker
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(50) UNIQUE NOT NULL,
    domain_name VARCHAR(255) NOT NULL,
    order_type VARCHAR(100) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    deadline_at TIMESTAMPTZ NOT NULL,
    processing_status VARCHAR(50) DEFAULT 'new',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Checklists Table
CREATE TABLE IF NOT EXISTS document_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    document_type VARCHAR(255) NOT NULL,
    document_status VARCHAR(50) DEFAULT 'missing',
    is_required BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Logs Table
CREATE TABLE IF NOT EXISTS contact_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    contacted_at TIMESTAMPTZ DEFAULT NOW(),
    channel VARCHAR(50) NOT NULL,
    result VARCHAR(50) NOT NULL,
    note TEXT,
    next_contact_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deadline Alerts Table
CREATE TABLE IF NOT EXISTS deadline_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    alert_date TIMESTAMPTZ DEFAULT NOW(),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ
);
