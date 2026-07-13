'use strict';

function unavailable(name) {
  throw new Error(
    `[canvas-stub] ${name} is not available. Server MindAR compile uses sharp + tfjs CPU; do not import mind-ar OfflineCompiler.`,
  );
}

module.exports = {
  createCanvas: () => unavailable('createCanvas'),
  createImageData: () => unavailable('createImageData'),
  loadImage: () => unavailable('loadImage'),
  Image: function Image() {
    unavailable('Image');
  },
  Canvas: function Canvas() {
    unavailable('Canvas');
  },
};
