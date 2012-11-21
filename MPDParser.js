"use strict";

/* 

Original from http://dash-mse-test.appspot.com/

Copyright 2012 Google Inc.
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
 * 0.2-133-g5836f87
 */

define(function(){
 	
	var parser = function (mpdText) {
		var parser = new DOMParser();
  		var dom = parser.parseFromString(mpdText, "text/xml");
  		return StrobeParseMPD(dom.firstChild);
	}
	
	
 
 	/**
 * @fileoverview MPEG-DASH manifest parser
 * @author strobe@google.com (Steven Robertson)
 */
	function id(x) {
	  return x;
	}
	
	// --- DASH manifest parsing ---
	
	function parseDuration(dur_str) {
	  // Unsupported: date part of ISO 8601 durations
	  var re = /PT(([0-9]*)H)?(([0-9]*)M)?(([0-9.]*)S)?/;
	  var match = re.exec(dur_str);
	  if (!match) return parseFloat(dur_str);
	  return (parseFloat(match[2] || 0) * 3600 +
			  parseFloat(match[4] || 0) * 60 +
			  parseFloat(match[6] || 0));
	}
	
	function parseChildElements(node_name, parse_func, xml) {
	  var result = [];
	  if (xml == null) return result;
	  for (var child = xml.firstElementChild; child != null;
		   child = child.nextElementSibling) {
		if (child.nodeName == node_name) {
		  result.push(parse_func(child));
		}
	  }
	  return result;
	}
	
	function parseChildElement(node_name, parse_func, xml) {
	  return parseChildElements(node_name, parse_func, xml)[0] || null;
	}
	
	function parseAttributes(attr_map, xml, result) {
	  result = result || {};
	  for (var k in attr_map) {
		if (xml.attributes.getNamedItem(k) != null)
		  result[k] = attr_map[k](xml.attributes[k].value);
	  }
	  return result;
	}
	
	function parseFrameRate(str) {
	  var match = /([0-9]+)(\/([0-9]+))?/.exec(str);
	  if (!match) return 1;
	  if (!match[3]) return parseFloat(match[1]);
	  return parseFloat(match[1]) / (parseFloat(match[3]) || 1);
	}
	
	function parseByteRange(str) {
	  var match = /([0-9]+)-([0-9]+)/.exec(str);
	  if (!match) return null;
	  var start = parseInt(match[1]), end = parseInt(match[2]);
	  return { start: start, end: end, length: end - start + 1 };
	}
	
	var SegmentURLAttributes =
		{ media: id
		, mediaRange: parseByteRange
		, index: id
		, indexRange: parseByteRange
		};
	
	function parseSegmentURL(xml) {
	  return parseAttributes(SegmentURLAttributes, xml);
	}
	
	function parseBaseURL(xml) {
	  // Unsupported: service locations
	  return xml.textContent;
	}
	
	function parseInitialization(xml) {
	  // MP4 specific
	  return parseByteRange(xml.attributes.range.value);
	}
	
	// Includes MultipleSegmentBaseAttributes.
	var SegmentBaseAttributes =
		{ timescale: parseInt
		, duration: parseInt
		, indexRange: parseByteRange
		, presentationTimeOffset: parseInt
		, startNumber: parseInt
		};
	
	function parseSegmentBase(xml) {
	  // Unsupported: @indexRangeExact, RepresentationIndex, SegmentTimeline,
	  // BitstreamSwitching
	  var result = parseAttributes(SegmentBaseAttributes, xml);
	  result.initialization = parseChildElement(
		  'Initialization', parseInitialization, xml);
	  return result;
	}
	
	function parseSegmentList(xml) {
	  // Unsupported: @xlinks, @actuate, SegmentTimeline, BitstreamSwiching
	  var result = parseSegmentBase(xml);
	  if (result.timescale && result.duration) {
		result.durationSeconds = result.duration / result.timescale;
	  } else {
		result.durationSeconds = result.duration;
	  }
	  result.segmentURLs = parseChildElements('SegmentURL', parseSegmentURL, xml);
	  return result;
	}
	
	function dehex(str) {
	  var ab = new ArrayBuffer(str.length / 2);
	  var u8 = new Uint8Array(ab);
	  for (var i = 0; i * 2 < str.length; i++)
		u8[i] = parseInt(str.substring(i*2,(i+1)*2), 16);
	  return u8;
	}
	
	function parseContentProtection(xml) {
	  // TODO(strobe): Check namespaces and so on
	  var result = [];
	  for (var l = xml.firstElementChild; l != null; l = l.nextElementSibling) {
		var kid = dehex(l.attributes['keyid'].value);
		var key = dehex(l.attributes['key'].value);
		if (kid != null && key != null)
		  result.push({'id': kid, 'key': key});
	  }
	  return result;
	}
	
	var SegmentTemplateAttributes =
	{
		timescale: parseInt,
		duration: parseInt,
		media: id,
		startNumber: parseInt,
		initialization: id
	}
	
	function parseSegmentTemplate(xml)
	{
		var result = parseAttributes(SegmentTemplateAttributes, xml)
		return result;
	}
	
	var RepresentationBaseAttributes =
		{ id: parseInt
		, profiles: id
		, width: parseInt
		, height: parseInt
		, frameRate: parseFrameRate
		, audioSamplingRate: parseInt
		, mimeType: id
		, codecs: id
		};
	
	function parseRepresentationBase(xml) {
	  // Unsupported: @sar, @segmentProfiles, @maximumSAPPeriod, @startWithSAP,
	
	  // @maxPlayoutRate, @codingDependency, @scanType, FramePacking,
	  // AudioChannelConfiguration, ContentProtection, SegmentBase
	  var result = parseAttributes(RepresentationBaseAttributes, xml);
	  result.baseURLs = parseChildElements(
				'BaseURL', parseBaseURL, xml);
	  result.segmentTemplate = parseChildElement(
				'SegmentTemplate', parseSegmentTemplate, xml);
	  result.segmentBase = parseChildElement(
				'SegmentBase', parseSegmentBase, xml);
	  result.segmentList = parseChildElement(
				'SegmentList', parseSegmentList, xml);
	  result.contentProtection = parseChildElement(
				'ContentProtection', parseContentProtection, xml);
	  return result;
	}
	
	var RepresentationAttributes =
		{ bandwidth: parseInt
		, qualityRanking: parseInt
		};
	
	function parseRepresentation(xml) {
	  // Unsupported: @dependencyId, @mediaStreamStructureId, SubRepresentation,
	  var result = parseRepresentationBase(xml);
	  parseAttributes(RepresentationAttributes, xml, result);
	  return result;
	}
	
	var AdaptationSetAttributes =
		{
			lang: id
		}
	
	function parseAdaptationSet(xml) {
	  // Unsupported: @contentType, @par, @minBandwidth, @maxBandwidth,
	  // @minWidth, @maxWidth, @minHeight, @maxHeight, @minFrameRate,
	  // @maxFrameRate, @segmentAlignment, @bitstreamSwitching,
	  // @subsegmentAlignment, @subsegmentStartsWithSAP, Accessibility,
	  // Role, Rating, Viewpoint, ContentComponent, SegmentTemplate
	  //
	  // TODO(strobe): ContentComponent, SegmentTemplate
	  var result = parseRepresentationBase(xml);
	  parseAttributes(AdaptationSetAttributes, xml, result);
	  result.representations = parseChildElements(
		  'Representation', parseRepresentation, xml);
	  return result;
	}
	
	var PeriodAttributes =
		{ id: parseInt
		, start: parseDuration
		, duration: parseDuration
		};
	
	function parsePeriod(xml) {
	  // Unsupported: @href, @actuate, @bitstreamSwitching, SegmentTemplate
	  var result = parseRepresentationBase(xml);
	  parseAttributes(PeriodAttributes, xml, result);
	  result.adaptationSets = parseChildElements(
		  'AdaptationSet', parseAdaptationSet, xml);
	  return result;
	}
	
	function parseProfile(str) {
		var splittedString = str.split(':');
		var l = splittedString.length;
		var result = {};
		result.name = splittedString[l-2];
		result.year = splittedString[l-1];
		
		return result;
	}
	
	function StrobeParseMPD(xml) {
	  // Unsupported: @id, @type, @availabilityStartTime,
	  // @availabilityEndTime, @minimumUpdatePeriod,
	  // @timeShiftBufferDepth, @suggestedPresentationDelay,
	  // @maxSubsegmentDuration, ProgramInformation,
	  // Location, Metrics
	  var result = {};
	  parseAttributes({mediaPresentationDuration: parseDuration, minBufferTime : parseDuration, maxSegmentDuration : parseDuration, profiles : parseProfile}, xml, result);
	  result.periods = parseChildElements('Period', parsePeriod, xml);
	  result.baseURLs = parseChildElements('BaseURL', parseBaseURL, xml);

	  return result;
	}
	
   return {
	  parseMPD : parser
   };
});