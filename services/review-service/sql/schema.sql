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
  callback_status TEXT,
  callback_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS callback_status TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS callback_error TEXT;
CREATE INDEX IF NOT EXISTS idx_reviews_student_id ON reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_callback_status ON reviews(callback_status);
CREATE TABLE IF NOT EXISTS review_history (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reviewer_id TEXT,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  remarks TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_review_history_review_id ON review_history(review_id);
