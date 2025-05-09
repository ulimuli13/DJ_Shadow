let startTime = 0;
let endTime = 0;
let currentSong = "";
let waveSurfers = [];
let activeSources = [];
let playheadAnimationFrame = null;

let waveSurfer = WaveSurfer.create({
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

  const id = `sample-${Date.now()}`;
  const sample = { id, start: startTime, end: endTime, song: currentSong };

  const sampleEl = document.createElement("div");
  sampleEl.className = "sample";
  sampleEl.draggable = true;
  sampleEl.dataset.sample = JSON.stringify(sample);

  sampleEl.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("sample", sampleEl.dataset.sample);
  });

  const waveContainer = document.createElement('div');
  waveContainer.className = 'wave-container';
  waveContainer.style.width = "180px";
  waveContainer.style.height = "80px";
  sampleEl.appendChild(waveContainer);
  document.getElementById("samples").appendChild(sampleEl);

  let newWaveSurfer = WaveSurfer.create({
    container: waveContainer,
    waveColor: '#888',
    progressColor: '#444',
    height: 80,
    normalize: true,
    responsive: true
  });

  newWaveSurfer.load(sample.song);

  newWaveSurfer.on('ready', () => {
    const fullDuration = newWaveSurfer.getDuration();
    const scrollTarget = (sample.start / fullDuration) * waveContainer.scrollWidth;
    waveContainer.scrollLeft = scrollTarget;
  });

  waveSurfers.push(newWaveSurfer);
}

function playSample(sample, when = 0) {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  fetch(sample.song)
    .then(res => res.arrayBuffer())
    .then(buffer => context.decodeAudioData(buffer))
    .then(decoded => {
      const source = context.createBufferSource();
      source.buffer = decoded;
      source.connect(context.destination);
      const now = context.currentTime + when;
      source.start(now, sample.start, sample.end - sample.start);
      activeSources.push(source);
    });
}

function dropSample(event) {
  event.preventDefault();
  const data = event.dataTransfer.getData("sample");
  if (!data) return;

  const sample = JSON.parse(data);
  const dropEl = document.createElement("div");
  dropEl.className = "sample";
  dropEl.textContent = `${sample.start.toFixed(2)} - ${sample.end.toFixed(2)}s`;
  dropEl.onclick = () => playSample(sample);

  const row = event.target.closest('.timeline-row');
  if (row) {
    row.appendChild(dropEl);
    addWaveformToTimeline(sample, row);
  }
}

function addWaveformToTimeline(sample, row) {
  const waveContainer = document.createElement('div');
  waveContainer.className = 'wave-container';
  waveContainer.style.height = "80px";
  waveContainer.style.overflow = "hidden";

  const wrapper = document.createElement('div');
  wrapper.className = 'timeline-sample';

  const totalDuration = waveSurfer.getDuration();
  const relativeWidth = ((sample.end - sample.start) / totalDuration) * 100;
  wrapper.style.width = `${Math.max(relativeWidth, 10)}%`;

  wrapper.appendChild(waveContainer);
  row.appendChild(wrapper);

  let newWaveSurfer = WaveSurfer.create({
    container: waveContainer,
    waveColor: '#888',
    progressColor: '#444',
    height: 80,
    normalize: true,
    responsive: true
  });

  newWaveSurfer.load(sample.song);

  newWaveSurfer.on('ready', () => {
    const fullDuration = newWaveSurfer.getDuration();
    const scrollTarget = (sample.start / fullDuration) * waveContainer.scrollWidth;
    waveContainer.scrollLeft = scrollTarget;
  });

  waveSurfers.push(newWaveSurfer);
}

function playTimeline() {
  stopTimeline(); // vorherige stoppen
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const timeline = document.getElementById('timeline');
  const rows = timeline.querySelectorAll('.timeline-row');
  const startTime = context.currentTime;

  rows.forEach(row => {
    const children = row.querySelectorAll('.sample');
    children.forEach(el => {
      const sample = JSON.parse(el.dataset.sample);
      const sampleStart = sample.start;
      const sampleEnd = sample.end;
      const duration = sampleEnd - sampleStart;

      fetch(sample.song)
        .then(res => res.arrayBuffer())
        .then(buf => context.decodeAudioData(buf))
        .then(decoded => {
          const source = context.createBufferSource();
          source.buffer = decoded;
          source.connect(context.destination);
          source.start(startTime, sampleStart, duration);
          activeSources.push(source);
        });
    });
  });

  animatePlayhead(startTime);
}

function stopTimeline() {
  activeSources.forEach(source => {
    try {
      source.stop();
    } catch (e) {
      console.warn("Fehler beim Stoppen:", e);
    }
  });
  activeSources = [];

  if (playheadAnimationFrame) {
    cancelAnimationFrame(playheadAnimationFrame);
    playheadAnimationFrame = null;
  }

  const playhead = document.getElementById('playhead');
  if (playhead) playhead.style.left = '0px';
}

function animatePlayhead(audioStart) {
  const playhead = document.getElementById('playhead');
  const timeline = document.getElementById('timeline');
  const width = timeline.offsetWidth;
  const duration = waveSurfer.getDuration(); // Gesamtdauer

  function step() {
    const currentTime = (new (window.AudioContext || window.webkitAudioContext)()).currentTime;
    const elapsed = currentTime - audioStart;
    const progress = elapsed / duration;
    playhead.style.left = `${progress * width}px`;

    if (progress < 1) {
      playheadAnimationFrame = requestAnimationFrame(step);
    }
  }

  step();
}
