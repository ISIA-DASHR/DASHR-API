'use strict';
/* Copyright 2012 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * 0.2-89-gaacf054
 */

(function() {

window.hasMediaSource = function() {
  if (window.MediaSource != null || window.webkitMediaSource != null)
    return true;
  var v = document.createElement('video');
  if (v.webkitSourceAddId == null && v.sourceAddId == null) {
    log('Media Source not found!');
    return false;
  }
  // TODO(strobe): fix this test.
  /*
  try {
    v.src = v.webkitMediaSourceURL;
    v.webkitSourceAddId('test', 'video/mp4; codecs="avc1.4d401f"');
  } catch (e) {
    console.log(e);
    log('Adding AVC source failed!');
    return false;
  }
  */
  return true;
}

window.attachMediaSource = function(video, msrc) {
  if (msrc.msWrapperAttach != null) {
    msrc.msWrapperAttach(video);
  } else if (window.URL != null && window.MediaSource != null) {
    video.src = window.URL.createObjectURL(msrc);
  } else if (window.webkitURL != null && window.MediaSource != null) {
    video.src = window.webkitURL.createObjectURL(msrc);
  } else {
    throw "Could not find supported method to attach media source";
  }
}

var dlog = window.dlog || console.log.bind(console);

// Don't even bother executing the rest if the browser already has what we need.
if (window.MediaSource != null) {
    window.MediaSource.prototype.version = 'MSE-live';
    return;
}

if (window.WebKitMediaSource != null) {
  window.MediaSource = window.WebKitMediaSource;
  window.MediaSource.prototype.version = 'MSE-live-webkit';
  return;
}

// Don't create the wrapper if we don't have MSE
if (!hasMediaSource()) return;

function MediaSource() {
  this.sourceBuffers = [];
  this.activeSourceBuffers = this.sourceBuffers;
  this.duration = 0;
  this.readyState = "closed";

  this.msWrapperVideo = null;
  this.msWrapperSourceIdCount = 1;
  this.msWrapperHandlers = {};
  this.msWrapperAppended = false;
}

MediaSource.prototype.version = 'MSE-v0.5-wrapped';

MediaSource.prototype.msWrapperHandler = function(name, evt) {
  var handlers = this.msWrapperHandlers[name] || [];
  dlog(4, "In msWrapperHandler");
  this.readyState = name;
  for (var i = 0; i < handlers.length; i++) {
    handlers[i].call(evt, evt);
  }
}

MediaSource.prototype.msWrapperAttach = function(video) {
  dlog(4, "In msWrapperAttach");
  var names = ['open', 'close', 'ended'];
  for (var i = 0; i < names.length; i++) {
    var h = this.msWrapperHandler.bind(this, names[i]);
    v.addEventListener('source' + names[i], h);
    v.addEventListener('webkitsource' + names[i], h);
  }
  if (video.mediaSourceURL != null) {
    video.src = video.mediaSourceURL;
  } else if (video.webkitMediaSourceURL != null) {
    video.src = video.webkitMediaSourceURL;
  } else {
    throw "Could not find mediaSourceURL";
  }
  this.msWrapperVideo = video;
}

MediaSource.prototype.addSourceBuffer = function(type) {
  if (this.msWrapperVideo == null) throw "Unattached";
  var id = '' + this.msWrapperSourceIdCount;
  this.msWrapperSourceIdCount += 1;

  if (this.msWrapperVideo.sourceAddId != null) {
    this.msWrapperVideo.sourceAddId(id, type);
  } else if (this.msWrapperVideo.webkitSourceAddId != null) {
    this.msWrapperVideo.webkitSourceAddId(id, type);
  } else {
    throw "No sourceAddId";
  }
  var buf = new SourceBuffer(this.msWrapperVideo, id);
  this.sourceBuffers.push(buf);
  return buf;
}

MediaSource.prototype.removeSourceBuffer = function(buf) {
  // TODO
}

MediaSource.prototype.endOfStream = function(error) {
  // TODO
}

MediaSource.prototype.addEventListener = function(name, handler) {
  var re = /(webkit)?source(open|close|ended)/;
  var match = re.exec(name);
  if (match && match[2]) {
    name = match[2];
    var l = this.msWrapperHandlers[name] || [];
    l.push(handler);
    this.msWrapperHandlers[name] = l;
  } else {
    throw "Unrecognized event name: " + name;
  }
}


function SourceBuffer(video, id) {
  this.msWrapperVideo = video;
  this.msWrapperSourceId = id;
  this.msWrapperTimestampOffset = 0;
}

function FakeSourceBufferedRanges() {
  this.length = 0;
}

SourceBuffer.prototype.msWrapperGetBuffered = function() {
  dlog(4, "In msWrapperGetBuffered");

  // Chrome 22 doesn't like calling sourceBuffered() before initialization
  // segment gets appended.
  if (!this.msWrapperAppended) return new FakeSourceBufferedRanges();

  var v = this.msWrapperVideo;
  var id = this.msWrapperSourceId;
  if (v.sourceBuffered != null) {
    return v.sourceBuffered(id);
  } else if (v.webkitSourceBuffered != null) {
    dlog(4, "Getting webkitSourceBuffered", id);
    dlog(4, v.webkitSourceBuffered(id));
    return v.webkitSourceBuffered(id);
  } else {
    throw "No sourceBuffered";
  }
}

SourceBuffer.prototype.append = function(bytes) {
  dlog(4, "In append");
  var v = this.msWrapperVideo;
  var id = this.msWrapperSourceId;
  if (v.sourceAppend != null) {
    v.sourceAppend(id, bytes);
  } else if (v.webkitSourceAppend != null) {
    v.webkitSourceAppend(id, bytes);
  } else {
    throw "No sourceAppend";
  }
  this.msWrapperAppended = true;
}

SourceBuffer.prototype.abort = function() {
  dlog(4, "In abort");
  var v = this.msWrapperVideo;
  var id = this.msWrapperSourceId;
  if (v.sourceAbort != null) {
    v.sourceAbort(id);
  } else if (v.webkitSourceAbort != null) {
    v.webkitSourceAbort(id);
  } else {
    throw "No sourceAbort";
  }
}

// TODO(strobe): Will Opera support property accessors?
Object.defineProperty(SourceBuffer.prototype, "timestampOffset",
    { get: function() { return this.msWrapperTimestampOffset; }
    , set: function(o) {
        this.msWrapperTimestampOffset = o;
        this.msWrapperVideo.sourceTimestampOffset(this.msWrapperSourceId, o);
      }
    });

Object.defineProperty(SourceBuffer.prototype, "buffered",
    { get: SourceBuffer.prototype.msWrapperGetBuffered
    });

window.MediaSource = MediaSource;
})();
