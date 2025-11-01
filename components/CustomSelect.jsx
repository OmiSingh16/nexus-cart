import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from 'lucide-react';

const CustomSelect = ({ value, onChange, options, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="border border-slate-300 rounded-xl px-4 py-3 text-sm w-full text-left bg-white flex justify-between items-center hover:border-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <span className="truncate">{selectedOption?.label || 'Select...'}</span>
        <ChevronDownIcon 
          size={16} 
          className={`flex-shrink-0 ml-2 transform transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-sm text-left hover:bg-slate-50 transition-colors active:bg-slate-100 ${
                option.value === value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700'
              } ${
                index === 0 ? 'rounded-t-xl' : ''
              } ${
                index === options.length - 1 ? 'rounded-b-xl' : ''
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;