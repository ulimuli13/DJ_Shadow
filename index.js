window.addEventListener('wheel', function(e) {
    if (e.deltaY !== 0) {
      e.preventDefault();
      window.scrollBy({
        left: e.deltaY,
        behavior: 'smooth'
      });
    }
  }, { passive: false });