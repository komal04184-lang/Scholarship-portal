import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Building2,
  MapPin,
  BookOpen,
  Award,
  Plus,
  RotateCcw,
  GraduationCap,
} from 'lucide-react';
import ScholarshipCard from '../components/ScholarshipCard';
import ScholarshipDetailModal from '../components/ScholarshipDetailModal';
import ApplyModal from '../components/ApplyModal';
import { getScholarships } from '../services/api';

const DISCIPLINES = [
  'Engineering & Technology',
  'Computer Science / IT',
  'Sciences & Mathematics',
  'Business & Management',
  'Medical & Healthcare',
  'Arts & Humanities',
];

const LOCATIONS = [
  'All India',
  'Maharashtra',
  'Delhi NCR',
  'Karnataka',
  'Tamil Nadu',
  'Uttar Pradesh',
  'International / Abroad',
];

const DEGREE_LEVELS = [
  "Master's",
  "Bachelor's / Undergraduate",
  "Doctoral / Ph.D.",
];

export default function CatalogView({ user, onRequireAuth, onNavigateDashboard }) {
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [universitySearch, setUniversitySearch] = useState('');
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDegrees, setSelectedDegrees] = useState([]);
  const [minGpaFilter, setMinGpaFilter] = useState('');
  const [maxIncomeFilter, setMaxIncomeFilter] = useState('');

  // Sidebar accordion states
  const [openSections, setOpenSections] = useState({
    university: true,
    location: true,
    discipline: true,
    category: true,
    degree: true,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Subtabs
  const [activeSubtab, setActiveSubtab] = useState('Scholarships');

  // Modals
  const [selectedScholarship, setSelectedScholarship] = useState(null);
  const [applyingScholarship, setApplyingScholarship] = useState(null);

  useEffect(() => {
    loadScholarships();
  }, [selectedCategory, minGpaFilter, maxIncomeFilter]);

  const loadScholarships = async () => {
    setLoading(true);
    try {
      const data = await getScholarships({
        category: selectedCategory !== 'All' ? selectedCategory : '',
        minGpa: minGpaFilter,
        maxIncome: maxIncomeFilter,
      });
      setScholarships(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching scholarships:', err);
      setScholarships([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = (scholarship) => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setApplyingScholarship(scholarship);
  };

  const toggleLocation = (loc) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((item) => item !== loc) : [...prev, loc]
    );
  };

  const toggleDiscipline = (disc) => {
    setSelectedDisciplines((prev) =>
      prev.includes(disc) ? prev.filter((item) => item !== disc) : [...prev, disc]
    );
  };

  const toggleDegree = (deg) => {
    setSelectedDegrees((prev) =>
      prev.includes(deg) ? prev.filter((item) => item !== deg) : [...prev, deg]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setUniversitySearch('');
    setSelectedLocations([]);
    setSelectedDisciplines([]);
    setSelectedCategory('All');
    setSelectedDegrees([]);
    setMinGpaFilter('');
    setMaxIncomeFilter('');
  };

  // Safe client-side multi-criteria filtering
  const filteredScholarships = (scholarships || []).filter((s) => {
    if (!s) return false;

    // Search Query (title, description, dept, country)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const title = (s.title || s.name || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const dept = (s.department || s.eligible_course || '').toLowerCase();
      const cat = (s.category || s.eligible_category || '').toLowerCase();
      if (!title.includes(q) && !desc.includes(q) && !dept.includes(q) && !cat.includes(q)) {
        return false;
      }
    }

    // University search
    if (universitySearch.trim()) {
      const uq = universitySearch.toLowerCase().trim();
      const title = (s.title || s.name || '').toLowerCase();
      const dept = (s.department || '').toLowerCase();
      if (!title.includes(uq) && !dept.includes(uq)) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory && selectedCategory !== 'All') {
      const cat = (s.category || s.eligible_category || '').toLowerCase();
      const title = (s.title || s.name || '').toLowerCase();
      const sel = selectedCategory.toLowerCase();
      const matchesCat = cat.includes(sel) || title.includes(sel);
      if (!matchesCat) return false;
    }

    // Discipline filter
    if (selectedDisciplines.length > 0) {
      const dept = (s.department || s.eligible_course || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const matches = selectedDisciplines.some((d) => {
        const dl = d.toLowerCase();
        return dept.includes(dl) || desc.includes(dl) || dl.includes('technology') && dept.includes('engineering');
      });
      if (!matches) return false;
    }

    // Degree level filter
    if (selectedDegrees.length > 0) {
      const course = (s.eligible_course || s.department || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      const matches = selectedDegrees.some((deg) => {
        if (deg === "Master's") return course.includes('master') || course.includes('m.tech') || course.includes('m.sc') || desc.includes('master');
        if (deg.includes('Bachelor')) return course.includes('bachelor') || course.includes('b.tech') || course.includes('undergrad') || desc.includes('bachelor');
        if (deg.includes('Ph.D')) return course.includes('phd') || desc.includes('phd') || desc.includes('research');
        return true;
      });
      if (!matches) return false;
    }

    return true;
  });

  return (
    <div style={{ background: '#F8F9FA', minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* ========================================================================= */}
      {/* 1. BLUE HERO BANNER (Directly matching Studyportals screenshot)           */}
      {/* ========================================================================= */}
      <section style={{
        background: '#0E62C9',
        padding: '1.75rem 1.5rem',
        boxShadow: '0 2px 8px rgba(14, 98, 201, 0.15)',
      }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
          {/* Prominent Centered Search Box */}
          <div style={{
            maxWidth: '820px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            background: '#FFFFFF',
            borderRadius: 'var(--radius-full)',
            padding: '4px 6px 4px 1.5rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
          }}>
            <input
              type="text"
              placeholder="Search by Study & Country"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                padding: '0.65rem 0.5rem',
                fontSize: '1.02rem',
                color: '#0F172A',
                outline: 'none',
              }}
            />
            {/* Orange/Coral Search Button matching screenshot */}
            <button
              onClick={() => {}}
              className="btn btn-orange"
              style={{
                borderRadius: 'var(--radius-full)',
                padding: '0.6rem 1.6rem',
                fontSize: '0.96rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <Search size={16} />
              <span>Search</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTAINER: Breadcrumbs, Header, Alert, Filters & Cards           */}
      {/* ========================================================================= */}
      <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '1.5rem 1.5rem 0' }}>
        {/* Breadcrumbs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.82rem',
          color: '#64748B',
          marginBottom: '1rem',
        }}>
          <span style={{ cursor: 'pointer', color: '#64748B' }}>Home</span>
          <span>›</span>
          <span style={{ fontWeight: 600, color: '#334155' }}>Scholarships</span>
        </div>

        {/* Page Title */}
        <h1 style={{
          fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)',
          fontWeight: 800,
          color: '#0F172A',
          letterSpacing: '-0.02em',
          marginBottom: '1rem',
        }}>
          Scholarships for Master's students
        </h1>

        {/* Subtabs directly under title: Programmes, Universities, Scholarships */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '1.5rem',
        }}>
          {['Programmes', 'Universities', 'Scholarships'].map((tab) => (
            <div
              key={tab}
              onClick={() => setActiveSubtab(tab)}
              style={{
                paddingBottom: '0.65rem',
                cursor: 'pointer',
                fontSize: '0.98rem',
                fontWeight: activeSubtab === tab ? 700 : 500,
                color: activeSubtab === tab ? '#0E62C9' : '#64748B',
                borderBottom: activeSubtab === tab ? '3px solid #0E62C9' : '3px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Results Count */}
        <div style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          color: '#0F172A',
          marginBottom: '1rem',
        }}>
          {filteredScholarships.length} Scholarships
        </div>

        {/* ========================================================================= */}
        {/* 3. ORANGE/CORAL ALERT BANNER (Directly matching screenshot)              */}
        {/* ========================================================================= */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          padding: '1rem 1.25rem',
          background: '#FFF7ED',
          border: '1px solid #FDBA74',
          borderRadius: '10px',
          marginBottom: '2rem',
          color: '#334155',
          fontSize: '0.9rem',
          lineHeight: 1.45,
        }}>
          {/* Orange round exclamation icon */}
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: '#FA541C',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.88rem',
            fontWeight: 800,
            flexShrink: 0,
          }}>
            !
          </div>
          <div>
            The scholarships listed below are applicable to students of all nationalities.{' '}
            Please{' '}
            <span
              onClick={onRequireAuth}
              style={{
                color: '#0E62C9',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              create an account
            </span>{' '}
            to see personalized results.
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TWO-COLUMN LAYOUT: Sidebar Filters & Scholarship Cards Grid           */}
        {/* ========================================================================= */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: '2rem',
          alignItems: 'start',
        }}>
          {/* LEFT SIDEBAR: Accordion Filters */}
          <aside style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            position: 'sticky',
            top: '5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.65rem', borderBottom: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Filter size={16} color="#0E62C9" /> Filters
              </span>
              <button
                onClick={clearAllFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.78rem',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>

            {/* Accordion 1: University */}
            <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '1.1rem', marginBottom: '1.1rem' }}>
              <div
                onClick={() => toggleSection('university')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  marginBottom: openSections.university ? '0.75rem' : '0',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={16} color="#FA541C" /> University
                </span>
                {openSections.university ? <ChevronUp size={16} color="#94A3B8" /> : <ChevronDown size={16} color="#94A3B8" />}
              </div>

              {openSections.university && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '0.4rem' }}>
                    Search by university
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="University name"
                      value={universitySearch}
                      onChange={(e) => setUniversitySearch(e.target.value)}
                      style={{
                        width: '100%',
                        fontSize: '0.86rem',
                        paddingRight: '2rem',
                        padding: '0.55rem 0.75rem',
                      }}
                    />
                    <Search
                      size={15}
                      color="#94A3B8"
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 2: Location */}
            <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '1.1rem', marginBottom: '1.1rem' }}>
              <div
                onClick={() => toggleSection('location')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  marginBottom: openSections.location ? '0.75rem' : '0',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} color="#FA541C" /> Location
                </span>
                {openSections.location ? <ChevronUp size={16} color="#94A3B8" /> : <ChevronDown size={16} color="#94A3B8" />}
              </div>

              {openSections.location && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {LOCATIONS.map((loc) => (
                    <label
                      key={loc}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.86rem',
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(loc)}
                        onChange={() => toggleLocation(loc)}
                        style={{ accentColor: '#0E62C9' }}
                      />
                      <span>{loc}</span>
                    </label>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#0E62C9', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.25rem' }}>
                    <Plus size={14} /> Add location
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 3: Discipline */}
            <div style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '1.1rem', marginBottom: '1.1rem' }}>
              <div
                onClick={() => toggleSection('discipline')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  marginBottom: openSections.discipline ? '0.75rem' : '0',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen size={16} color="#FA541C" /> Discipline
                </span>
                {openSections.discipline ? <ChevronUp size={16} color="#94A3B8" /> : <ChevronDown size={16} color="#94A3B8" />}
              </div>

              {openSections.discipline && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {DISCIPLINES.map((disc) => (
                    <label
                      key={disc}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.86rem',
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDisciplines.includes(disc)}
                        onChange={() => toggleDiscipline(disc)}
                        style={{ accentColor: '#0E62C9' }}
                      />
                      <span>{disc}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Accordion 4: Degree Level */}
            <div>
              <div
                onClick={() => toggleSection('degree')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  marginBottom: openSections.degree ? '0.75rem' : '0',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <GraduationCap size={16} color="#FA541C" /> Degree Level
                </span>
                {openSections.degree ? <ChevronUp size={16} color="#94A3B8" /> : <ChevronDown size={16} color="#94A3B8" />}
              </div>

              {openSections.degree && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {DEGREE_LEVELS.map((deg) => (
                    <label
                      key={deg}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.86rem',
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDegrees.includes(deg)}
                        onChange={() => toggleDegree(deg)}
                        style={{ accentColor: '#0E62C9' }}
                      />
                      <span>{deg}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT MAIN AREA: 2-Column Grid of Scholarship Cards */}
          <div>
            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: '5rem 2rem',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #E2E8F0',
                  borderTopColor: '#0E62C9',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem',
                }} />
                <p style={{ color: '#64748B', fontSize: '0.95rem' }}>Loading verified scholarships from PostgreSQL...</p>
              </div>
            ) : filteredScholarships.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
              }}>
                <Search size={36} color="#94A3B8" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.2rem', color: '#0F172A', marginBottom: '0.5rem' }}>
                  No matching scholarships found
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                  Try adjusting or clearing your filters to discover other available financial aid awards.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="btn btn-secondary btn-sm"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: '1.5rem',
              }}>
                {filteredScholarships.map((sch) => (
                  <ScholarshipCard
                    key={sch.scholarship_id}
                    scholarship={sch}
                    userProfile={user}
                    onSelect={(s) => setSelectedScholarship(s)}
                    onApply={(s) => handleApplyClick(s)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedScholarship && (
        <ScholarshipDetailModal
          scholarship={selectedScholarship}
          onClose={() => setSelectedScholarship(null)}
          onApply={(s) => {
            setSelectedScholarship(null);
            handleApplyClick(s);
          }}
        />
      )}

      {applyingScholarship && (
        <ApplyModal
          scholarship={applyingScholarship}
          user={user}
          onClose={() => setApplyingScholarship(null)}
          onSuccess={() => {
            setApplyingScholarship(null);
            if (onNavigateDashboard) onNavigateDashboard();
          }}
        />
      )}
    </div>
  );
}
