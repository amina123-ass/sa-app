// src/components/Pagination.jsx
import React from 'react';
import './Pagination.css';

const Pagination = ({ 
  currentPage, 
  lastPage, 
  total, 
  perPage, 
  onPageChange,
  showInfo = true,
  maxVisiblePages = 5 
}) => {
  // Calculer les pages visibles
  const getVisiblePages = () => {
    const delta = Math.floor(maxVisiblePages / 2);
    let start = Math.max(currentPage - delta, 1);
    let end = Math.min(start + maxVisiblePages - 1, lastPage);
    
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(end - maxVisiblePages + 1, 1);
    }
    
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, total);

  if (lastPage <= 1) {
    return null; // Ne pas afficher la pagination s'il n'y a qu'une page
  }

  return (
    <div className="pagination-container">
      {showInfo && (
        <div className="pagination-info">
          Affichage de {startItem} à {endItem} sur {total} éléments
        </div>
      )}
      
      <div className="pagination">
        {/* Bouton Première page */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="Première page"
        >
          ⏪
        </button>

        {/* Bouton Page précédente */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Page précédente"
        >
          ◀️
        </button>

        {/* Points de suspension au début */}
        {visiblePages[0] > 1 && (
          <>
            <button
              className="pagination-btn"
              onClick={() => onPageChange(1)}
            >
              1
            </button>
            {visiblePages[0] > 2 && (
              <span className="pagination-dots">...</span>
            )}
          </>
        )}

        {/* Pages visibles */}
        {visiblePages.map(page => (
          <button
            key={page}
            className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}

        {/* Points de suspension à la fin */}
        {visiblePages[visiblePages.length - 1] < lastPage && (
          <>
            {visiblePages[visiblePages.length - 1] < lastPage - 1 && (
              <span className="pagination-dots">...</span>
            )}
            <button
              className="pagination-btn"
              onClick={() => onPageChange(lastPage)}
            >
              {lastPage}
            </button>
          </>
        )}

        {/* Bouton Page suivante */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === lastPage}
          title="Page suivante"
        >
          ▶️
        </button>

        {/* Bouton Dernière page */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(lastPage)}
          disabled={currentPage === lastPage}
          title="Dernière page"
        >
          ⏩
        </button>
      </div>
    </div>
  );
};

export default Pagination;