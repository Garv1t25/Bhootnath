import React from 'react';
import { Plus } from 'lucide-react';
import './FloatingActionButton.css';

const FloatingActionButton = ({ onClick }) => {
  return (
    <button className="fab btn-primary" onClick={onClick}>
      <Plus size={24} />
    </button>
  );
};

export default FloatingActionButton;
