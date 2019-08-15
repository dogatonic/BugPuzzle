// Version 4 of the Javascript Bug Puzzle Solver, June 2019
// So far I have seen this version work in as few as 19 rounds and as much as 5349 rounds (45 min, i think)
//
// v2 NOTE
// BUT SLOWNESS! Why is it taking so long?!!! It takes around 500 milliseconds to do one failed single solutions of around5 tiles. Why? Why can't it do that in 50 milliseconds?
// More code, less time? I am spending a lot of time in each cycle calculating value for the offset postions. If all the offset positon were done once, ahead of time, in should all work faster.
//
// v4 NOTE
// ok, so v3 saw an increase in speed from around 500 ms to about 160ms per "try". But we were still using the old logic of a picking a candidate piece at random
// from the remaining pieces, and trying it from all 4 sides. but if it didn't fit, we would draw again from the same remaining group of tiles, which meant that we
// might actually randomly draw the same "tried" piece over and over. so i created a "maxAttemptsPerPlace" variable that would limit the number of times we tried
// random pieces before we just started the round over.
// SO! let's try working around that and see if we get faster!

'use strict';
var myGame;
window.onload = initGameInstance;

function initGameInstance () {
	myGame = makePuzzleSolver();
	myGame.init();
	myGame.main();
	// Start the first frame request
	// window.requestAnimationFrame(myGame.gameLoop);
}

