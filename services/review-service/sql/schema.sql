CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL UNIQUE,
  student_id TEXT NOT NULL,
  scholarship_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  eligible BOOLEAN,
  eligibility_remarks TEXT,
  decision TEXT,
  decision_remarks TEXT,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_student_id ON reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
