// src/components/Header.js
import React from 'react';
import './Header.css'; // Pour les styles spécifiques au header

function Header() {
  return (
    <header className="header">
      <h1>Nummax Application</h1>
      <nav>
        <ul>
          <li>Accueil</li>
          <li>Calculateur</li>
          <li>Dispositions</li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
