// Each preview reorders or stretches the same synthesized fiber.
function makeFiberAudio(audio) {
  const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.28), audio.sampleRate);
  const samples = buffer.getChannelData(0);
  let number = 1205;
  let smooth = 0;

  for (let i = 0; i < samples.length; i++) {
    const time = i / audio.sampleRate;
    number = (number * 16807) % 2147483647;
    const grain = number / 1073741823 - 1;
    smooth = 0.85 * smooth + 0.15 * grain;
    const tone = Math.sin(time * 2 * Math.PI * 340) + 0.35 * Math.sin(time * 2 * Math.PI * 603);
    const attack = Math.min(1, i / 160);
    const envelope = attack * Math.exp(-time * 28);
    samples[i] = envelope * (0.42 * smooth + 0.16 * tone);
  }
  return buffer;
}

function enableSoundPreviews(currentEdition) {
  const buttons = document.querySelectorAll('[data-sound]');
  const status = document.querySelector('#sound-status');
  let audio;
  let fiber;
  let playing = [];
  let request = 0;

  for (const button of buttons) {
    button.disabled = false;
    button.addEventListener('click', async () => {
      const choice = ++request;
      try {
        if (!audio) {
          audio = new AudioContext();
          fiber = makeFiberAudio(audio);
        }
        await audio.resume();
        if (choice !== request) return;

        for (const source of playing) source.stop();
        playing = [];
        const start = audio.currentTime + 0.03;
        const { cloth, repair } = currentEdition();

        function playFiber(delay, rate, volume) {
          const source = audio.createBufferSource();
          const gain = audio.createGain();
          source.buffer = fiber;
          source.playbackRate.value = rate;
          gain.gain.value = volume;
          source.connect(gain).connect(audio.destination);
          source.onended = () => {
            playing = playing.filter((item) => item !== source);
            source.disconnect();
            gain.disconnect();
            if (playing.length === 0) status.textContent = 'Sound complete.';
          };
          playing.push(source);
          source.start(start + delay);
        }

        if (button.dataset.sound === 'fray') {
          for (let i = 0; i < 8; i++) {
            const row = cloth.rows[Math.floor(i * cloth.rows.length / 8)];
            const gap = row.right - row.left;
            playFiber(i * 0.045 + gap * 0.0007, 1.35 + gap * 0.009, 0.32);
          }
        } else if (button.dataset.sound === 'pull') {
          for (const stitch of repair.stitches) {
            const delay = stitch.index / (cloth.rows.length - 1) * 1.22;
            playFiber(delay, 1.4 - stitch.cost / 300, 0.42);
          }
        } else {
          const reach = repair.coverage.filter(Boolean).length / loom.bands;
          playFiber(0, 0.38 + 0.11 * reach, 0.62);
          playFiber(0.16, 0.29 + 0.15 * repair.remaining / Math.max(1, cloth.recovered), 0.4);
        }
        status.textContent = 'Playing ' + button.querySelector('.sound-name').textContent + '.';
      } catch {
        status.textContent = 'Audio is unavailable in this browser.';
      }
    });
  }
}
