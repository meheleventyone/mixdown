# mixdown
Mixdown is a declarative audio mixer for games. It allows banks of sounds to be pre-defined in detail, loaded, manipulated and played with an intuitive interface. It's written in TypeScript and uses the WebAudio API to power playback.

**_Note: Mixdown is currently in an alpha state of development. There may be dragons if you choose to use it for production work and the API may change between versions._**

If you're interested in diving right in please take a look at the examples and documentation.

**Key Features**
* *Sound playback is declarative defined*, allowing easy management of all the sounds in the game. No more digging through files to find all instances of a sound being played.
* *Easy to use*, Mixdown strips out a lot of the chaff from the WebAudio API and makes common game workflows easy to understand. For simple tasks Mixdown steps out of the way and lets you load and play sounds with ease.
* *Hierarchical*, sounds are loaded into Mixers which are groups that allow easy adjustment of audio in one place. Mixers can be fed into other Mixers allowing for simple groupings to flow through into more complex behavior. Want to duck particularly loud sounds but not others when VO is playing? Simply pipe the loud sounds through their own Mixer and pipe that into the SFX Mixer. Now users can adjust the volume of the SFX and your game code can duck the loud sounds seperately. This will also be a point of expansion for future work.

## Why?
Mixdown was created because I couldn't find an web based audio library that provided the sort of declarative setup I wanted to make my own games. It's currently powering my first project that is as yet unannounced and is the main catalyst for development right now.

## Okay, how do I use it?
For a JavaScript project right now I recommend you grab one of the packaged versions with type definitions from the /dist directory. There is a version that supports ES modules and another supporting UMD.

For a TypeScript project I like to bring the actual source over from the /src directory.

Then it's a simple case of instantiating the Mixdown class and going to town. There are examples and fairly comprehensive documentation to help you get started.

## License Info
Mixdown is released under the MIT License.

The audio used for examples is licensed variously:

CC BY 3.0 - https://creativecommons.org/licenses/by/3.0/

* swoosh.mp3 - Public Domain
* machinegun.mp3 - CC BY 3.0 - soundscalpel.com - https://freesound.org/s/110622/
* footsteps.mp3 - Public Domain
* moo.mp3 - Public Domain
* oildrum.mp3 - Public Domain
* roomambience.mp3 - Public Domain
* 8bitexplosion.mp3 - Public Domain
* grunt.mp3 - Public Domain
* error.mp3 - Public Domain
* click.mp3 - Public Domain
* spaceshipambience.mp3 - Public Domain
* fightmusic.mp3 - CC BY 3.0 - Sirkoto51- https://freesound.org/s/414214/
* sadmusic.mp3 - CC BY 3.0 - Mrthenoronha - https://freesound.org/s/380020/