var makePuzzleSolver = function () {
	var that; // scoping substitute for "this"
	var nowPlaceIndex = 0;
	var roundCount = 0;
	// var placeAttempts = 0;
	var clockStart = 0;
	var clockStop = 0;
	let totalTime = 0;
	// var maxAttemptsPerPlace = 20; // if we try 20 times to put a piece into, for example the 5th place, and we find no match from the remaining pool...
	// we give up and reset and start over. the method was used in the original FLASH solver

	var singleSolutionCycle = 0;

	var canidatePoolIndex; var candidatePieceIndex; var candidatePieceOffset; // we may move these down into public section of object
	// we could just use values alone to describe the body parts for each puzzle piece, but using variables is a little more descriptive
	var gh = 1; var gb = -gh; // green head, green butt
	var bh = 2; var bb = -bh; // black
	var rh = 3; var rb = -rh; // red
	var ph = 4; var pb = -ph; // purple
	var myGameboard; // the dom element for the gameboard container
	var domPieces; // an array of the dom elements for the HTML view
	return {
		gameState: 'init_val', // the game state
		cycles: 0, // counter for cycles run through gameloop
		pieces: [], // the array of piece objects
		piecePool: [], // an array of available pieces: keys  0-8, values 1-9
		tryPiecePool: [], // like the piece pool, but used for each place's random choices
		places: [], // an array of which pieces are in which spot, as well as the validation values

		init: function () {
			that = this; // use of "this" elsewhere (i.e. a timer) may lose scope, so we will use "that"
			that.initPieceArray();
			that.initPieceArrayOffsets();
			that.initGameBoard();
			clockStart = Date.now();
		},

		initPiecePool: function () { // the piece pool is used for tracking available slots when a piece is picked
			that.piecePool = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // tracks pieces remaining for each place overall
			that.tryPiecePool = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // tracks pieces remaining for each individual place
		},

		initPlaceArray: function () {
			nowPlaceIndex = 0;
			that.places = [
				{ validate: [], pieceIndex: 0, offset: 0 },
				{ validate: [3], pieceIndex: 0, offset: 0 },
				{ validate: [3], pieceIndex: 0, offset: 0 },
				{ validate: [0], pieceIndex: 0, offset: 0 },
				{ validate: [0, 3], pieceIndex: 0, offset: 0 },
				{ validate: [0, 3], pieceIndex: 0, offset: 0 },
				{ validate: [0], pieceIndex: 0, offset: 0 },
				{ validate: [0, 3], pieceIndex: 0, offset: 0 },
				{ validate: [0, 3], pieceIndex: 0, offset: 0 }
			];
		},

		initPieceArray: function () {
			that.pieces = [
				{ id: 0 },
				{ id: 1, parts: [gb, bb, rb, bh] },
				{ id: 2, parts: [ph, rb, pb, gb] },
				{ id: 3, parts: [rh, bh, gh, bh] },
				{ id: 4, parts: [gb, bb, pb, pb] },
				{ id: 5, parts: [bh, bb, rb, ph] },
				{ id: 6, parts: [rh, gh, bb, rb] },
				{ id: 7, parts: [ph, rh, gh, ph] },
				{ id: 8, parts: [rh, gh, gb, pb] },
				{ id: 9, parts: [rh, ph, bb, gh] }
			];
		},

		initPieceArrayOffsets: function () { // why are we doing this? perhaps it will speed up performance by not making offset calculations everytime we try to pick a new tile
			for (let i = 0; i < that.pieces.length; i++) { // loop through the Pieces array
				// if(that.pieces[i].parts.length){ // if this piece has a parts array...
				if (1 === 1) {
					var offsets = [[], [], [], []]; // this array will hold 4 versions of the parts array in different orders
					for (var j = 0; j < 4; j++) {
						try {
							offsets[0][j % 4] = that.pieces[i].parts[j];
							offsets[1][(j + 1) % 4] = that.pieces[i].parts[j];
							offsets[2][(j + 2) % 4] = that.pieces[i].parts[j];
							offsets[3][(j + 3) % 4] = that.pieces[i].parts[j];
						} catch (e) {
							// console.log('this is the error catch.')
							// console.log(e);
						}
					}
					that.pieces[i].offsets = offsets;
				}
			}
		},
		main: function () {
			that.gameLoop();
			setTimeout(that.main, 1); // that.setTimeOutRate
		},
		testCandidate: function () {
			var passes = true;
			var subjectPlaceIndex, subjectPlace, subjectPieceIndex, subjectApparentSide, subjectPieceSideValue;
			var targetPlaceIndex, targetPieceIndex, targetPieceOffset, targetApparentSide, targetPieceSideValue;
			var calculatedSubjectOffset;
			let workingPiecePoolIndex;

			subjectPlaceIndex = nowPlaceIndex; // just a copy for readability of subject/target code
			subjectPlace = that.places[subjectPlaceIndex]; // our place object
			subjectPieceIndex = candidatePieceIndex;// just a copy for readability of subject/target code

			// loop through sides, starting with candidate offset X
			// loop through required "validate" array of the current place (nowPlaceIndex)
			// if we get a passes is true, Move On! and place the piece in the place array
			// if not, start over

			for (let i = candidatePieceOffset; i < candidatePieceOffset + 4; i++) { // we will rotate through the sides and break; if we find a match
				passes = true;// start with a possible true value
				calculatedSubjectOffset = i % 4; // modulus: this keeps the range between 0-3 regardless of where the loop started with candidatePieceOffset
				// console.log('calculatedSubjectOffset : ' + calculatedSubjectOffset);
				for (var j = 0; j < subjectPlace.validate.length; j++) { // all places except the first should have some sides to validate
					// there should be NO validation for the first piece
					// temp otherewise

					switch (subjectPlace.validate[j]) { // we have to check each validation point for this particular piece/offset combo
					case 0:
						subjectApparentSide = 0;
						targetPlaceIndex = subjectPlaceIndex - 3;// our target is on the top of the current place
						targetApparentSide = 2;// when testing side 0 (the top) we go against side 2 (the bottom)
						break;
					case 3:
						subjectApparentSide = 3;
						targetPlaceIndex = subjectPlaceIndex - 1;// our target is on the left of the current place
						targetApparentSide = 1;// when testing side 3 (the left) we go against side 1 (the right)
						break;
					}

					targetPieceIndex = that.places[targetPlaceIndex].pieceIndex;// get the piece index of target
					targetPieceOffset = that.places[targetPlaceIndex].offset;// get the piece index of target

					// console.log(' targetPlaceIndex: ' + targetPlaceIndex);
					// console.log('piece: ' + targetPieceIndex + ' targetPieceOffset: ' + targetPieceOffset);
					// console.dir(that.pieces[targetPieceIndex].offsets[targetPieceOffset]);
					targetPieceSideValue = that.pieces[targetPieceIndex].offsets[targetPieceOffset][targetApparentSide];
					subjectPieceSideValue = that.pieces[subjectPieceIndex].offsets[calculatedSubjectOffset][subjectApparentSide];

					if (subjectPieceSideValue !== -targetPieceSideValue) { // this doesn't equal that, OR rather if this does match -this (head to butt)
						passes = false;
						// console.log('failed for : ' + calculatedSubjectOffset);
						break; // we don't need to continue any more validating
					}
				}
				if (passes) {
					candidatePieceOffset = calculatedSubjectOffset;// If pass dont forget to set offset that was used!!!!! i.e. change candidatePieceOffset (to i) if needed
					break;// break out of offset loop (testing all sides) if we have a valid tile
				}
			}

			if (passes !== true) { // this means that the chosen piece was not a match. we tried all 4 sides, no match.
				// that piece didn't work so remove it from tryPiecePool
				that.tryPiecePool.splice([canidatePoolIndex], 1); // remove the selected piece from the pool

				// console.log('no MATCH!!!!!!!!!!!!! ');
				// we need to check if the tryPiecePool is empty and do a reset if it is
				if (that.tryPiecePool.length < 1) {
					that.setGameState('reset');
				}
			} else {
				// this means that the chosen piece was a match
				that.places[nowPlaceIndex].pieceIndex = candidatePieceIndex; // add chosen piece to places array
				that.places[nowPlaceIndex].offset = candidatePieceOffset; // add chosen offset to places array

				// console.log('this piece passes: ' + candidatePieceIndex);//+ subjectPieceIndex
				// if it did work, we need to remove it from the overall piecePool
				workingPiecePoolIndex = that.piecePool.indexOf(candidatePieceIndex);
				// console.log('this piece SHOULD leave the main pool: ' + that.piecePool[workingPiecePoolIndex]);//+ subjectPieceIndex
				that.piecePool.splice([workingPiecePoolIndex], 1); // remove the selected piece from the pool
				// console.dir(that.piecePool);
				// renew the tryPiecePool here, just clone the newly adjusted piecePool
				that.tryPiecePool = that.piecePool.slice(0);
				nowPlaceIndex++; // advance nowPlaceIndex
			}

			if (nowPlaceIndex === 9) { //  this means gameover
				that.setGameState('idle');
				console.log('<<<<<<<<< target aquired >>>>>>>>>');
			}
		},
		pickCandidatePiece: function () {
			// pick random from the tryPiecePool
			// console.log('<<<<<<<<< pick piece from >>>>>>>>>');
			// console.dir(that.tryPiecePool);
			canidatePoolIndex = that.getRand(0, that.tryPiecePool.length - 1);// pick random index number 0-X where X is the length of current Pool(-1)
			candidatePieceIndex = that.tryPiecePool[canidatePoolIndex];//
			// console.log('candidate Piece ID:' + candidatePieceIndex);
			candidatePieceOffset = that.getRand(0, 3);
		},

		initGameBoard: function () {
			var gridNode; // placeholder for a dom element used in looping
			domPieces = [];
			myGameboard = document.getElementById('gameBoard');
			myGameboard.innerHTML = '';
			for (let i = 1; i <= 9; i++) {
				gridNode = document.createElement('div');
				gridNode.id = 'p' + i;
				gridNode.style.background = `url(png/p${i}.png) 0 0`;
				myGameboard.appendChild(gridNode);
				domPieces[i] = document.getElementById(`p${i}`);
			}
		},

		gameLoop: function (timeStamp) {
			let msg;
			let avgTime;
			let calculatedTime;
			switch (that.gameState) {
			case 'idleTime':
				console.log(roundCount + ' END ============== pieces: ' + nowPlaceIndex);
				clockStop = Date.now();
				console.log('elapsed time: ' + (clockStop - clockStart) + ' milliseconds');
				clockStart = Date.now();
				break;
			case 'idle':
				that.draw();
				break;
			case 'reset':
				// console.clear();
				that.domCleanStart();

				// Let's output some info to let us know just how fast this is going
				roundCount++;
				clockStop = Date.now();
				calculatedTime = clockStop - clockStart;
				msg = roundCount + ' END pieces: ' + nowPlaceIndex + ' time: ' + calculatedTime + ' ms ' + 'run cycles: ' + singleSolutionCycle;
				totalTime += calculatedTime;
				avgTime = Math.floor(totalTime / roundCount);
				msg += ' avgTime:' + avgTime;
				console.log(msg);

				// when we start a new "single" solution, reset it's cycle counter
				singleSolutionCycle = 0;
				clockStart = Date.now();
				that.initPiecePool();
				that.initPlaceArray();
				// that.initPieceArray();
				that.setGameState('run'); // or idleTime to test timing
				break;
			case 'run':
				singleSolutionCycle++;
				that.pickCandidatePiece();
				that.testCandidate();
				that.draw(); // if I comment this out, it really doesn't make it any faster
				// assuming one tile has been laid, succesive tile would go like this...
				// pick random tile to add, pick a random side to start with, but then continue sequentially to try each side
				// of that tile until one fits, and start over with tile 1 if it doesn't.
				// DON'T remove the tile from the pool until after it fits!!!!!!!!!!!
				break;
			case 'stop':
				that.draw();
				console.log('cycles: ' + that.cycles);
				that.setGameState('idle');
				that.cycles = 0;
				break;
			default:
					//    console.log('default state');
			}
			// console.log('gameState: ' + that.gameState);
			// Keep requesting new frames
			that.cycles++;
			// window.requestAnimationFrame(that.gameLoop);
		},

		domCleanStart: function () {
			let i;
			for (i = 1; i <= 9; i++) {
				domPieces[i].style.display = 'none';
			}
		},

		setGameState: function (newState) {
			that.gameState = newState;
		},

		draw: function () {
			let i, place, offsetDegrees;
			for (i = 0; i <= 8; i++) {
				place = that.places[i];
				if (place.pieceIndex !== 0) {
					offsetDegrees = place.offset * 90;
					domPieces[place.pieceIndex].style.display = 'block';
					domPieces[place.pieceIndex].style.transform = `rotate(${offsetDegrees}deg)`;
					domPieces[place.pieceIndex].style.gridArea = `g${i + 1}`;
				}
			}
		},

		getRand: function (min, max) {
			return Math.floor(Math.random() * (max - min + 1)) + min;
		}
	};
};
