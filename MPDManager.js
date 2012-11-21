"use strict";

define(['./MPDParser', './isobmffManager', './utils', './MPDProfiles/ProfileOnDemand'], function(MPDParser, ISOBMFF, utils, ProfileOnDemand){
 
  var MPDManager = function (video,src)
  {
	  this.video = video;
	  this.url_mpd = src;
	  this.map = {periods : new Array()};
	  this.ready = false; // passe à true qd on a la liste des differents morceaux
	  					  //idealement la taille aussi mais ds le cas de certains profiles c'est pas forcement le cas.
						  // auquel cas si il manque la taille, ready = true, mais lors des demandes d'infos des pieces il faudra faire une 
						  // une requete head pour la recuperer
  }
 
  MPDManager.prototype.set_onManifestReady = function (cb)
  {
	  this.cb_ready = cb;
	  // renvoi des infos de pistes tracks etc...
  }
 
  MPDManager.prototype.loadMPD = function ()
  {
	  console.log("loading " + this.url_mpd);
	  this.video.dlm.getUrl( { url : this.url_mpd, responseType : 'text' }, this.onMPDLoaded.bind(this));
  };
  
  MPDManager.prototype.onMPDLoaded = function (result) 
  {
	  this.create_map(MPDParser.parseMPD(result.response));
  }
  
  MPDManager.prototype.create_map = function(mpd)
  {
	  /*
	  this.map.minBufferTime = mpd.minBufferTime;
	  
	  //Going through periods
	  for (var p = 0; p < mpd.periods.length; p++)
	  {
		  	var period = { asets : new Array() };
	  		period.duration = mpd.periods[p].duration || mpd.mediaPresentationDuration;
	  		
			//Going through adaptations sets
	  		for (var i = 0; i < mpd.periods[p].adaptationSets.length; i++) 
	  		{
					var aset = { reps : new Array() };//, type : aset.mimeType.slice(0,aset.mimeType.lastIndexOf('/')) };
					
					//Going through representations
					for (var j = 0; j < mpd.periods[p].adaptationSets[i].representations.length;j++)
					{
						var tr = mpd.periods[p].adaptationSets[i].representations[j];
						if(tr.mimeType)
						{
							aset.type = tr.mimeType.slice(0,tr.mimeType.lastIndexOf('/'));
						}
						
						var rep = {bandwidth:tr.bandwidth,
								   segments:new Array(),
								   mime : tr.mimeType || aset.mimeType,
								   id_rep : j,
								   type:aset.type
						  		  };
						rep.codecs = tr.codecs || aset.codecs;
		      			rep.codecs = rep.codecs.replace(/0x/, '');
		    			if (rep.codecs == 'unknown') rep.codecs = 'mp4a.40.2'; 
						if(tr.segmentBase)
						{
							rep.init = {
											url : utils.absURL(this.url_mpd, tr.baseURLs[0]),
											start : (tr.segmentBase.initialization && tr.segmentBase.initialization.start) || 0,
											end : tr.segmentBase.indexRange.end ||  (tr.segmentBase.initialization && tr.segmentBase.initialization.end),
											value : null
										};
						}
						if(tr.segmentList)
						{
							// a determiner	
						} else {
							// mouais...
							rep.url = rep.init.url;
						}
				
						aset.reps.push(rep);
					}
					period.asets.push(aset);
		  }
		  this.map.periods.push(period);
	  }
	  */
	  
	  if (mpd.profiles.name = 'isoff-on-demand')
	  {
		  var onDemand = new ProfileOnDemand(this.video, this.url_mpd);
		  onDemand.create_map(mpd, this.onMapReady.bind(this));
	  }
  }
  
  MPDManager.prototype.onMapReady = function(map) {
	  this.map = map;
	  this.ready = true;
	  if(this.cb_ready)
	  {
		  this.cb_ready();
	  }
  }
  
  /*
  MPDManager.prototype.load_inits = function (result)
  {
	if(result)
	{
		this.map.periods[result.pptes.rep.id_period].asets[result.pptes.rep.id_aset].reps[result.pptes.rep.id_rep].init.value = result.response;
		this.map.periods[result.pptes.rep.id_period].asets[result.pptes.rep.id_aset].reps[result.pptes.rep.id_rep].segments = this.map.periods[result.pptes.rep.id_period].asets[result.pptes.rep.id_aset].reps[result.pptes.rep.id_rep].segments.concat(ISOBMFF.parseSIDX(result.response));
	}
		  
	for ( var p=0; p < this.map.periods.length; p++)
	{
		 for(var i=0;i < this.map.periods[p].asets.length;i++)
		 {
	   		  for(var j=0;j<this.map.periods[p].asets[i].reps.length;j++)
		  	  {
				  if(!this.map.periods[p].asets[i].reps[j].init.value)
				  {
					  	this.video.dlm.getUrl( { url : this.map.periods[p].asets[i].reps[j].init.url, // on reprends celle de l'init, en tout cas en onDemand
												 responseType : 'arraybuffer',
												 range : { start : this.map.periods[p].asets[i].reps[j].init.start,
												 		   end : this.map.periods[p].asets[i].reps[j].init.end },
												 pptes : { rep : {id_period: p, id_aset: i, id_rep: j} }
												}, this.load_inits.bind(this) );
						return;
				  }
			  }
		  }
	  }
	  
	  this.ready = true;
	  console.log(this.map);
	  if(this.cb_ready)
	  {
		  this.cb_ready();
	  }
  }
  */
  
  MPDManager.prototype.getInit = function (period, tobuffer) 
  {
	  //tobuffer tableau de {id_aset,id_rep}
	  var inits = new Array();
	  for(var i=0;i<tobuffer.length;i++)
	  {
		  inits.push({ v : ISOBMFF.extractInit(this.map.periods[period].asets[tobuffer[i].id_aset].reps[tobuffer[i].id_rep].init.value), 
		  			   mimecodec : this.map.periods[period].asets[tobuffer[i].id_aset].reps[tobuffer[i].id_rep].mime + '; codecs="' + this.map.periods[period].asets[tobuffer[i].id_aset].reps[tobuffer[i].id_rep].codecs + '"'});
	  }
	  return {duration : this.map.periods[period].duration, inits : inits};
  }
  
  MPDManager.prototype.getPartForTime = function(period, time,id_aset,id_rep)
  {
	  var segments = this.map.periods[period].asets[id_aset].reps[id_rep].segments;
	  for(var i=0; i<segments.length;i++)
	  {
		  if(segments[i].time<= time && segments[i].time + segments[i].duration > time)
		  {
			  return {id_period: period, id_rep : id_rep, id_aset:id_aset, idPiece : i, segment : segments[i]}; // on passe le segment il servira ds le bufferManager et le download manager pour les infos de duree etc..
		  }
	  }
	  return null;
  }
  
  MPDManager.prototype.getPieceInfos = function(piece)
  {
	  var seg = this.map.periods[piece.id_period].asets[piece.id_aset].reps[piece.id_rep].segments[piece.idPiece];
	  return {url : seg.url || this.map.periods[piece.id_period].asets[piece.id_aset].reps[piece.id_rep].url,
	  		  range : {start : seg.offset, end : seg.offset + seg.size - 1},
			  downloading : seg.downloading };
  }
 
  MPDManager.prototype.markAsDownloading = function(piece,id)
  {
	  this.map.periods[piece.id_period].asets[piece.id_aset].reps[piece.id_rep].segments[piece.idPiece].downloading = id | false;
  }
  
  MPDManager.prototype.markAsDownloaded = function(piece)
  {
	  this.map.periods[piece.id_period].asets[piece.id_aset].reps[piece.id_rep].segments[piece.idPiece].downloaded = true;
  }
  
  
  return (MPDManager);
});