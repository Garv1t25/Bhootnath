import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './PasswordField.css';

const PasswordField = ({ value, onChange, placeholder, required = false, minLength = 0, autoComplete = 'new-password' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-field-wrapper">
      <input
        required={required}
        minLength={minLength}
        type={isVisible ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="password-field-toggle"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        title={isVisible ? 'Hide password' : 'Show password'}
      >
        {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

export default PasswordField;
