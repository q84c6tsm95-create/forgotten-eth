// Auto-scroll for recently indexed box
window.addEventListener('load', function() {
  var list = document.querySelector('.recent-box-list');
  if (!list) return;
  var maxScroll = list.scrollHeight - list.clientHeight;
  if (maxScroll < 1) return;

  var paused = false;
  var pos = 0;
  var direction = 1;
  var waiting = 0;
  var PAUSE_FRAMES = 360; // 6 seconds at 60fps
  var SPEED = 0.07;

  list.addEventListener('mouseenter', function() { paused = true; });
  list.addEventListener('mouseleave', function() { paused = false; });

  function step() {
    if (!paused) {
      if (waiting > 0) {
        waiting--;
      } else {
        pos += SPEED * direction;
        if (pos >= maxScroll) {
          pos = maxScroll;
          direction = -1;
          waiting = PAUSE_FRAMES;
        } else if (pos <= 0) {
          pos = 0;
          direction = 1;
          waiting = PAUSE_FRAMES;
        }
        list.scrollTop = pos;
      }
    }
    requestAnimationFrame(step);
  }

  // Initial 6 second delay before starting
  setTimeout(function() {
    requestAnimationFrame(step);
  }, 6000);
});
