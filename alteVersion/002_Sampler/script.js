let startTime = 0;
let endTime = 0;
let currentSong = "";
let waveSurfer;
let playhead = document.getElementById("playhead");
let isPlaying = false;
let context = new (window.AudioContext || window.webkitAudioContext)();
let sources = [];

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

function dropSample(event) {
  event.preventDefault();
  const data = event.dataTransfer.getData("sample");
  if (!data) return;

  const sample = JSON.parse(data);
  const row = event.target.closest(".timeline-row");
  const wrapper = document.createElement("div");
  wrapper.className = "timeline-sample";
  wrapper.dataset.sample = JSON.stringify(sample);
  wrapper.draggable = true;

  // ✨ Setze Position basierend auf Drop-Position
  const rect = row.getBoundingClientRect();
  const dropX = event.clientX - rect.left;
  wrapper.style.left = dropX + "px";

  const waveContainer = document.createElement('div');
  waveContainer.className = 'wave-container';
  waveContainer.style.height = "80px";

  const duration = sample.end - sample.start;
  const scaleFactor = 100;
  const minWidth = 80;
  const maxWidth = 300;
  const width = Math.min(Math.max(duration * scaleFactor, minWidth), maxWidth);
  waveContainer.style.width = `${width}px`;

  wrapper.appendChild(waveContainer);
  row.appendChild(wrapper);

  const miniWave = WaveSurfer.create({
    container: waveContainer,
    waveColor: '#888',
    progressColor: '#444',
    height: 80,
    normalize: true,
    responsive: true,
  });

  miniWave.load(sample.song);
  miniWave.on('ready', () => {
    const fullDuration = miniWave.getDuration();
    waveContainer.scrollLeft = (sample.start / fullDuration) * waveContainer.scrollWidth;
  });

  // ➕ Drag innerhalb der Timeline ermöglichen
  wrapper.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("sample-move", JSON.stringify({
      sample: wrapper.dataset.sample,
      offsetX: e.offsetX
    }));
  });
}


function playTimeline() {
  if (isPlaying) {
    pauseTimeline();
    return;
  }

  isPlaying = true;
  const timeline = document.getElementById("timeline");
  const timelineRect = timeline.getBoundingClientRect();

  const totalDuration = waveSurfer.getDuration();
  const startLeft = timelineRect.left;
  const width = timeline.offsetWidth;
  const start = performance.now();

  const scheduled = [];
  document.querySelectorAll(".timeline-sample").forEach(el => {
    const sample = JSON.parse(el.dataset.sample);
    const offsetSec = (el.offsetLeft / width) * totalDuration;
    scheduled.push({ sample, offsetSec });
  });

  const playStart = context.currentTime;
  scheduled.forEach(({ sample, offsetSec }) => {
    fetch(sample.song)
      .then(res => res.arrayBuffer())
      .then(buf => context.decodeAudioData(buf))
      .then(decoded => {
        const source = context.createBufferSource();
        source.buffer = decoded;
        source.connect(context.destination);
        source.start(playStart + offsetSec, sample.start, sample.end - sample.start);
        sources.push(source);
      });
  });

  function animate(now) {
    if (!isPlaying) return;
    const elapsed = (now - start) / 1000;
    const progress = elapsed / totalDuration;
    if (progress >= 1) return pauseTimeline();
    playhead.style.left = startLeft + progress * width + "px";
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function pauseTimeline() {
  isPlaying = false;
  if (playhead) playhead.style.left = "0px";
  sources.forEach(s => {
    try {
      s.stop();
    } catch (e) {
      console.warn("Source already stopped:", e);
    }
  });
  sources = [];
}

document.querySelectorAll(".timeline-row").forEach(row => {
  row.addEventListener("dragover", (e) => e.preventDefault());
  row.addEventListener("drop", (e) => {
    e.preventDefault();
    const moved = e.dataTransfer.getData("sample-move");
    if (!moved) return;

    const { sample, offsetX } = JSON.parse(moved);
    const el = document.createElement("div");
    el.className = "timeline-sample";
    el.dataset.sample = sample;
    el.draggable = true;

    const rect = row.getBoundingClientRect();
    const dropX = e.clientX - rect.left - offsetX;
    el.style.left = `${dropX}px`;

    const waveContainer = document.createElement("div");
    waveContainer.className = 'wave-container';
    waveContainer.style.height = "80px";

    const parsed = JSON.parse(sample);
    const duration = parsed.end - parsed.start;
    const scaleFactor = 100;
    const minWidth = 80;
    const maxWidth = 300;
    const width = Math.min(Math.max(duration * scaleFactor, minWidth), maxWidth);
    waveContainer.style.width = `${width}px`;

    el.appendChild(waveContainer);
    row.appendChild(el);

    const miniWave = WaveSurfer.create({
      container: waveContainer,
      waveColor: '#888',
      progressColor: '#444',
      height: 80,
      normalize: true,
      responsive: true,
    });

    miniWave.load(parsed.song);
    miniWave.on('ready', () => {
      const fullDuration = miniWave.getDuration();
      waveContainer.scrollLeft = (parsed.start / fullDuration) * waveContainer.scrollWidth;
    });

    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("sample-move", JSON.stringify({
        sample: el.dataset.sample,
        offsetX: e.offsetX
      }));
    });
  });
});
