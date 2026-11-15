const db = require('../config/db');

function normalize(row) {
  if (!row) return null;

  const rawCriteria = Array.isArray(row.eligibility_criteria) ? row.eligibility_criteria : [];
  const rawDocs = Array.isArray(row.required_documents) ? row.required_documents : [];

  let minCgpa = null;
  let minPercentage = null;
  let maxIncome = null;

  for (const c of rawCriteria) {
    const type = (c.criterion_type || '').toLowerCase();
    const val = c.criterion_value?.value ?? c.criterion_value;
    if (type.includes('cgpa')) {
      minCgpa = Number(val);
    } else if (type.includes('percentage') || type.includes('marks')) {
      minPercentage = Number(val);
      if (!minCgpa && Number(val) > 0) {
        minCgpa = Number(val) > 10 ? Number((Number(val) / 10).toFixed(1)) : Number(val);
      }
    } else if (type.includes('income')) {
      maxIncome = Number(val);
    }
  }

  // Handle explicit overrides if present on row
  if (row.min_cgpa !== undefined && row.min_cgpa !== null) minCgpa = Number(row.min_cgpa);
  if (row.max_income !== undefined && row.max_income !== null) maxIncome = Number(row.max_income);

  const rawStatus = (row.status || 'published').toLowerCase();
  const normalizedStatus = (rawStatus === 'published' || rawStatus === 'active') ? 'open' : rawStatus;

  const id = String(row.scholarship_id || row.id);
  const title = row.title || row.name || 'Scholarship';
  const amount = Number(row.award_amount ?? row.amount ?? 0);
  const deadline = row.application_end_date || row.deadline || null;
  const category = row.category_name || row.category || 'General';

  return {
    ...row,
    id,
    scholarship_id: id,
    name: title,
    title,
    amount,
    award_amount: amount,
    category,
    category_name: category,
    deadline,
    application_end_date: deadline,
    application_start_date: row.application_start_date || null,
    status: normalizedStatus,
    raw_status: row.status,
    min_cgpa: minCgpa,
    min_percentage: minPercentage,
    max_income: maxIncome,
    total_slots: row.total_slots ? Number(row.total_slots) : null,
    department: row.department || null,
    eligibility_criteria: rawCriteria.map(c => ({
      criterion_id: c.criterion_id,
      criterion_type: c.criterion_type,
      operator: c.operator,
      criterion_value: c.criterion_value,
      description: c.description,
      is_mandatory: c.is_mandatory !== false
    })),
    required_documents: rawDocs.map(d => ({
      document_requirement_id: d.document_requirement_id,
      document_name: d.document_name || d.name,
      description: d.description,
      is_mandatory: d.is_mandatory !== false,
      allowed_file_types: d.allowed_file_types || ['pdf', 'jpg', 'jpeg', 'png'],
      max_file_size_mb: d.max_file_size_mb || 5
    }))
  };
}

const BASE_QUERY = `
  SELECT
    s.scholarship_id,
    s.scholarship_id AS id,
    s.title,
    s.title AS name,
    s.scholarship_code,
    s.description,
    s.provider_name,
    s.award_amount,
    s.award_amount AS amount,
    s.currency,
    s.academic_year,
    s.total_slots,
    s.application_start_date,
    s.application_end_date,
    s.application_end_date AS deadline,
    s.status,
    s.official_website,
    s.created_at,
    s.updated_at,
    COALESCE(c.category_name, 'General') AS category_name,
    COALESCE(c.category_name, 'General') AS category,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'criterion_id', ec.criterion_id,
            'criterion_type', ec.criterion_type,
            'operator', ec.operator,
            'criterion_value', ec.criterion_value,
            'description', ec.description,
            'is_mandatory', ec.is_mandatory
          )
        )
        FROM scholarship_eligibility_criteria ec
        WHERE ec.scholarship_id = s.scholarship_id
      ),
      '[]'::json
    ) AS eligibility_criteria,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'document_requirement_id', rd.document_requirement_id,
            'document_name', rd.document_name,
            'description', rd.description,
            'is_mandatory', rd.is_mandatory,
            'allowed_file_types', rd.allowed_file_types,
            'max_file_size_mb', rd.max_file_size_mb
          )
        )
        FROM scholarship_required_documents rd
        WHERE rd.scholarship_id = s.scholarship_id
      ),
      '[]'::json
    ) AS required_documents
  FROM scholarships s
  LEFT JOIN scholarship_categories c ON s.category_id = c.category_id
`;

