"use strict";

// a faire : creer module cdn avec methode pour savoir la vitesse en temps reel et la moyenne et se baser dessus plutot que de faire les requetes direct ds ce module qui servira de controleur <-- AXEL
// module p2p pareil avec les même methode pour la vitesse + regulation

define(['./CDNDownloader'], function(CDNDownloader){
	var DownloadManager = function(video){
		this.video = video;
		this.currentCDNDls = new Array();
		this.lastEstimatedBW = 0;
		
		
		window.setInterval(this.bandwidthMonitor.bind(this),1000);
		
	}
	
	DownloadManager.prototype.bandwidthMonitor = function()
	{
		var estim=0;
		if(this.currentCDNDls.length)
		{
			for(var i=0;i<this.currentCDNDls.length;i++)
			{
				if(this.currentCDNDls[i].averageDownloadSpeed)
				{
					if(this.currentCDNDls[i].instantDownloadSpeed)
					{
						estim+=this.currentCDNDls[i].instantDownloadSpeed;
					}
					else if ( this.currentCDNDls[i].averageDownloadSpeed && this.currentCDNDls[i].averageDownloadSpeed != Infinity )
					{
						//de toute facçon s'il n'y a pas de instantSpeed cest que ça n'a pas "rempli" la bande passante dispo
						estim+=this.currentCDNDls[i].averageDownloadSpeed;
					}  /// sinon c'est que ça n'a pas encore eu le temps de s'initialiser
				}
			}
		} 
		
		if(this.lastEstimatedBW>0 && estim>0)
		{
			this.lastEstimatedBW = (1.3*this.lastEstimatedBW+0.7*estim)/2;
		}
		else if(estim==0) // cas où rien se telecharge
		{
			this.lastEstimatedBW = this.lastEstimatedBW;
		}
		else 
		{
			this.lastEstimatedBW = estim;
		}
	}
	
	DownloadManager.prototype.onCDNDownloadEnded = function(id,cb,result)
	{
		for (var i=0;i<this.currentCDNDls.length;i++)
		{
			if(this.currentCDNDls[i].id == id)
			{
				this.bandwidthMonitor();
				var dl = this.currentCDNDls.splice(i,1)[0];
			}
		}
		
		cb(result);
	}
	
	DownloadManager.prototype.getUrl = function (url_infos, cb)
	{
		var id = Math.floor(Math.random()*119988);;
		url_infos.url = url_infos.url + '?' + id; //eviter la mise en cache
		
		var cDNDownloader = new CDNDownloader(id);
		this.currentCDNDls.push(cDNDownloader);
		cDNDownloader.getUrl(url_infos, this.onCDNDownloadEnded.bind(this,id,cb));
		return id;
	}
	
	DownloadManager.prototype.getPart = function(piece, cb)
	{
		
		var infos = this.video.mpd.getPieceInfos(piece);
		if(infos.downloading)
		{
			return;
		}
		
		infos.responseType = "arraybuffer";
		infos.pptes = {piece : piece};
		var id = this.getUrl(infos, this.onPartDownloadEnded.bind(this,cb));
		this.video.mpd.markAsDownloading(piece,id); // on stocke l'instance de download correspondante.
	}
	
	DownloadManager.prototype.onPartDownloadEnded = function (cb,result)
	{
		this.video.mpd.markAsDownloading(result.pptes.piece); // passe a faux qd ca a deja ete appele
		this.video.mpd.markAsDownloaded(result.pptes.piece); 
		cb(result);
	}
	
	DownloadManager.prototype.set_p2p = function()
	{
		
	}
	
	DownloadManager.prototype.getEstimatedBandwidth = function()
	{
		return this.lastEstimatedBW;
	}
	
	DownloadManager.prototype.killPiecesDownloadsFromAset = function(id_aset)
	{
		for (var i=0;i<this.currentCDNDls.length;i++)
		{
			if(this.currentCDNDls[i].url_infos.pptes.piece.id_aset == id_aset)
			{
				var dl = this.currentCDNDls.splice(i,1)[0];
				dl.abort();
			}
		}
	}
	
	
 return (DownloadManager);
});