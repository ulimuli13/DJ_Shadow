// Globale BPM einstellen (z. B. 120 BPM = 0.5s pro Schlag)
const bpm = 120;
const beatInterval = 60000 / bpm; // in ms (500ms bei 120 BPM)

let globalBeatTime = Date.now();
setInterval(() => {
  globalBeatTime = Date.now();
}, beatInterval);

function playOnNextBeat(audio) {
  const now = Date.now();
  const timeSinceLastBeat = now - globalBeatTime;
  const delay = beatInterval - (timeSinceLastBeat % beatInterval);

  setTimeout(() => {
    audio.play();
  }, delay);
}
function playOnNextBeat(audio, drehungElement) {
  const now = Date.now();
  const timeSinceLastBeat = now - globalBeatTime;
  const delay = beatInterval - (timeSinceLastBeat % beatInterval);

  setTimeout(() => {
    audio.play();
    drehungElement.classList.add("rotating");
  }, delay);
}

      document.addEventListener("DOMContentLoaded", function () {
        let isAnimationRunning = false;
        const vinylItems = document.querySelectorAll(".vinyl-item");
      
        let currentIndex = Array.from(vinylItems).findIndex(item => item.classList.contains("active"));
        if (currentIndex === -1) currentIndex = 0;
      
        function updateActiveItem(newIndex) {
          if (newIndex < 0 || newIndex >= vinylItems.length || isAnimationRunning) return;
      
          isAnimationRunning = true;
      
          vinylItems[currentIndex].classList.remove("active");
          vinylItems[currentIndex].querySelector(".vinyl-spine").style.minWidth = "var(--spine-width)";
      
          currentIndex = newIndex;
          const newActive = vinylItems[currentIndex];
          newActive.classList.add("active");
          newActive.querySelector(".vinyl-spine").style.minWidth = "0px";
          newActive.querySelector(".vinyl-spine").style.width = "0px";
      
          setTimeout(() => {
            isAnimationRunning = false;
          }, 300);
        }
      
        vinylItems.forEach((item, index) => {
          item.addEventListener("click", function (event) {
            if (
              this.classList.contains("active") &&
              event.target.classList.contains("vinyl-cover")
            ) {
              insertActiveCoverToFreePlatte();
            } else if (!this.classList.contains("active")) {
              updateActiveItem(index);
            }
          });
        });
      
        let scrollAccumulator = 0;
        const scrollThreshold = 200;
        let lastDirection = 0;
      
        window.addEventListener("wheel", function (event) {
          if (isAnimationRunning) return;
      
          const delta = event.deltaY;
          const direction = Math.sign(delta);
      
          if (direction !== lastDirection) scrollAccumulator = 0;
          scrollAccumulator += delta;
      
          if (Math.abs(scrollAccumulator) >= scrollThreshold) {
            if (direction > 0) {
              updateActiveItem(currentIndex - 1);
            } else if (direction < 0) {
              updateActiveItem(currentIndex + 1);
            }
            scrollAccumulator = 0;
          }
      
          lastDirection = direction;
        }, { passive: true });
      
        // ==========================
        //     COVER EINSETZEN
        // ==========================
        function getActiveCoverImage() {
          const activeItem = document.querySelector('.vinyl-item.active');
          const cover = activeItem?.querySelector('.vinyl-cover');
          return cover?.src || null;
        }
      
        function getNextFreePlatte() {
          const platten = document.querySelectorAll('.Platte_container');
          for (const platte of platten) {
            const drehung = platte.querySelector('.Platte_drehung');
            if (!drehung.style.backgroundImage || drehung.style.backgroundImage === 'none') {
              return platte;
            }
          }
          return null;
        }
      
        function isCoverAlreadyUsed(imageSrc) {
          const platten = document.querySelectorAll('.Platte_container');
          for (const platte of platten) {
            const drehung = platte.querySelector('.Platte_drehung');
            if (drehung.style.backgroundImage.includes(imageSrc)) {
              return true;
            }
          }
          return false;
        }
      
        function insertActiveCoverToFreePlatte() {
          const imageSrc = getActiveCoverImage();
          if (!imageSrc) return;
          if (isCoverAlreadyUsed(imageSrc)) return;
      
          const platte = getNextFreePlatte();
          if (!platte) {
            return;
          }
      
          const drehung = platte.querySelector('.Platte_drehung');
          drehung.style.backgroundImage = `url('${imageSrc}')`;
         
      
          // Bildpfad speichern
          platte.dataset.trackSrc = imageSrc;
      
          // Soundpfad aus Bild ableiten
          const audioSrc = imageSrc
            .replace("Bilder/Cover", "Sounds")
            .replace(/\.(jpg|jpeg|png)$/i, ".mp3");
      
          // Audioobjekt erstellen
          const audio = new Audio(audioSrc);
          audio.loop = true;
          playOnNextBeat(audio, drehung);
          platte.audio = audio;
      
          const parent = platte.closest(".Player");
          const hebel = parent.querySelector(".Hebel");
          if (hebel) hebel.src = "Bilder/Hebel_on.png";
        }
      
        // ==========================
        //     HEBEL UMSCHALTEN
        // ==========================
        document.querySelectorAll(".Platte_container").forEach(platte => {
          platte.addEventListener("click", () => {
            const parent = platte.closest(".Player");
            const hebel = parent.querySelector(".Hebel");
            const drehung = platte.querySelector(".Platte_drehung");
      
            if (!drehung) return;
      
            if (hebel.src.includes("Hebel_off.png")) {
              hebel.src = "Bilder/Hebel_on.png";
              drehung.classList.add("rotating");
              platte.audio?.play();
            } else {
              hebel.src = "Bilder/Hebel_off.png";
              drehung.classList.remove("rotating");
              platte.audio?.pause();
            }
          });
        });
      
        // ==========================
        //     LÖSCHEN PER X
        // ==========================
        document.querySelectorAll(".delete-button").forEach(button => {
          button.addEventListener("click", (e) => {
            e.stopPropagation();
            const playerIndex = button.dataset.player;
            const platte = document.getElementById("Platte" + playerIndex);
            if (platte) {
              const drehung = platte.querySelector(".Platte_drehung");
              if (drehung) {
                drehung.style.backgroundImage = "none";
                drehung.classList.remove("rotating");
              }
      
              if (platte.audio) {
                platte.audio.pause();
                platte.audio = null;
              }
      
              delete platte.dataset.trackSrc;
      
              const parent = platte.closest(".Player");
              const hebel = parent.querySelector(".Hebel");
              if (hebel) hebel.src = "Bilder/Hebel_off.png";
            }
          });
        });
      });