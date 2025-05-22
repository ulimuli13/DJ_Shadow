let startTime = 0;
let endTime = 0;
let currentSong = "";
let waveSurfer;
let isRemixPlaying = false;
let remixSources = [];
let context = new (window.AudioContext || window.webkitAudioContext)();

// AudioContext aktivieren bei erstem User-Klick
document.body.addEventListener('click', () => {
  if (context.state === 'suspended') {
    context.resume();
  }
}, { once: true });

function initMainWaveform() {
  waveSurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#aaa',
    progressColor: '#333',
    height: 100,
    responsive: true,
    cursorColor: '#ff0000'
  });

  waveSurfer.on('ready', () => {
    waveSurfer.enableDragSelection({});
  });
}

initMainWaveform();

function loadPredefinedSong(songFile) {
  currentSong = songFile;
  waveSurfer.load(songFile);
  startTime = 0;
  endTime = 0;
}

function setStart() {
  startTime = waveSurfer.getCurrentTime();
  console.log("Start:", startTime.toFixed(2));
}

function setEnd() {
  endTime = waveSurfer.getCurrentTime();
  console.log("End:", endTime.toFixed(2));
}

function cutSample() {
  if (!currentSong || endTime <= startTime) {
    alert("Ungültige Start-/Endzeit oder kein Song geladen.");
    return;
  }

  const sample = {
    id: `sample-${Date.now()}`,
    start: startTime,
    end: endTime,
    song: currentSong
  };

  const sampleEl = document.createElement("div");
  sampleEl.className = "sample";
  sampleEl.draggable = true;
  sampleEl.dataset.sample = JSON.stringify(sample);

  sampleEl.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("sample", sampleEl.dataset.sample);
  });

  sampleEl.onclick = () => playSample(sample);

  const waveContainer = document.createElement('div');
  waveContainer.className = 'wave-container';
  waveContainer.style.width = "180px";
  waveContainer.style.height = "80px";
  sampleEl.appendChild(waveContainer);
  document.getElementById("samples").appendChild(sampleEl);

  const miniWave = WaveSurfer.create({
    container: waveContainer,
    waveColor: '#888',
    progressColor: '#444',
    height: 80,
    normalize: true,
    responsive: true,
    minPxPerSec: 100
  });

  miniWave.load(sample.song);
  miniWave.on('ready', () => {
    const duration = miniWave.getDuration();
    waveContainer.scrollLeft = (sample.start / duration) * waveContainer.scrollWidth;
  });
}

function playSample(sample) {
  const source = context.createBufferSource();
  fetch(sample.song)
    .then(res => res.arrayBuffer())
    .then(buf => context.decodeAudioData(buf))
    .then(decoded => {
      source.buffer = decoded;
      source.connect(context.destination);
      source.start(0, sample.start, sample.end - sample.start);
    });
}

function playRemix() {
  if (isRemixPlaying) {
    stopRemix();
    return;
  }

  const sampleElements = document.querySelectorAll(".sample");
  if (sampleElements.length === 0) {
    alert("Keine Samples vorhanden.");
    return;
  }

  const samples = Array.from(sampleElements).map(el => JSON.parse(el.dataset.sample));

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  const remixStart = context.currentTime;
  const remixSamples = shuffle(samples);
  remixSources = [];
  isRemixPlaying = true;

  remixSamples.forEach(sample => {
    fetch(sample.song)
      .then(res => res.arrayBuffer())
      .then(buf => context.decodeAudioData(buf))
      .then(decoded => {
        const source = context.createBufferSource();
        const playbackRate = randomBetween(0.8, 1.5);
        const offset = randomBetween(0, 10);
        const duration = (sample.end - sample.start) / playbackRate;

        source.buffer = decoded;
        source.playbackRate.value = playbackRate;
        source.connect(context.destination);
        source.start(remixStart + offset, sample.start, duration);
        remixSources.push(source);
      });
  });
}

function stopRemix() {
  remixSources.forEach(source => {
    try {
      source.stop();
    } catch (e) {
      console.warn("Fehler beim Stoppen der Quelle:", e);
    }
  });
  remixSources = [];
  isRemixPlaying = false;
}