async function list(filters = {}) {
  const where = [];
  const values = [];

  const add = (sql, value) => {
    values.push(value);
    where.push(sql.replace('?', `$${values.length}`));
  };

  if (filters.category) {
    add('(LOWER(c.category_name) = LOWER(?) OR s.category_id::text = ?)', filters.category);
    // Duplicate value for second placeholder
    values.push(filters.category);
    where[where.length - 1] = `(LOWER(c.category_name) = LOWER($${values.length - 1}) OR s.category_id::text = $${values.length})`;
  }

  if (filters.status) {
    const st = filters.status.toLowerCase();
    if (st === 'open' || st === 'published' || st === 'active') {
      where.push("s.status IN ('published', 'open', 'ACTIVE')");
    } else {
      add('s.status = ?', filters.status);
    }
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const p = `$${values.length}`;
    where.push(`(s.title ILIKE ${p} OR s.description ILIKE ${p} OR s.scholarship_code ILIKE ${p} OR c.category_name ILIKE ${p})`);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // Check for cursor-based pagination
  if (filters.cursor) {
    const cursorId = Number(filters.cursor) || 0;
    values.push(cursorId);
    const cursorClause = clause ? `${clause} AND s.scholarship_id > $${values.length}` : `WHERE s.scholarship_id > $${values.length}`;
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    values.push(limit);

    const result = await db.query(
      `${BASE_QUERY} ${cursorClause} ORDER BY s.scholarship_id ASC LIMIT $${values.length}`,
      values
    );

    const items = result.rows.map(normalize);
    const nextCursor = items.length === limit ? items[items.length - 1].scholarship_id : null;

    return {
      items,
      pagination: {
        cursor: filters.cursor,
        nextCursor,
        limit,
        hasMore: !!nextCursor
      }
    };
  }

  // Standard offset-based pagination
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM scholarships s
    LEFT JOIN scholarship_categories c ON s.category_id = c.category_id
    ${clause}
  `;
  const count = await db.query(countQuery, values);
  const total = count.rows[0]?.total || 0;

  const dataQuery = `
    ${BASE_QUERY}
    ${clause}
    ORDER BY s.created_at DESC, s.scholarship_id DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;
  const result = await db.query(dataQuery, [...values, limit, offset]);

  return {
    items: result.rows.map(normalize),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function getById(id) {
  // If id is not a numeric bigint or valid UUID, return null (404) safely instead of PostgreSQL syntax error
  if (!/^\d+$/.test(String(id).trim())) {
    return null;
  }
  const result = await db.query(`${BASE_QUERY} WHERE s.scholarship_id = $1`, [id]);
  return result.rows[0] ? normalize(result.rows[0]) : null;
}

async function create(data) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Resolve category_id
    let categoryId = data.category_id;
    if (!categoryId && data.category) {
      const catRes = await client.query(
        'SELECT category_id FROM scholarship_categories WHERE LOWER(category_name) = LOWER($1)',
        [data.category.trim()]
      );
      if (catRes.rows.length) {
        categoryId = catRes.rows[0].category_id;
      } else {
        const newCat = await client.query(
          'INSERT INTO scholarship_categories (category_name, description) VALUES ($1, $2) RETURNING category_id',
          [data.category.trim(), `${data.category} scholarships`]
        );
        categoryId = newCat.rows[0].category_id;
      }
    }

    const title = (data.title || data.name || '').trim();
    const amount = Number(data.award_amount ?? data.amount ?? 0);
    const deadline = data.application_end_date || data.deadline;
    const code = data.scholarship_code || `SCH-${Date.now().toString(36).toUpperCase()}`;

    // Map status: DB requires ('draft', 'published', 'closed', 'archived')
    let dbStatus = (data.status || 'published').toLowerCase();
    if (dbStatus === 'open' || dbStatus === 'active') dbStatus = 'published';
    if (!['draft', 'published', 'closed', 'archived'].includes(dbStatus)) {
      dbStatus = 'published';
    }

    const insertSql = `
      INSERT INTO scholarships (
        category_id, scholarship_code, title, description, provider_name,
        award_amount, currency, academic_year, total_slots,
        application_start_date, application_end_date, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING scholarship_id
    `;
    const sRes = await client.query(insertSql, [
      categoryId || 1,
      code,
      title,
      data.description || '',
      data.provider_name || 'ApexScholar Foundation',
      amount,
      data.currency || 'INR',
      data.academic_year || '2026-2027',
      data.total_slots ? Number(data.total_slots) : null,
      data.application_start_date || new Date().toISOString().split('T')[0],
      deadline,
      dbStatus,
      data.created_by || 'admin'
    ]);

    const newScholarshipId = sRes.rows[0].scholarship_id;

    // Insert criteria
    const criteriaToInsert = [];
    if (Array.isArray(data.eligibility_criteria) && data.eligibility_criteria.length > 0) {
      for (const c of data.eligibility_criteria) {
        criteriaToInsert.push({
          type: c.criterion_type || 'general',
          op: c.operator || '>=',
          val: c.criterion_value || { value: c.value },
          desc: c.description || '',
          mandatory: c.is_mandatory !== false
        });
      }
    } else {
      if (data.min_cgpa !== undefined && data.min_cgpa !== null) {
        criteriaToInsert.push({
          type: 'minimum_cgpa',
          op: '>=',
          val: { value: Number(data.min_cgpa) },
          desc: `Minimum CGPA of ${data.min_cgpa}`,
          mandatory: true
        });
      }
      if (data.max_income !== undefined && data.max_income !== null) {
        criteriaToInsert.push({
          type: 'annual_family_income',
          op: '<=',
          val: { value: Number(data.max_income) },
          desc: `Annual family income up to ₹${data.max_income}`,
          mandatory: true
        });
      }
    }

    for (const c of criteriaToInsert) {
      await client.query(
        `INSERT INTO scholarship_eligibility_criteria
         (scholarship_id, criterion_type, operator, criterion_value, description, is_mandatory)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newScholarshipId, c.type, c.op, JSON.stringify(c.val), c.desc, c.mandatory]
      );
    }

    // Insert required documents
    const docsToInsert = [];
    if (Array.isArray(data.required_documents) && data.required_documents.length > 0) {
      for (const d of data.required_documents) {
        docsToInsert.push({
          name: d.document_name || d.name || 'Document',
          desc: d.description || '',
          mandatory: d.is_mandatory !== false,
          types: d.allowed_file_types || ['pdf', 'jpg', 'jpeg', 'png'],
          maxSize: d.max_file_size_mb || 5
        });
      }
    } else {
      docsToInsert.push(
        { name: 'Income Certificate', desc: 'Valid income certificate', mandatory: true, types: ['pdf', 'jpg', 'png'], maxSize: 5 },
        { name: 'Marksheet', desc: 'Latest academic marksheet', mandatory: true, types: ['pdf', 'jpg', 'png'], maxSize: 5 },
        { name: 'Identity Proof', desc: 'Aadhaar Card or Student ID', mandatory: true, types: ['pdf', 'jpg', 'png'], maxSize: 5 }
      );
    }

    let order = 1;
    for (const d of docsToInsert) {
      await client.query(
        `INSERT INTO scholarship_required_documents
         (scholarship_id, document_name, description, is_mandatory, allowed_file_types, max_file_size_mb, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newScholarshipId, d.name, d.desc, d.mandatory, d.types, d.maxSize, order++]
      );
    }

    await client.query('COMMIT');
    return await getById(newScholarshipId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function update(id, data) {
  const current = await getById(id);
  if (!current) return null;

  const title = (data.title || data.name || current.title).trim();
  const amount = Number(data.award_amount ?? data.amount ?? current.amount);
  const deadline = data.application_end_date || data.deadline || current.deadline;
  const description = data.description !== undefined ? data.description : current.description;

  let dbStatus = current.raw_status;
  if (data.status) {
    const s = data.status.toLowerCase();
    if (s === 'open' || s === 'active') dbStatus = 'published';
    else if (['draft', 'published', 'closed', 'archived'].includes(s)) dbStatus = s;
  }

  await db.query(
    `UPDATE scholarships SET
      title = $1, description = $2, award_amount = $3,
      application_end_date = $4, status = $5, updated_at = NOW()
     WHERE scholarship_id = $6`,
    [title, description, amount, deadline, dbStatus, id]
  );

  return await getById(id);
}

async function updateStatus(id, status) {
  let dbStatus = status.toLowerCase();
  if (dbStatus === 'open' || dbStatus === 'active') dbStatus = 'published';
  if (!['draft', 'published', 'closed', 'archived'].includes(dbStatus)) {
    throw new Error(`Invalid status: ${status}. Must be draft, published, closed, or archived.`);
  }

  const result = await db.query(
    'UPDATE scholarships SET status = $1, updated_at = NOW() WHERE scholarship_id = $2 RETURNING scholarship_id',
    [dbStatus, id]
  );
  if (!result.rows[0]) return null;
  return await getById(id);
}

async function remove(id) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM scholarship_required_documents WHERE scholarship_id = $1', [id]);
    await client.query('DELETE FROM scholarship_eligibility_criteria WHERE scholarship_id = $1', [id]);
    await client.query('DELETE FROM scholarship_benefits WHERE scholarship_id = $1', [id]);
    await client.query('DELETE FROM scholarship_status_history WHERE scholarship_id = $1', [id]);
    await client.query('DELETE FROM scholarship_audit_logs WHERE scholarship_id = $1', [id]);
    const res = await client.query('DELETE FROM scholarships WHERE scholarship_id = $1 RETURNING scholarship_id', [id]);
    await client.query('COMMIT');
    return res.rowCount > 0;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { list, getById, create, update, updateStatus, remove, normalize };
