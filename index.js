'use strict';

var fs = require('fs');

var LF = 10;
var CR = 13;

/**
 * Generator based line reader
 *
 * @param {Number} [fd] The file descriptor
 * @param {Number} [filesize] The size of the file in bytes
 * @param {Number} [bufferSize] The size of the buffer in bytes
 * @param {Number} [position] The position where to start reading the file in bytes
 * @return {Object} The generator object
 */
function* readlines(fd, filesize, bufferSize, position) {
  if (typeof bufferSize === 'undefined') bufferSize = 1024;
  if (typeof position === 'undefined') position = 0;

  let lineBuffer;
  while (position < filesize) {
    let remaining = filesize - position;
    if (remaining < bufferSize) bufferSize = remaining;

    let readChunk = new Buffer(bufferSize);
    let curpos = 0;
    let startpos = 0;
    let bytesRead;
    try {
      bytesRead = fs.readSync(fd, readChunk, 0, bufferSize, position);
    } catch (err) {
      throw err;
    }

    let seenCR = false;
    let atend = false;
    while (curpos < bytesRead) {
      let curbyte = readChunk[curpos];
      let nextbyte = null;
      let atend = curpos >= bytesRead - 1;
      if (!atend) {
        nextbyte = readChunk[curpos+1];
      }
      // skip LF if seenCR before
      if (curbyte == LF && !seenCR || curbyte == CR) {
        // can yield?
        if (curbyte == LF || curbyte == CR && (nextbyte == LF || nextbyte != LF && !atend)) {
          yield _concat(lineBuffer, readChunk.slice(startpos, curpos));
          lineBuffer = undefined;
          if (curbyte == LF || nextbyte != LF && !atend) {
            startpos = curpos + 1;
          }
          else {
            startpos = curpos + 2;
            curpos++;
          }
        }
      }
      seenCR = curbyte == CR && atend;
      curpos++;
    }
    position += bytesRead;
    if (startpos < bytesRead) {
      lineBuffer = _concat(lineBuffer, readChunk.slice(startpos));
    }
  }
  // dump what ever is left in the buffer
  if (Buffer.isBuffer(lineBuffer)) yield lineBuffer;
};

/**
 * Combines two buffers
 *
 * @param {Object} [buffOne] First buffer object
 * @param {Object} [buffTwo] Second buffer object
 * @return {Object} Combined buffer object
 */
function _concat(buffOne, buffTwo) {
  if (!buffOne) return buffTwo;
  if (!buffTwo) return buffOne;

  let newLength = buffOne.length + buffTwo.length;
  return Buffer.concat([buffOne, buffTwo], newLength);
}

module.exports = readlines;
