// --- Global Variables ---
let currentImageIndex = 0;
let imageList = [];
let audioContext, analyser, dataArray, source;
let isAudioInitialized = false;
let controlsTimeout; // For auto-hiding controls

// --- Tab Switching ---
document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    button.classList.add('active');
    const tabId = button.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
  });
});

// --- Upload Logic ---
const dropArea = document.getElementById('drop-area');
const progressBarContainer = document.getElementById('progress-bar-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

dropArea.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));

function handleFiles(files) {
  if (files.length > 0) uploadFiles(files);
}

function uploadFiles(files) {
  const url = '/upload';
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) formData.append('files[]', files[i]);

  progressBarContainer.classList.remove('hidden');
  progressBar.style.width = '0%';
  progressText.innerText = '0%';

  const xhr = new XMLHttpRequest();
  xhr.open('POST', url, true);

  xhr.upload.onprogress = function (e) {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      progressBar.style.width = percent + '%';
      progressText.innerText = percent + '%';
    }
  };

  xhr.onload = function () {
    if (xhr.status === 200) {
      progressBar.style.width = '100%';
      progressText.innerText = '100% - Done!';
      setTimeout(() => window.location.reload(), 500);
    } else {
      alert('Upload failed');
      progressBarContainer.classList.add('hidden');
    }
  };
  xhr.send(formData);
}

// --- Modal Logic ---
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';

  // Stop media
  const video = document.getElementById('main-video');
  const audio = document.getElementById('main-audio');
  video.pause();
  audio.pause();

  // Exit fullscreen if active
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
}

window.onclick = function (event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
    document.getElementById('main-video').pause();
    document.getElementById('main-audio').pause();
  }
}

// --- Image Lightbox ---
window.addEventListener('DOMContentLoaded', () => {
  const imgs = document.querySelectorAll('.image-card img');
  imgs.forEach(img => imageList.push(img.src));
});

function openLightbox(src, index) {
  currentImageIndex = index;
  const modal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const downloadBtn = document.getElementById('lightbox-download-btn');

  lightboxImg.src = src;
  downloadBtn.href = src; // Set download link
  modal.style.display = 'block';
}

function changeSlide(direction) {
  currentImageIndex += direction;
  if (currentImageIndex >= imageList.length) currentImageIndex = 0;
  if (currentImageIndex < 0) currentImageIndex = imageList.length - 1;

  const src = imageList[currentImageIndex];
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox-download-btn').href = src;
}

// --- Video Player ---
const video = document.getElementById('main-video');
const videoWrapper = document.getElementById('video-wrapper');
const videoControls = document.getElementById('video-controls');
const videoProgress = document.getElementById('video-progress');
const brightnessSlider = document.getElementById('brightness-slider');

function openVideoPlayer(src, title) {
  document.getElementById('video-title').innerText = title;
  video.src = src;
  document.getElementById('video-download-btn').href = src; // Set download link
  document.getElementById('video-modal').style.display = 'block';
  video.play();
  updatePlayIcon('video-play-btn', true);
  resetControlsTimer();
}

function toggleVideoPlay() {
  if (video.paused) {
    video.play();
    updatePlayIcon('video-play-btn', true);
  } else {
    video.pause();
    updatePlayIcon('video-play-btn', false);
  }
}

function seekVideo(seconds) {
  video.currentTime += seconds;
  resetControlsTimer();
}

// Fullscreen Logic
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    videoWrapper.requestFullscreen().catch(err => {
      alert(`Error attempting to enable fullscreen: ${err.message}`);
    });
    videoWrapper.classList.add('fullscreen');
  } else {
    document.exitFullscreen();
    videoWrapper.classList.remove('fullscreen');
  }
}

// Auto-hide Controls
function resetControlsTimer() {
  videoControls.classList.remove('controls-hidden');
  videoWrapper.style.cursor = 'default';

  clearTimeout(controlsTimeout);

  if (!video.paused) {
    controlsTimeout = setTimeout(() => {
      videoControls.classList.add('controls-hidden');
      videoWrapper.style.cursor = 'none';
    }, 5000); // 5 seconds
  }
}

videoWrapper.addEventListener('mousemove', resetControlsTimer);
videoWrapper.addEventListener('click', resetControlsTimer);

video.addEventListener('timeupdate', () => {
  const percent = (video.currentTime / video.duration) * 100;
  videoProgress.value = percent || 0;
});

videoProgress.addEventListener('input', () => {
  const time = (videoProgress.value / 100) * video.duration;
  video.currentTime = time;
});

brightnessSlider.addEventListener('input', () => {
  video.style.filter = `brightness(${brightnessSlider.value})`;
});

// --- Audio Player & Visualizer ---
const audio = document.getElementById('main-audio');
const audioProgress = document.getElementById('audio-progress');
const canvas = document.getElementById('audio-visualizer');
const ctx = canvas.getContext('2d');

function openAudioPlayer(src, title) {
  document.getElementById('audio-title').innerText = title;
  audio.src = src;
  document.getElementById('audio-download-btn').href = src; // Set download link
  document.getElementById('audio-modal').style.display = 'block';

  if (!isAudioInitialized) {
    initAudioVisualizer();
    isAudioInitialized = true;
  }

  audio.play();
  updatePlayIcon('audio-play-btn', true);
  visualize();
}

function toggleAudioPlay() {
  if (audio.paused) {
    audio.play();
    updatePlayIcon('audio-play-btn', true);
  } else {
    audio.pause();
    updatePlayIcon('audio-play-btn', false);
  }
}

function seekAudio(seconds) {
  audio.currentTime += seconds;
}

audio.addEventListener('timeupdate', () => {
  const percent = (audio.currentTime / audio.duration) * 100;
  audioProgress.value = percent || 0;
});

audioProgress.addEventListener('input', () => {
  const time = (audioProgress.value / 100) * audio.duration;
  audio.currentTime = time;
});

function updatePlayIcon(btnId, isPlaying) {
  const btn = document.getElementById(btnId);
  btn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
}

// --- Audio Visualizer Logic ---
function initAudioVisualizer() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
}

function visualize() {
  if (!audio.paused && document.getElementById('audio-modal').style.display === 'block') {
    requestAnimationFrame(visualize);
    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = '#101020';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      barHeight = dataArray[i] / 2;
      const r = barHeight + 25 * (i / dataArray.length);
      const g = 250 * (i / dataArray.length);
      const b = 50;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }
}
