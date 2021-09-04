const SONG_LIST = {
  0: {
    title: "On & On",
    author: "Cartoon (feat. Daniel Levi)",
    path: "./musics/cartoon_on_on",
  },
  1: {
    title: "Why We Lose ",
    author: "Cartoon (feat. Coleman Trapp)",
    path: "./musics/cartoon_why_we_lose",
  },
};

const RENDER_CACHE = {
  search: [],
  queue: [],
  lastCurrent: undefined,
};

class Queue {
  constructor() {
    this._songs = [];
    this._history = [];
    this._observers = {
      update: [],
      newCurrent: [],
    };
  }

  push(songId) {
    this._songs.push(songId);
    this._triggerObservers("update", this);
  }

  pull() {
    const lastSong = this._songs.splice(0, 1)[0];
    if (lastSong !== undefined) {
      this._history.push(lastSong);
      this._triggerObservers("newCurrent", this);
      if (this._history.length >= 10) {
        this.trimHistory();
      }
    }
    this._triggerObservers("update", this);
    return lastSong;
  }

  pullPrevious() {
    const previous = this._history[this._history.length - 2];
    if (previous === undefined) return;
    const current = this.getCurrent();
    this._history.splice(this._history.length - 1);
    this._songs.splice(0, 0, current);
    this._triggerObservers("newCurrent", this);
  }

  remove(index) {
    this._songs.splice(index, 1);
    this._triggerObservers("update", this);
  }

  getCurrent() {
    return this._history[this._history.length - 1];
  }

  getSongs() {
    return this._songs;
  }

  getHistory() {
    return this._history;
  }

  trimHistory() {
    this._history.splice(0, Math.round(this._history.length / 2));
  }

  /**
   * @param {"update" | "newCurrent"} event
   * @param {(queueObj: Queue) => {}} callback
   */
  on(event, callback) {
    this._observers[event].push(callback);
  }

  _triggerObservers(event, ...args) {
    this._observers[event].forEach(async (callback) => {
      callback(...args);
    });
  }
}

const queue = new Queue();

function checkArrayEquality(array1 = [], array2 = []) {
  if (array1.length !== array2.length) return false;
  for (let i = 0; i < array1.length; i++) {
    if (array1[i] !== array2[i]) return false;
  }
  return true;
}

function setProgress(element, value) {
  element.style.background = `linear-gradient(to right, var(--color-light-gray) ${value}%, var(--color-block-border) ${value}%)`;
}

function createSongElement(songId) {
  const songObject = SONG_LIST[songId];
  if (songObject === undefined) return;
  const songElement = document.createElement("div");
  songElement.className = "song-item";
  songElement.innerHTML = `
    <img
      class="song-logo"
      src="${songObject.path}/thumb.jpg"
      alt="thumb"
      draggable="false"
    />
    <div class="song-info">
      <h3>${songObject.title}</h3>
      <p>${songObject.author}</p>
    </div>
    <button class="share-button">
      <img src="../assets/icons/share.svg" alt="share" draggable="false" />
    </button>
  `;

  songElement.addEventListener("click", () => {
    queue.push(songId);
  });

  return songElement;
}

function createQueueSongElement(songId, queuePosition) {
  const songObject = SONG_LIST[songId];
  if (songObject === undefined) return;
  const songElement = document.createElement("div");
  songElement.className = "song-item queue-layout";
  songElement.innerHTML = `
    <img
      class="song-logo"
      src="${songObject.path}/thumb.jpg"
      alt="thumb"
      draggable="false"
    />
    <div class="song-info">
      <h3>${songObject.title}</h3>
      <p>${songObject.author}</p>
    </div>
    <button class="remove-button">
      <img src="../assets/icons/xicon.svg" alt="share" draggable="false"/>
    </button>
  `;

  songElement
    .querySelector("button.remove-button")
    .addEventListener("click", () => {
      queue.remove(queuePosition);
    });

  return songElement;
}

function renderSongs(ids = [], rootElement, isQueue = false) {
  const cacheName = isQueue ? "queue" : "search";
  if (ids.length !== 0 && checkArrayEquality(ids, RENDER_CACHE[cacheName]))
    return;

  rootElement.innerHTML = "";
  const songList = document.createDocumentFragment();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const songElement = isQueue
      ? createQueueSongElement(id, i)
      : createSongElement(id);

    songList.appendChild(songElement);
  }
  rootElement.appendChild(songList);
  RENDER_CACHE[cacheName] = [...ids];
}

