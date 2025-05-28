window.addEventListener('wheel', function(e) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      window.scrollBy({
        left: e.deltaY,
        behavior: 'smooth'
      });
    }
  }, { passive: false });
  