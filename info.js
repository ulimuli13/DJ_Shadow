const audioPlayer = document.getElementById('audio-player');
  const playPauseButton = document.getElementById('play-pause-button');
  const nextButton = document.getElementById('next-button');
  const prevButton = document.getElementById('prev-button');

  const tracks = [
    'audio/song1.mp3',
    'audio/song2.mp3',
    'audio/song3.mp3',
    'audio/song4.mp3',
    'audio/song5.mp3',
    'audio/song6.mp3',
    'audio/song7.mp3',
    'audio/song8.mp3',
    'audio/song9.mp3',
    'audio/song10.mp3',
    'audio/song11.mp3',
    'audio/song12.mp3',
    'audio/song13.mp3',
    'audio/song14.mp3',
    'audio/song15.mp3'
  ];

  let currentTrack = 0;
  let isPlaying = false;

  function loadTrack(index) {
    audioPlayer.src = tracks[index];
    if (isPlaying) audioPlayer.play();
  }

  playPauseButton.addEventListener('click', () => {
    if (isPlaying) {
      audioPlayer.pause();
      playPauseButton.textContent = '▶︎';
    } else {
      audioPlayer.play();
      playPauseButton.textContent = '❚❚';
    }
    isPlaying = !isPlaying;
  });

  nextButton.addEventListener('click', () => {
    currentTrack = (currentTrack + 1) % tracks.length;
    loadTrack(currentTrack);
  });

  prevButton.addEventListener('click', () => {
    currentTrack = (currentTrack - 1 + tracks.length) % tracks.length;
    loadTrack(currentTrack);
  });

  // Autoplay beim Laden
  audioPlayer.addEventListener('ended', () => {
    currentTrack = (currentTrack + 1) % tracks.length;
    loadTrack(currentTrack);
  });