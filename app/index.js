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

const notificationManager = {
  createNotification: ({ title, description }, timeout) => {},
  timeout: 3,
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
    this._triggerObservers(["update"], this);
  }

  pull() {
    const lastSong = this._songs.splice(0, 1)[0];
    if (lastSong !== undefined) {
      this._history.push(lastSong);
      this._triggerObservers(["newCurrent"], this);
      if (this._history.length >= 10) {
        this.trimHistory();
      }
    }
    this._triggerObservers(["update"], this);
    return lastSong;
  }

  pullPrevious() {
    const previous = this._history[this._history.length - 2];
    if (previous === undefined) return;
    const current = this.getCurrent();
    this._history.splice(this._history.length - 1);
    this._songs.splice(0, 0, current);
    this._triggerObservers(["update", "newCurrent"], this);
  }

  playSong(id) {
    if (id !== this.getCurrent()) {
      this._history.push(id);
    }
    this._triggerObservers(["update", "newCurrent"], this);
  }

  remove(index) {
    this._songs.splice(index, 1);
    this._triggerObservers(["update"], this);
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

  _triggerObservers(events = [], ...args) {
    for (const event of events) {
      this._observers[event].forEach(async (callback) => {
        callback(...args);
      });
    }
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
  element.style.background = `linear-gradient(to right, var(--color-progress-bar) ${value}%, var(--color-block-border) ${value}%)`;
}

function createNotification(
  { title, description },
  notificationRoot,
  timeout = 3
) {
  const notificationElement = document.createElement("div");
  notificationElement.className = "notification container";
  notificationElement.innerHTML = `
    <button class="remove-button" active="false">
      <img src="../assets/icons/xicon.svg" alt="share" draggable="false"/>
    </button>
    <span class="title">${title}</span>
    <span class="description">${description}</span>
  `;

  // const removeButton = notificationElement.querySelector(
  //   "button.remove-button"
  // );

  const remove = () => {
    notificationElement.setAttribute("active", false);
    setTimeout(() => {
      notificationRoot.removeChild(notificationElement);
    }, 300);
  };

  setTimeout(remove, 1000 * timeout);
  notificationElement.addEventListener("click", remove);

  notificationRoot.appendChild(notificationElement);

  setTimeout(() => {
    notificationElement.setAttribute("active", true);
  }, 100);

  console.log(notificationRoot.children.length);
  if (notificationRoot.children.length > 5) {
    const children = notificationRoot.children;
    for (let i = 0; i < notificationRoot.children.length - 5; i++) {
      notificationRoot.removeChild(children[i]);
    }
  }
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
    <div class="interaction-buttons">
      <button class="play-now-button">
        <img src="../assets/icons/play_now.svg" alt="share" draggable="false"/>
      </button>
      <button class="add-to-queue-button">
        <img src="../assets/icons/plus.svg" alt="share" draggable="false"/>
      </button>
    </div>
    <button class="share-button">
      <img src="../assets/icons/share.svg" alt="share" draggable="false" />
    </button>
  `;

  const playNowButton = songElement.querySelector("button.play-now-button");
  const addToQueueButton = songElement.querySelector(
    "button.add-to-queue-button"
  );
  const shareButton = songElement.querySelector("button.share-button");

  playNowButton.addEventListener("click", () => {
    queue.playSong(songId);
  });

  addToQueueButton.addEventListener("click", () => {
    queue.push(songId);
  });

  shareButton.addEventListener("click", () => {
    const shareUrl = getShareUrl(songId);
    navigator.clipboard.writeText(shareUrl);
    notificationManager.createNotification({
      title: "Copiado!",
      description: `Você copiou o link da música <b>${songObject.title}</b> para compartilhar com os seus amigos!`,
    });
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

function switchDisable(elements = [], disable = false) {
  elements.forEach((element) => {
    const isDisabled = element.getAttribute("disabled");
    if (disable && !isDisabled) {
      element.setAttribute("disabled", disable);
    } else if (!disable && isDisabled) {
      element.removeAttribute("disabled");
    }
  });
}

function getShareUrl(songId) {
  const newSearchParams = new URLSearchParams([["song", songId]]);
  const baseURL = window.location.origin + window.location.pathname;
  return [baseURL, newSearchParams].join("?");
}

function getSharedSong() {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("song");
}

document.addEventListener("DOMContentLoaded", () => {
  const sharedSong = getSharedSong();
  const notificationRoot = document.getElementById("notifications");
  const audioController = document.getElementById("audio-controller");
  const progressBar = document.getElementById("progress-bar");
  const searchForm = document.getElementById("search-field");
  const musicIndicator = document.getElementById("music-indicator");
  const timeRootElement = document.getElementById("time");
  const shareButton = document.querySelector(
    "div#music-indicator button.share-button"
  );
  const searchResultsTitle = document.querySelector(
    "div#search-results h2.title"
  );
  const searchResultsRoot = document.querySelector(
    "div#search-results div.item-list-container"
  );

  // Controls
  const playButton = document.getElementById("play-button");
  const previousButton = document.getElementById("previous-button");
  const nextButton = document.getElementById("next-button");
  const volumeButton = document.getElementById("volume-button");
  const volumeBar = volumeButton.querySelector(
    "div.volume-controller input[type='range']"
  );
  const volumeImgButton = volumeButton.querySelector("img");

  const queueRoot = document.querySelector("div#queue div.item-list-container");

  renderSongs(Object.keys(SONG_LIST), searchResultsRoot);
  renderSongs([], queueRoot, true);

  setTime(0, 0, timeRootElement);

  setProgress(progressBar, progressBar.value);

  notificationManager.createNotification = (
    { title, description },
    timeout
  ) => {
    createNotification(
      { title, description },
      notificationRoot,
      timeout ?? notificationManager.timeout
    );
  };

  progressBar.addEventListener("input", (e) => {
    const value = e.target.value;
    setProgress(e.target, value);
    if (audioController.currentSrc) {
      audioController.currentTime = getFromPercent(
        parseFloat(value),
        audioController.duration
      );
      setTime(
        Math.round(audioController.currentTime),
        Math.round(audioController.duration),
        timeRootElement
      );
    }
  });

  volumeBar.addEventListener("input", (e) => {
    const value = e.target.value;
    setProgress(e.target, value);

    audioController.muted = false;
    audioController.volume = parseFloat(value) / 100;
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

  audioController.onvolumechange = (e) => {
    const volume = e.target.volume * 100;
    let iconName = "";
    if (e.target.muted) {
      iconName = "muted";
    } else if (volume >= 75) {
      iconName = "high";
    } else if (volume >= 25) {
      iconName = "low";
    } else {
      iconName = "none";
    }
    volumeImgButton.setAttribute(
      "src",
      `../assets/icons/sound_${iconName}.svg`
    );
  };

  playButton.addEventListener("click", () => {
    if (audioController.ended) {
      if (queue.getSongs().length > 0) {
        queue.pull();
      } else {
        audioController.currentTime = 0;
      }
    } else if (audioController.paused) {
      audioController.play();
    } else {
      audioController.pause();
    }
  });

  previousButton.addEventListener("click", () => {
    queue.pullPrevious();
  });

  nextButton.addEventListener("click", () => {
    queue.pull();
  });

  volumeImgButton.addEventListener("click", () => {
    if (window.innerWidth >= 700) {
      audioController.muted = !audioController.muted;
    }
  });

  shareButton.addEventListener("click", () => {
    const currentSongId = queue.getCurrent();
    if (currentSongId !== undefined) {
      const songObject = SONG_LIST[currentSongId];
      const shareUrl = getShareUrl(currentSongId);
      navigator.clipboard.writeText(shareUrl);
      notificationManager.createNotification({
        title: "Copiado!",
        description: `Você copiou o link da música <b>${songObject.title}</b> para compartilhar com os seus amigos!`,
      });
    }
  });

  setInterval(() => {
    if (!audioController.paused && audioController.currentSrc) {
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
    switchDisable(
      [
        playButton,
        nextButton,
        previousButton,
        volumeButton,
        progressBar,
        shareButton,
      ],
      !audioController.currentSrc
    );

    musicIndicator.className =
      audioController.currentSrc && !audioController.ended
        ? "active-music"
        : "";
  }, 500);

  if (
    sharedSong !== null &&
    !isNaN(sharedSong) &&
    Object.prototype.hasOwnProperty.call(SONG_LIST, sharedSong)
  ) {
    queue.push(sharedSong);
  }
});
