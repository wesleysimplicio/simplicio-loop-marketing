'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const NARRATION_PATH = path.join(ROOT, 'video', 'src', 'why', 'narration.json');

test('why-video narration script defines a shared nine-scene timeline', () => {
  const narration = JSON.parse(fs.readFileSync(NARRATION_PATH, 'utf8'));
  assert.equal(narration.timeline.length, 9);
  const totalFrames = narration.timeline.reduce(
    (sum, cue) => sum + cue.durationInFrames,
    0,
  );
  assert.equal(totalFrames, 1590);
});

test('why-video narration tracks stay aligned with the timeline and generated assets', () => {
  const narration = JSON.parse(fs.readFileSync(NARRATION_PATH, 'utf8'));
  for (const lang of ['pt', 'en']) {
    const track = narration.tracks[lang];
    assert.equal(track.cues.length, narration.timeline.length);
    const audioPath = path.join(ROOT, 'video', 'public', track.output);
    assert.equal(fs.existsSync(audioPath), true, `missing ${track.output}`);
    const captionsPath = path.join(ROOT, 'video', 'public', 'captions', `why-${lang}.srt`);
    assert.equal(fs.existsSync(captionsPath), true, `missing captions for ${lang}`);
  }
});
