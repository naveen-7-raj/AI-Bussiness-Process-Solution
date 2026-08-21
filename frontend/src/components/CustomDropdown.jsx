import React, { useState, useRef, useEffect } from 'react';

const CustomDropdown = ({ label, options, value, onChange, id, fullWidth = false, style = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const dropdownRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
                const idx = options.findIndex(opt => opt.value === value);
                setFocusedIndex(idx >= 0 ? idx : 0);
            }
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex(prev => (prev + 1) % options.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(prev => (prev - 1 + options.length) % options.length);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < options.length) {
                onChange(options[focusedIndex].value);
                setIsOpen(false);
            }
        }
    };

    return (
        <div style={{ position: 'relative', display: fullWidth ? 'flex' : 'inline-flex', alignItems: 'center', gap: '6px', width: fullWidth ? '100%' : 'auto' }} ref={dropdownRef}>
            {label && (
                <span style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.8, fontWeight: 500 }}>
                    {label}
                </span>
            )}
            <button
                type="button"
                id={id}
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-h)',
                    fontSize: '12px',
                    fontFamily: 'var(--sans)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: 'var(--shadow-subtle)',
                    whiteSpace: 'nowrap',
                    width: fullWidth ? '100%' : 'auto',
                    ...style
                }}
            >
                <span>{selectedOption?.label}</span>
                <span style={{
                    fontSize: '9px',
                    color: 'var(--text)',
                    opacity: 0.7,
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s ease',
                    display: 'inline-block',
                    marginLeft: '4px'
                }}>
                    ▾
                </span>
            </button>

            {isOpen && (
                <ul
                    role="listbox"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: fullWidth ? 0 : 'auto',
                        right: 0,
                        zIndex: 200,
                        minWidth: fullWidth ? '100%' : '135px',
                        width: fullWidth ? '100%' : 'max-content',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        margin: 0,
                        padding: '4px 0',
                        listStyle: 'none',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-dropdown)',
                        fontFamily: 'var(--sans)',
                        fontSize: '12px'
                    }}
                >
                    {options.map((opt, idx) => {
                        const isSelected = opt.value === value;
                        const isFocused = idx === focusedIndex;
                        return (
                            <li
                                key={opt.value}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                onMouseEnter={() => setFocusedIndex(idx)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justify: 'space-between',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    color: 'var(--text-h)',
                                    background: isSelected || isFocused ? 'var(--bg-surface-hover)' : 'transparent',
                                    fontWeight: isSelected ? 600 : 400,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <span>{opt.label}</span>
                                {isSelected && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-h)', marginLeft: '8px' }}>✓</span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default CustomDropdown;
