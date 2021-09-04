const setProgress = (element, value) => {
  element.style.background = `linear-gradient(to right, var(--color-light-gray) ${value}%, var(--color-block-border) ${value}%)`;
};

document.addEventListener("DOMContentLoaded", () => {
  const progressBar = document.getElementById("progress-bar");
  setProgress(progressBar, progressBar.value);
  progressBar.addEventListener("input", (e) => {
    const value = e.target.value;
    setProgress(e.target, value);
  });
});