function convertToMinutes(number = 0) {
  if (number < 60) {
    return {
      seconds: number,
      minutes: 0,
    };
  } else {
    const minutes = Math.floor(number / 60);
    const seconds = number - minutes * 60;
    return {
      seconds,
      minutes,
    };
  }
}

function setTime(current, total, rootElement) {
  const timePassed = rootElement.querySelector("#time-passed");
  const timeTotal = rootElement.querySelector("#time-total");
  const [currentTime, totalTime] = [
    convertToMinutes(current),
    convertToMinutes(total),
  ];
  timePassed.innerText = `${
    currentTime.minutes
  }:${`${currentTime.seconds}`.padStart(2, "0")}`;
  timeTotal.innerText = `${totalTime.minutes}:${`${totalTime.seconds}`.padStart(
    2,
    "0"
  )}`;
}

function getPercent(num, total) {
  return (num * 100) / total;
}

function getFromPercent(percent, total) {
  return (percent / 100) * total;
}

document.addEventListener("DOMContentLoaded", () => {
  const audioController = document.getElementById("audio-controller");
  const progressBar = document.getElementById("progress-bar");
  const searchForm = document.getElementById("search-field");
  const musicIndicator = document.getElementById("music-indicator");
  const timeRootElement = document.getElementById("time");
  const searchResultsTitle = document.querySelector(
    "div#search-results h2.title"
  );
  const searchResultsRoot = document.querySelector(
    "div#search-results div.item-list-container"
  );

  // Controls
  const playButton = document.getElementById("play-button");

  const queueRoot = document.querySelector("div#queue div.item-list-container");

  renderSongs(Object.keys(SONG_LIST), searchResultsRoot);
  renderSongs([], queueRoot, true);

  setTime(0, 0, timeRootElement);

  setProgress(progressBar, progressBar.value);
  progressBar.addEventListener("input", (e) => {
    const value = e.target.value;
    setProgress(e.target, value);
    if (audioController.currentSrc) {
      audioController.currentTime = getFromPercent(
        parseFloat(value),
        audioController.duration
      );
    }
  });

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const typedText = data.get("search-text");
    if (typedText === "") {
      searchResultsTitle.innerText = "INÍCIO";
      renderSongs(Object.keys(SONG_LIST), searchResultsRoot);
    } else {
      searchResultsTitle.innerText = "RESULTADOS DA PESQUISA";
      const textToSearch = typedText.toLowerCase();
      const songsToRender = Object.entries(SONG_LIST)
        .filter(([_, v]) => v.title.toLowerCase().includes(textToSearch))
        .map(([k]) => k);
      renderSongs(songsToRender, searchResultsRoot);
    }
  });

  queue.on("update", (q) => {
    renderSongs(q.getSongs(), queueRoot, true);
    const current = q.getCurrent();
    if (current === undefined && q.getSongs().length > 0) {
      q.pull();
    }
  });

  queue.on("newCurrent", (q) => {
    const current = q.getCurrent();
    const currentSong = SONG_LIST[current];
    musicIndicator
      .querySelector("img.song-logo")
      .setAttribute("src", `${currentSong.path}/thumb.jpg`);
    musicIndicator.querySelector(".song-info h3").innerText = currentSong.title;
    musicIndicator.querySelector(".song-info p").innerText = currentSong.author;
    audioController.setAttribute("src", `${currentSong.path}/music.mp3`);
    audioController.play();
  });

  audioController.onended = () => {
    queue.pull();
  };

  audioController.onplay = () => {
    playButton
      .querySelector("img")
      .setAttribute("src", "../assets/icons/pause.svg");
  };

  audioController.onpause = () => {
    playButton
      .querySelector("img")
      .setAttribute("src", "../assets/icons/play.svg");
  };

  playButton.addEventListener("click", () => {
    if (audioController.paused) {
      audioController.play();
    } else {
      audioController.pause();
    }
  });

  setInterval(() => {
    if (!audioController.paused && !!audioController.currentSrc) {
      setTime(
        Math.round(audioController.currentTime),
        Math.round(audioController.duration),
        timeRootElement
      );
      progressBar.value = getPercent(
        audioController.currentTime,
        audioController.duration
      );
      setProgress(progressBar, progressBar.value);
    }
  }, 1000);
});
