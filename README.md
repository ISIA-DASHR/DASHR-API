DASHR API
===============

L’api se présente sous la forme d’un module requireJS. 

Utilisation :

<pre>
require([‘AxthimaDASH/api’], function(dashr){
  dashAPI = new dashr(video,mpd_src,events_handlers,preselectionned_tracks);  
});
</pre>

*video* : le tag video ds lequel faire passer la video

*mpd* : la source du manifest MPD

*events_handlers* : fonctions de callback pour les différents evenements :
			- onMetaData : renvoie un objet contenant les différents tracks disponibles ainsi que leurs informations. Les autres informations telles que la durée sont accessibles normalement depuis le tag video
			- onBuffering : est appelée quand la vidéo bufferize
			- onFinish : est appelé lorsque la vidéo est terminée
		exemple :
			{ onMetaData : _V_.axthima.onMetaData.bind(this),
                                            onBuffering : _V_.axthima.onBuffering.bind(this),						onFinish : _V_.axthima.onFinish.bind(this) };
Preselected_tracks (optional) : Permet de choisir les asets qui vont être utilisée au démarrage de la vidéo .  On peut par exemple imaginer une vidéo contenant plusieures langues, et donc plusieurs asets audio. On peut eventuellement aussi spécifier l’id de la représentation pour forcer l’affichage de la vidéo dans une qualité définie.
exemple :
{ audio: {id_aset : 1, id_rep : 2}, video : {id_aset:0}} id_aset appartient ) {0,n-1} où n est le nombre d’aset décrits ds le mpd, l’ordre etant conservé
Note : on aurait pu ne spécifier que video, l’audio aurait été choisi automatiquement
 A venir : Plutôt que d’indiquer un aset id, spécifier un atribut de l’aset, tel que lang par exemple.
Si cet argument n’est pas présent le premier aset de chaque type sera choisi et les représentations seront choisies et adaptées automatiquement.

Par la suite il est possible d’intéragir avec l’api via :
dashAPI.play()
dashAPI.pause()
dashAPI.paused() : indique si la video est en pause. Indique si l’api est en train de faire ce qu’il faut pour charger et afficher la vidéo
dashAPI.getBuffered() : renvoie le temps max depuis la position de lecture jusqu’au quel les données sont en buffer
switchRepresentation(type,id_aset,id_rep) : pour changer le track type (video, audio, sous-titres..) par la representation correspondant au couple {id_aset,id_rep}




Utilisation avec video-js lorsqu’il utilise notre wrapper, ie que la technologie dash est disponible grâce à notre api :
<video id="example_video_1" class="video-js vjs-default-skin" controls autoplay width="640" height="264"
 	  poster="http://video-js.zencoder.com/oceans-clip.png"
      data-setup='{"DASHR_API" : "../../AxthimaDASH/api", "preselected_tracks" : { "video" : {"id_aset" : 0, "id_rep" : 0} }}'>
    <source src="../../car-20120827-manifest.mpd" type='video/dash' />
  // alternative source for older browser such as mp4, ogv, ou flash
  </video>
Le fonctionnement reste identique aux autres technologies. Les changements sont :
Le type : video/dash
Les options à indiquer dans data-setup : DASHR_API, emplacement de l’api par rapport au fichier html – preselected_tracks : si souhaité correspond au la version JSON de ce la présentation faite plus haut.
Bien sûr il est possible d’utiliser l’instanciation Javascript de video-js
