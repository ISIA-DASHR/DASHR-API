define(['./dash'], function(dash){

  var AxthimaAPI = function (video,src,triggers,preselected_tracks) 
  {
	  this.dash = new dash(video,src,triggers, preselected_tracks);
  }
  
  AxthimaAPI.prototype.play = function() 
  {
	  this.dash.play();
  }
  
  AxthimaAPI.prototype.pause = function() 
  {
	  this.dash.pause();
  }
  
  AxthimaAPI.prototype.seek = function(t) 
  {
	  this.dash.setCurrentTime(t);
  }
  
  AxthimaAPI.prototype.paused = function()
  {
	  return !this.dash.want_to_play;
  }
  AxthimaAPI.prototype.getBuffered = function()
  {
	  //renvoit le temps max en buffer sans interruption depuis la position courante
	  return this.dash.getBuffered();
  }
  AxthimaAPI.prototype.switchRepresentation = function(type,id_aset, id_rep)
  {
	  this.dash.ManualSwitchRepresentation(type,id_aset, id_rep);
  }
 
  return (AxthimaAPI);
});