import { useState, useRef, useEffect } from 'react';

export default function Dropdown({ value, onChange, options, placeholder = 'Select...', labelKey = 'label', valueKey = 'value', renderOption }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listRef = useRef(null);

  const selected = options.find(o => o[valueKey] === value);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open && listRef.current) {
      const rect = listRef.current.getBoundingClientRect();
      const bottomSpace = window.innerHeight - rect.bottom;
      if (bottomSpace < 0) {
        listRef.current.style.maxHeight = `${Math.min(240, rect.top - 16)}px`;
      }
    }
  }, [open]);

  function handleSelect(val) {
    onChange(val);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-12 px-4 flex items-center justify-between bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md text-left"
      >
        <span className={selected ? 'text-on-surface' : 'text-on-surface-variant'}>
          {selected ? (renderOption ? renderOption(selected) : selected[labelKey]) : placeholder}
        </span>
        <span className={`material-symbols-outlined text-on-surface-variant transition-transform ${open ? 'rotate-180' : ''}`} style={{ fontVariationSettings: "'wght' 300" }}>expand_more</span>
      </button>
      {open && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 z-50 mt-1 bg-surface border border-outline-variant rounded-lg shadow-lg overflow-y-auto"
          style={{ maxHeight: '240px' }}
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-body-sm text-on-surface-variant">No options available</div>
          ) : (
            options.map(o => (
              <button
                key={o[valueKey]}
                type="button"
                onClick={() => handleSelect(o[valueKey])}
                className={`w-full px-4 py-3 text-body-md text-left hover:bg-surface-container-high transition-colors ${value === o[valueKey] ? 'bg-primary-container text-primary' : 'text-on-surface'}`}
              >
                {renderOption ? renderOption(o) : o[labelKey]}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}