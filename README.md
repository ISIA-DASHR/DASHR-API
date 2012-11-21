## DASHR API ##

DASHR API allows you to take advantage of MPEG-DASH and stream it through HTML video tag. 

**No plugin to install.**

It’s a requirejs module and it needs a browser supporting Media Source API in order to work.

## How to use it : ##

> dashr = require(‘AxthimaDASH/api’);
> 
> dashAPI = new dashr(video,mpd_src,events_handlers,preselectionned_tracks);


- **video** : the video element through which you want to display the video. *You need to disable native controls and implement your own* or it will behave strangely.

 You can check out the wrapper we did for videojs : https://github.com/ISIA-DASHR/videojs-DASHR-tech


- **mpd_src** : the link to the manifest mpd. For supported Dash features, check out http://dashr.option-isia-ecp.fr/


- **event_handlers** : object containing callbacks functions

	exemple : {onMetaData : function…, onBuffering: function…, onFinish: function…}

	Explanations:


	- *onMetaData(trackinfos)* : called when metadata have been processed, gives an object containing tracks infos

	- onBuffering : is called when the video is buffering

	- onFinish : is called when the video is over

- **preselectionned_tracks** : allows you to choose with which adaption set and/or representation you want to start the playing
              exemple : { audio: {id_aset : 1, id_rep : 2}, video : {id_aset:0}}	
              If you don’t use this parameter or don’t set something it will be chosen automatically.


**This methods are then available on the dashAPI object :**


- dashAPI.play()


- dashAPI.pause()


- dashAPI.paused() : tells you if the video is paused.


- dashAPI.getBuffered() : gives you a TimeRange-like object. 

- switchRepresentation(type,id_aset,id_rep) : used to manually change a track.

That’s all for the moment.** Don’t forget to check out the wrapper we did for videojs on [https://github.com/ISIA-DASHR/videojs-DASHR-tech](https://github.com/ISIA-DASHR/videojs-DASHR-tech "https://github.com/ISIA-DASHR/videojs-DASHR-tech")**

## MPD Generation : ##

First of all you need to create a proper mp4 file. And then you need to use mp4box to package to mpd

Here are the command line i used:

> ffmpeg -i M2.h264 -vcodec libx264 -vprofile baseline -b:v 1300k -pix_fmt yuv420p -keyint_min 125 -g 125 -sc_threshold 0 -r 25 high.mp4
> MP4Box -dash 5000 -rap -frag-rap -profile onDemand high.mp4

I'm not sure it's perfect but one point seems important to be working: you need keyint_min = g  and g / framerate = dash_fragment_duration 

In this case 125/25 = 5s which is what is specified for -dash

And -pix_fmt yuv420p is because it seems chrome only handle that pixel format

More over in order to work in chrome you need a rap in the beginning of each segment, it's why there is -rap and -frag-rap

## Thanks To : ##

Google / Youtube for http://dash-mse-test.appspot.com/

DASH-JS http://www-itec.uni-klu.ac.at/dash/?p=792

GPAC http://gpac.wp.mines-telecom.fr/
