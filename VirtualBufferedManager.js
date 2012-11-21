"use strict";

define(function(){
	// son role est de mimiquer le buffered des sources buffers
	// Il gere ses infos grâce aux pieces qu'on lui signale comme telechargées
	var VBM = function(){
		this.parts = [];
		this.infosparts = [];
		this.buffered = [];
		this.length = 0;
	}
	
	VBM.prototype.clear = function ()
	{
		this.parts = [];
		this.infosparts = [];
		this.buffered = [];
		this.length = 0;
	}
	
	VBM.prototype.addPiece = function (piece){
		
		this.parts.push(piece.idPiece);
		this.infosparts.push(piece.segment);
		
		var mini = Math.min.apply(null, this.parts);
		var maxi = Math.max.apply(null, this.parts);
		var st = this.infosparts[this.parts.indexOf(mini)].time;
		this.buffered = [];
		for(var i=mini; i<maxi; i++)
		{
			if( !this.infosparts[this.parts.indexOf(i+1)] && st!==null)
			{
				this.buffered.push({start : st, end : this.infosparts[this.parts.indexOf(i)].time + this.infosparts[this.parts.indexOf(i)].duration});
				st = null;
			}
			else if (this.infosparts[this.parts.indexOf(i+1)] && st===null)
			{
				st = this.infosparts[this.parts.indexOf(i+1)].time;
			}
		}
		this.buffered.push({start : st, end : this.infosparts[this.parts.indexOf(maxi)].time + this.infosparts[this.parts.indexOf(maxi)].duration});
		this.length = this.buffered.length;
	}
	
	VBM.prototype.start = function(i)
	{
		return this.buffered[i].start;
	}
	
	VBM.prototype.end = function(i)
	{
		
		try
		{
			return this.buffered[i].end;
		}
		catch(e)
		{
			return 0;
		}
	}
		
 return (VBM);
});