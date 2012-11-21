"use strict";

define(['../isobmffManager', '../utils'], function(ISOBMFF, utils){
 
  var ProfileFull = function (video,src)
  {
	  this.video = video;
	  this.url_mpd = src;
	  this.map = {periods : new Array()};
	  this.ready = false; // passe à true qd on a la liste des differents morceaux
	  					  //idealement la taille aussi mais ds le cas de certains profiles c'est pas forcement le cas.
						  // auquel cas si il manque la taille, ready = true, mais lors des demandes d'infos des pieces il faudra faire une 
						  // une requete head pour la recuperer
  }
 
 
   
  ProfileFull.prototype.create_map = function(mpd, callback)
  {
	  //Store the callBackFunction in a property of the class
	  this.passMapToMPDManager = callback;
	  
	  
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
					
					var currentAdaptationSet = mpd.periods[p].adaptationSets[i];
					
					if (currentAdaptationSet.lang)
					{
						aset.lang = currentAdaptationSet.lang;
					}
					
					//Going through representations
					for (var j = 0; j < currentAdaptationSet.representations.length;j++)
					{
						var tr = mpd.periods[p].adaptationSets[i].representations[j];
						if(tr.mimeType)
						{
							aset.type = tr.mimeType.slice(0,tr.mimeType.lastIndexOf('/'));
						}
						
						if (!aset.lang)
						{
							if (tr.lang)
							{
								aset.lang = tr.lang;	
							}
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
											url : utils.absURL(this.url_mpd, aset.segmentTemplate.initialization.replace('$RepresentationID$', tr.id),
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
					
					console.log('langue :' + aset.lang);
					
					period.asets.push(aset);
		  }
		  this.map.periods.push(period);
	  }
	  
	  this.load_inits(null);
	  
  }
  
  ProfileFull.prototype.load_inits = function (result)
  {
	if(result)
	{
		console.log(this.map.periods);

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
	  this.passMapToMPDManager(this.map);
  }
  
 
  return (ProfileOnDemand);
});