import React from 'react';
import './Titlebar.css';

export default function Titlebar() {
  const handleMinimize = () => {
    window.electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  return (
    <div className="titlebar">
      <div className="titlebar-drag-region">
        <span className="titlebar-title">Byte</span>
      </div>
      <div className="titlebar-controls">
        <button
          className="titlebar-button titlebar-minimize"
          onClick={handleMinimize}
          title="Minimize"
          aria-label="Minimize"
        >
          <svg viewBox="0 0 10 10">
            <path d="M 0,5 10,5" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </button>
        <button
          className="titlebar-button titlebar-maximize"
          onClick={handleMaximize}
          title="Maximize"
          aria-label="Maximize"
        >
          <svg viewBox="0 0 10 10">
            <path d="M 0,0 0,10 10,10 10,0 Z" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </button>
        <button
          className="titlebar-button titlebar-close"
          onClick={handleClose}
          title="Close"
          aria-label="Close"
        >
          <svg viewBox="0 0 10 10">
            <path d="M 0,0 10,10 M 10,0 0,10" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </button>
      </div>
    </div>
  );
}
