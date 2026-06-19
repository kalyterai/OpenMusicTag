import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-scroll">
        {children}
      </main>
    </div>
  );
}
