"use strict";

define(['./VirtualBufferedManager'], function(VirtualBufferedManager){
	var BufferManager = function(video,emergencyMarge,bufferMarge)
	{
		this.video = video;
		
		this.emergencyMarge = emergencyMarge; // specifie a quel moment on considere qu'on n'a plus le droit de lire
		this.bufferMarge = bufferMarge; // si bufferMarge < t(finbuffer) - t(lecture) demande la piece suivante
		
		this.bufs = new Array();
		
		this.STREAMING = 0;
		this.PREBUFFERING_MAX = 1;
		this.STOP_BUFFERING = 3;
		this.BUFFER_LOCAL_PIECE = 4;
		
		this.mode = this.STOP_BUFFERING;
		
		this.is_ready = false;
		this.is_initiated = false;

		
		this.bufferize();
	}
	
	BufferManager.prototype.set_onBufferReady = function(cb)
	{
		this.cb_bufferready = cb;
	}
	
	BufferManager.prototype.set_onInitiated = function(cb)
	{
		this.cb_initiated = cb;
	}
	
	BufferManager.prototype.set_onQoS= function(cb)
	{
		this.cb_qos = cb;
	}
	
	BufferManager.prototype.set_buffering_mode = function (mode) 
	{
		this.old_mode = this.mode;
		this.mode = mode;
	}
	
	
	BufferManager.prototype.getVideoBufferedTimeRanges = function()
	{
		//il faudrait plutot faire l'intersection des times range de chaque sourcebuffer
		// mais pour simplifier ou prend celui qui finit le plus proche de la position de lecture. 
		//c linfos la plus importante
		var bt = new Array();
		for(var i=0; i<this.storedBufferInfos.length; i++)
		{
			bt.push(this.getMaxBufferedTimeFromCurrentTime(this.storedBufferInfos[i])); 
		}
		
		return this.storedBufferInfos[bt.indexOf(Math.min.apply(null, bt))].buffered;
	}
	
	BufferManager.prototype.getMaxBufferedTimeFromCurrentTime = function(buf)
	{
		
		
		buf = buf || this.video; // pas prendre en compte parce que le buffer video comprend potentiellement dautre representation que celle ds laquelle on est 
		
		for(var i=0; i<buf.buffered.length; i++)
		{
			if(buf.buffered.start(i)<=this.video.currentTime && this.video.currentTime<=buf.buffered.end(i))
			{
				return buf.buffered.end(i);
			}
		}
		return this.video.currentTime;
	}
	
	BufferManager.prototype.appendData = function(id_buffer,result)
	{

		if(result && result.response)
		{
			// appel de la gestion du QoS
			this.video.ms.sourceBuffers[id_buffer].append(new Uint8Array(result.response));
				// update virtual buffered
				
			this.storedBufferInfos[id_buffer].buffered.addPiece(result.pptes.piece);
				
			if(this.cb_qos)
			{
				this.cb_qos({type : 'bufferInfos'});
			}
			
			
		}
	}
	
	BufferManager.prototype.bufferize = function (id_buffer,result) 
	{

		if(this.video.ms.duration >0 && this.video.currentTime + 0.1 >= this.video.ms.duration && this.video.event_handlers.onFinish)
		{
			this.video.event_handlers.onFinish();
		}
		
		var emergency = false;
		
		if((this.mode != this.STOP_BUFFERING) && this.is_initiated)
		{	
			for(var i=0;i<this.video.ms.sourceBuffers.length; i++)
			{
				var buf = this.video.ms.sourceBuffers[i];
				//var mbt2= (buf.buffered.length && this.getCurrentBufferedPart(buf)!==false) ? buf.buffered.end(this.getCurrentBufferedPart(buf)) : this.video.currentTime;
				
				//utilisation du buffered virtuel
				var maxbufferedtime = this.getMaxBufferedTimeFromCurrentTime(this.storedBufferInfos[i]);
				//console.log(maxbufferedtime + ' et '+mbt2);
				var d = maxbufferedtime - this.video.currentTime;
				
					if( (d < this.bufferMarge) || (this.mode == this.PREBUFFERING_MAX))
					{
						if(d<=0) // cas d'un seek par ex
						{
							maxbufferedtime = this.video.currentTime;
						}
						var piece = this.video.mpd.getPartForTime(this.currentPeriod, maxbufferedtime+0.1,this.storedBufferInfos[i].id_aset,this.storedBufferInfos[i].id_rep); 
					} 
					
					if(d<=this.emergencyMarge)
					{
						emergency = true;
					}
				
				if(piece)
				{
					
					this.video.dlm.getPart(piece,this.appendData.bind(this,i));
					if(this.mode == this.BUFFER_LOCAL_PIECE)
					{
						this.set_buffering_mode(this.old_mode);
					}
				} 
			}
			
			//on fait le test global sur la video pour voir si on est pret à etre en lecture ou pas
			
			
			if((!emergency) && !this.is_ready)
			{
					this.is_ready = true;
					if(this.cb_bufferready)
					{
						this.cb_bufferready();
					}
			} 
			else if((emergency && this.is_ready) && (this.video.ms.duration - this.video.currentTime > this.emergencyMarge + 1) )			// desactivation de l'emergency sur la toute fin 
			{
				console.log('emergency');
				this.is_ready = false;
				if(this.cb_qos)
				{
					this.cb_qos({type : 'emergency'});
				}
			}
			
			////////////////////
		}
		window.setTimeout(this.bufferize.bind(this),100);
	}
	
	BufferManager.prototype.initBuffer = function(period, tobuffer) 
	{
		if(this.video.ms.readyState == "closed")
		{
			window.setTimeout(this.initBuffer.bind(this,period,tobuffer),100);
			return;
		}
		console.log(tobuffer);
		//buffers == array de {id_aset, id_rep} // c'est dash.js qui s'occupe de faire attention a envoyer des reps compatibles
		this.currentPeriod = period;
		var infos = this.video.mpd.getInit(period, tobuffer);
		console.log(infos);
		console.log(this.video.ms.readyState);

		this.video.ms.duration = infos.duration;
		this.storedBufferInfos = new Array();
		
		for(var i = 0; i< infos.inits.length; i++)
		{
			this.video.ms.addSourceBuffer(infos.inits[i].mimecodec);
			this.storedBufferInfos[i] = {}
		}
		
		for(var i = 0; i< this.video.ms.sourceBuffers.length; i++) // il faut d'abord ajouter tous les buffers avant d'ajouter l'initialisation
		{
			this.video.ms.sourceBuffers[i].append(infos.inits[i].v);
			this.storedBufferInfos[i].id_aset = tobuffer[i].id_aset; //pas possible de stocker directement sur le sourcebuffer car chrome l'efface au changement de fenetre
			this.storedBufferInfos[i].id_rep = tobuffer[i].id_rep;
			this.storedBufferInfos[i].buffered = new VirtualBufferedManager();
		}
		if(this.cb_initiated)
		{
			this.cb_initiated();
		}
		this.is_initiated = true;
	}
	
	BufferManager.prototype.setAsetBufferFromTo= function(id_aset_from, id_aset_to, id_rep_to, force)
	{
		for(var i =0; i<this.storedBufferInfos.length; i++)
		{
			if(this.storedBufferInfos[i].id_aset == id_aset_from)
			{
				var init = this.video.mpd.getInit(this.currentPeriod, [{id_aset : id_aset_to,id_rep : id_rep_to}]);
				
				this.video.ms.sourceBuffers[i].abort();
				this.video.ms.sourceBuffers[i].append(init.inits[0].v);
				console.log('switch de '+this.storedBufferInfos[i].id_rep+' a '+id_rep_to);
				this.storedBufferInfos[i].id_rep = id_rep_to;
				this.storedBufferInfos[i].id_aset = id_aset_to;
				if(force) // on clear le buffered si on force car ça veut dire qu'on veut toute la video ds la rep choisie
				{
					this.storedBufferInfos[i].buffered.clear();
				}
				if(this.cb_initiated) //on doit le lancer car c la dedans entre autre que le p2p est notifié du chgt de fenetre
				// et que c lance ds le cas force donc autant etre coherent
				{
					this.cb_initiated();
				}
					
			}
		}
	}
	
 return (BufferManager);
});