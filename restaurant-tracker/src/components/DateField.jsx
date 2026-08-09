import { useRef } from 'react';
import { Calendar } from 'lucide-react';

const toDisplayDate = (isoDate) => {
  if (!isoDate) return '';
  const dateStr = isoDate.includes('T') ? isoDate.split('T')[0] : isoDate;
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
};

const parseDisplayDate = (display) => {
  if (!display) return '';
  const match = String(display).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return '';
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3];
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return '';
  }
  return `${year}-${month}-${day}`;
};

const DateField = ({ name, value, onChange, placeholder = 'DD/MM/YYYY' }) => {
  const pickerRef = useRef(null);

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;

    if (typeof picker.showPicker === 'function') {
      try {
        picker.showPicker();
        return;
      } catch (error) {
        // fall back to focusing below
      }
    }
    picker.focus();
    picker.click();
  };

  return (
    <div className="date-field-wrapper">
      <input
        type="text"
        name={name}
        className="input-field"
        placeholder={placeholder}
        inputMode="numeric"
        value={value}
        onChange={onChange}
      />
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="date-field-native"
        value={parseDisplayDate(value)}
        onChange={(e) => {
          const display = e.target.value ? toDisplayDate(e.target.value) : '';
          onChange({ target: { name, value: display } });
        }}
      />
      <button
        type="button"
        className="date-field-toggle"
        onClick={openPicker}
        aria-label="Open calendar"
        title="Pick a date"
      >
        <Calendar size={16} />
      </button>
    </div>
  );
};

export default DateField;
