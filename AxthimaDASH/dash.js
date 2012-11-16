"use strict";

define(['./BufferManager', './MPDManager', './DownloadManager', './utils'], function(BufferManager, MPDManager, DownloadManager, utils){
 
  var Dash = function (video, src, event_handlers,forcedTracks)
  {
	  this.video = video;
	  this.video.event_handlers = event_handlers;
	  
	  if (window.MediaSource!=null)
	  {
	  	  this.video.ms = new MediaSource();
	  } 
	  else if(window.webkitMediaSource = window.WebKitMediaSource || window.webkitMediaSource) 
	  {
		  this.video.ms = new webkitMediaSource();
	  }
	  else 
	  {
		  throw("Media Source Not available");
	  }
	  
	  this.video.addEventListener('ended', this.onEnded.bind(this));
	  this.video.addEventListener('stalled', this.onStalled.bind(this));
  	  //players[i].addEventListener('timeupdate', players[i].dash.onProgress);
      //this.video.addEventListener('pause', this.onPause.bind(this));
      //this.video.addEventListener('play', this.onPlay.bind(this)); // bind pour rester ds le contexte de la classe
      // players[i].addEventListener('webkitneedkey', onNeedKey.bind(vid, msrc));
      // players[i].addEventListener('webkitkeymessage', onKeyMessage.bind(vid, msrc));
	  
	  if (window.URL != null) 
	  {
   		 this.video.src = window.URL.createObjectURL(this.video.ms);
      } 
	  else if (window.webkitURL = window.webkitURL || window.WebKitURL) 
	  {
    	 this.video.src = window.webkitURL.createObjectURL(this.video[i].ms);
  	  }
	  
	  this.video.dlm = new DownloadManager(this.video);
	  
	  this.video.buffer = new BufferManager(this.video, 5, 15);
	  this.video.buffer.set_onBufferReady(this.bufferReady.bind(this));
	  this.video.buffer.set_onInitiated(this.bufferInitiated.bind(this));
	  this.video.buffer.set_onQoS(this.ManageQoS.bind(this));
	  
	  this.video.mpd = new MPDManager(this.video,src);
	  this.video.mpd.set_onManifestReady(this.manifestReady.bind(this));
	  this.video.mpd.loadMPD();
	  
	  this.want_to_play = false;
	  
	  this.currentTracks = {};
	  // chaque elem est {id_aset, id_rep} et les cles st le type de track
	  this.currentPeriod = 0;
	  	  
	  
	  if(forcedTracks) 
	  // note : pas besoin de specifier un id_rep ni tous les tracks
	  // parametre optionnel : autoswitch. si à false, c comme un switch manuel qui a ete efectue et on ne fera pas de switch auto là dessus sauf si lutilisateur repasse ce track en auto
	  {
		  //
		  console.log('fooorceeed');
		  console.log(forcedTracks);
		  this.currentTracks = forcedTracks;
	  }
	  
	  
	  
  }
  
  Dash.prototype.bufferInitiated = function() 
  {
	  /*
	  if(!this.want_to_play) // si une video n'est pas faite pour etre jouer, la precharger via le p2p tout de meme ?
	  {
		  this.video.dlm.set_p2p(); //a gerer en dehors du buffering manager
	  }
	  */
	  //set window pour le p2p si le p2p est active ds les options
  }
  
  Dash.prototype.bufferReady = function() 
  {
	  if(this.want_to_play && this.video.paused)
	  {
		  this.play();
	  }
  }
  
  
  Dash.prototype.manifestReady = function() 
  { 
  
  		// mise en place des paramètres de buffer
		this.video.buffer.emergencyMarge = this.video.mpd.map.minBufferTime | 2;
		this.video.buffer.bufferMarge = (this.video.buffer.emergencyMarge + this.video.mpd.map.maxSegmentDuration) | (4 * this.video.buffer.emergencyMarge); // idéalement il faut que ce soit emergencyMarge + maxSegmentDuration pour etre sur d'avoir tjrs un segment d'avance
  	   
	   //on fini de mettre les aset et representation pas preconfiguree
	        for(var i = 0; i<this.video.mpd.map.periods[this.currentPeriod].asets.length; i++)
		   {
			   var aset = this.video.mpd.map.periods[this.currentPeriod].asets[i];
			   if(!this.currentTracks[aset.type])
			   {
				   this.currentTracks[aset.type] = {id_aset : i};
			   } else {
				   //checker le type contre le MPDManager
				   
				   if(this.currentTracks[aset.type].id_rep!= undefined)
				   {
					   //checker l'existence contre le MPDManager
					   
					   this.currentTracks[aset.type].autoswitch = false;
				   }
			   }
		   }
		   this.chooseReps(); //choix auto des id_rep
           
	   
	   
	   if(this.video.event_handlers.onMetaData)
	  {
		  //creation de la track list à renvoye
		  //mettre les tracks selectionnés serait cool!
		  var tracklist = new Array();
		  for (var i= 0; i< this.video.mpd.map.periods[this.currentPeriod].asets.length; i++)
		  {
			  
			  for (var j = 0; j<this.video.mpd.map.periods[this.currentPeriod].asets[i].reps.length; j++)
			  {
				  var track = {bandwidth : this.video.mpd.map.periods[this.currentPeriod].asets[i].reps[j].bandwidth, id_rep : j, lang : this.video.mpd.map.periods[this.currentPeriod].asets[i].reps[j].lang || this.video.mpd.map.periods[this.currentPeriod].asets[i].lang || null};
			  	  track.type = this.video.mpd.map.periods[this.currentPeriod].asets[i].type || null;
				  track.id_aset = i;
				  if(track.type)
				  {
				  		track.selected = (this.currentTracks[track.type].autoswitch == false && this.currentTracks[track.type].id_aset == track.id_aset && this.currentTracks[track.type].id_rep == track.id_rep); // si le track a ete selectionne et l'autoswitch desactive pour ce track, par configuration
				  }
			  	  tracklist.push(track);
			  }
			  
			  tracklist.push({auto : true, type : track.type, id_aset : track.id_aset, selected : (this.currentTracks[track.type].id_aset == track.id_aset && this.currentTracks[track.type].autoswitch!==false) });
			  
		  }
		  
		
		  
		  this.video.event_handlers.onMetaData(tracklist);
	  }
	  
	  
	  //initialisation des buffers
	  var tobuffer = new Array();
	  for(var type in this.currentTracks)
	  {
		  tobuffer.push(this.currentTracks[type]);
	  }
	  this.video.buffer.initBuffer(this.currentPeriod, tobuffer);
	  
  }
 
  
  Dash.prototype.onEnded = function()
  {
	  /*
	  this.video.pause();
	  this.video.currentTime = 0;
	  */
	  console.log('fin');
	  this.ended = true;
	  if(this.video.event_handlers.onFinish)
	  {
		  this.video.event_handlers.onFinish();
	  }
  }
  
  Dash.prototype.onStalled = function()
  {   
	  if(this.video.currentTime == 0) // hack de merde qui rattrape le non lancement de la lecture...
	  {
      	this.video.currentTime = 0;
	  }
  }
  
  Dash.prototype.chooseReps = function () 
  {
	  
	  var reservedBW=0;
	  //determination des tracks à controler en auto;
	  var chooseIn = new Array();
	  for(var type in this.currentTracks)
	  {
		  if(this.currentTracks[type].autoswitch !== false)
		  {
			  chooseIn.push(this.video.mpd.map.periods[this.currentPeriod].asets[this.currentTracks[type].id_aset].reps);
		  } else 
		  {
			  reservedBW+=this.video.mpd.map.periods[this.currentPeriod].asets[this.currentTracks[type].id_aset].reps[this.currentTracks[type].id_rep].bandwidth;
		  }
	  }
	  
	  if(chooseIn.length == 0) { return; }
	  
	  function listesPossibles(cIn)
	  {
		  if(!cIn.length)
		  {
			  return [[]];
		  }
		  else 
		  {
			  var K=listesPossibles(cIn.slice(1));
			  var toreturn=new Array();
			  for(var i=0;i<cIn[0].length;i++)
			  {
				  for(var j=0;j<K.length;j++)
				  {
					  toreturn.push([cIn[0][i]].concat(K[j]));
				  }
			  }
			  return toreturn;
		  }
	  }
	  
	  
	  //determination des combinaisons possibles
	  var possibles = listesPossibles(chooseIn);
	  
	  //détermination de la plus optimale
	  var maxBW = -1;
	  var minBW = Infinity;
	  var currentMin=-1;
	  var currentPossible=-1;
	  var estimatedBandwidth = this.video.dlm.getEstimatedBandwidth() * 8 * 1024; // en bit/s
	  
	  //console.log('Estimation de bp sur laquelle se base le choix '+estimatedBandwidth);
	  
	  for(var i=0;i<possibles.length;i++)
	  {
		  var bw=0;
		  //var coefBW=0; //calcul avec un coef pour la video car c'est elle qu'on cherche a maximiser qd meme!
		  for(var j=0; j<possibles[i].length; j++)
		  {
			  bw+=possibles[i][j].bandwidth;
		  }
		  if(bw<(estimatedBandwidth-reservedBW) && bw>maxBW)
		  {
			  maxBW=bw;
			  currentPossible = i;
		  }
		   if(bw<minBW)
		  {
			  minBW=bw;
			  currentMin = i;
		  }
	  }
	  
	  if(currentPossible == - 1)
	  {
	  		currentPossible = currentMin;
	  }
	  
	  for(var i=0; i<possibles[currentPossible].length;i++)
	  {
		  if(this.currentTracks[possibles[currentPossible][i].type].id_rep != possibles[currentPossible][i].id_rep)
		  {
			  this.currentTracks[possibles[currentPossible][i].type].id_rep = possibles[currentPossible][i].id_rep;
		  }
	  }
	  
  }
  
  Dash.prototype.ManageQoS = function (qos) 
  {
	  switch(qos.type)
	  {
		  //peut-etre faudrait-il aussi monitorer plus finement la bande passante pour switcher au milieu d'une partie si besoin?
	   		case 'emergency':
				if(!this.video.paused)
				{
					this.pause(true); // pause non demandée, etat de buffering
					//switch de representation si possible
				}
				break;
			case 'bufferInfos':
				 
							
				var old_currentTracks = utils.clone(this.currentTracks);
				
				this.chooseReps()
		  
				//check si il y a vrmt eu un chgt quelconque,
				for(var type in this.currentTracks)
				{
					if(this.currentTracks[type].id_aset!=old_currentTracks[type].id_aset || this.currentTracks[type].id_rep!=old_currentTracks[type].id_rep)
					{
						console.log('SWITCHING SMOOTHLY');
						
						this.switchRepresentation(old_currentTracks[type].id_aset, this.currentTracks[type].id_aset,this.currentTracks[type].id_rep,false); //changement smooth ici
						
					}
				}
				
				break;
	  }
  }
  
   Dash.prototype.ManualSwitchRepresentation = function (type,id_aset,id_rep)
  {
	  if(id_rep==-1) //auto command 
	  {
		  console.log('To AUTOSWITCH '+id_aset);
		  var old_id_aset = this.currentTracks[type].id_aset;
		  var old_id_rep = this.currentTracks[type].id_rep;
		  
		  //activation de l'autoswtich pour le tracj concerne
	  	  this.currentTracks[type].autoswitch = true;
		  this.currentTracks[type].id_aset = id_aset;
		  this.chooseReps()
		  
		  //check si il y a vrmt eu un chgt quelconque,
		  if(this.currentTracks[type].id_aset!=old_id_aset || this.currentTracks[type].id_rep!=old_id_rep)
		  {
			  console.log('SWITCHING SMOOTHLY');
			  this.switchRepresentation(old_id_aset, this.currentTracks[type].id_aset,this.currentTracks[type].id_rep,false); //changement smooth ici
		  }
	  }
	  else 
	  {
		  console.log('MANUAL SWITCH');
		  //desactivation du trackautoswitch pr le track concerne.
		  this.currentTracks[type].autoswitch = false;
		  //comme c un chgt manuel, on le veut instantannément à priori le chgt et pour toute la video
		  this.video.dlm.killPiecesDownloadsFromAset(this.currentTracks[type].id_aset);
		  this.switchRepresentation(this.currentTracks[type].id_aset, id_aset,id_rep,true);
		  this.currentTracks[type].id_aset = id_aset;
		  this.currentTracks[type].id_rep = id_rep;
	  }
  }
  
  Dash.prototype.switchRepresentation = function (id_aset_from,id_aset,id_rep,force)
  {
	  //force cest si on veut que le chgt soit instantanne
	  // sinon c'est chgt smooth : ça sera change pour les parties non bufferees, a priori c lautoswitch qui fera des demandes comme ça
	  
	  this.video.buffer.setAsetBufferFromTo(id_aset_from, id_aset,id_rep,force);
  }
  
  
 // ACTIONS METHODS //////////////
  
  Dash.prototype.setCurrentTime = function(t)
  {
	  //set buffer mode à juste local_Piece si on est en mode pause
	  if(!this.want_to_play)
	  {
		  this.video.buffer.set_buffering_mode(this.video.buffer.BUFFER_LOCAL_PIECE);
	  }
	  this.video.currentTime = t;
  }
  
  Dash.prototype.play = function ()
  {
	  console.log("playing");
	  
	  this.want_to_play = true;
	  if (this.video.buffer.is_ready && this.video.paused)
	  {
		  this.video.play();
	  } 
	  else if(!this.video.buffer.is_ready)
	  {
		  this.pause(true);
	  }
	  this.video.buffer.set_buffering_mode(this.video.buffer.STREAMING); // de toute façon on dit au buffer de se mettre en mode buffering
  }
  
  Dash.prototype.pause = function (waiting)
  {
	  console.log('pausing');
	  if(waiting) {
		  //fire buffering event
		  if(this.video.event_handlers.onBuffering)
		  {
				this.video.event_handlers.onBuffering();
		  }
	  } else {
		  this.want_to_play = 0;
		  if(this.underSpeed) 
		  { // cas où le QoS détermine que la bp dispo est inférieure à la plus petite résolution dispo ou à celle imposée
		  						// on assume le fait que l'utilisateur a du mettre pause pour attendre que ça charge
			  this.video.buffer.set_buffering_mode(this.video.buffer.PREBUFFERING_MAX); // mode pre-buffering à fond sans s'arreter
		  } 
		  else 
		  { // au choix suivant la politique souhaitée
			  this.video.dlm.set_p2p();
			  this.video.buffer.set_buffering_mode(this.video.buffer.STOP_BUFFERING);
		  }
	  }
	  this.video.pause();
  }
  
  
  Dash.prototype.getBuffered = function()
  {
	  return this.video.buffer.getVideoBufferedTimeRanges();
  }
 
  return (Dash);
});