"use strict";

define(['./utils'], function(utils){
	var CDNDownloader = function(id){
		
		this.id = id; // identification du download
		
		//The following property is used, in the onProgress event, to store the progression of the previous onProgress event.
		this.intermediateProgress = 0;
		
		this.updateInterval = 300; // because if we do calcul instant speed every time progress is fired it gives wrong infos
		
		//The following properties are used to access the average and instant download speeds. Their value is actualized every time the onProgress event is fired.
		this.averageDownloadSpeed = false; //unavailable for the moment
		this.instantDownloadSpeed = false;
		
		this.downloading=false;
	}
	
	CDNDownloader.prototype.onLoaded = function(evt)
	//This event is triggered when the request has completely downloaded
	{
		this.downloading = false;
		//Check if download was succesful. Trigger onLoadError event if it wasn't
		if (!(evt.target.status >= 200 && evt.target.status < 299)) 
		{
			this.onLoadError(evt);
	    }
		
		evt.target.cb({response : evt.target.response, pptes : evt.target.pptes});
	}
	
	CDNDownloader.prototype.onLoadError = function(evt)
	//This event fires when there is an error with the request
	{
		if(this.downloading)
		{
			throw "Error during XHR request";
		}
	}
	
	CDNDownloader.prototype.onLoadStart = function(evt)
	{
		this.beginningTime = this.intermediateTime = evt.timeStamp;
	}
	
	CDNDownloader.prototype.onProgress = function(evt)
	//Fires multiple times as data is being returned. This lets you display real time progress information to visitors as the data is being downloaded.
	{
		
		var currentTime = evt.timeStamp;
		
		
		//Calculate the average and instant speed
		
		this.averageDownloadSpeed = (evt.position/1024)/((currentTime - this.beginningTime)/1000);    //in ko/s
		
		
		
		// c'est ici qu'il faudrait lisser plutot
		if(currentTime - this.intermediateTime > this.updateInterval)
		{
			this.instantDownloadSpeed = ((evt.position - this.intermediateProgress)/1024)/((currentTime - this.intermediateTime)/1000);   //in ko/s
			//Store the current time and the current progression in the class properties
			this.intermediateTime = currentTime;
			this.intermediateProgress = evt.position;
		} 
			
		
	}
	
	CDNDownloader.prototype.getUrl = function (url_infos, cb)
	{
		this.url_infos = url_infos
		
		//Create new XMLH request
		var xhr = new XMLHttpRequest();
		
		//Create event listeners
		xhr.addEventListener('loadend', this.onLoaded.bind(this));
		xhr.addEventListener('loadstart', this.onLoadStart.bind(this));
		xhr.addEventListener('error', this.onLoadError.bind(this));
		xhr.addEventListener('progress', this.onProgress.bind(this));
		
		
		if(url_infos.responseType)
		{
			xhr.responseType = url_infos.responseType;
		}
		xhr.open("GET", url_infos.url);
		if(url_infos.range)
		{
			xhr.setRequestHeader("Range",  utils.make_range(url_infos.range.start,url_infos.range.end));
		}
		if(url_infos.pptes)
		{
			xhr.pptes = url_infos.pptes;
		}
		xhr.cb = cb;
		
		//Send request
		xhr.send();
		this.downloading=true;
		this.xhr = xhr;
		return;
	}
	
	CDNDownloader.prototype.abort = function()
	{
		if(this.downloading)
		{
			this.downloading = false;
			this.xhr.abort();
		}
	}
		
 return (CDNDownloader);
});