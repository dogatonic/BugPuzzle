# BugPuzzle
A javascript brute force solving of a 9 tile puzzle

This is a recreation of a program I wrote a few years ago in Flash, rewritten in JavaScript. It started with a novelty puzzle I was given as a gift. The puzzle is just 9 square tiles that you freely arrange until all the sides "match up" in a 3x3 grid. Rather than solve the puzzle in the "real world", I decide to solve it computationally. 

This brute force solution just keeps trying different variations randomly until it solves the puzzle - it's not very "smart" and it doesn't "learn" but it doesn't need to; a brute force solution works fine. Also, I chose to use some random picking of pieces and orientations just for fun. Solving it with a very linear and sequential brute force just seemed too boring.

Basically it works like this. Pick a piece at random, then randomly orient it (0, 90, 180, 270), check to see if it matches up with the previous pieces. If not try another piece - if it tries all remaining pieces without success, start over. So as it runs along,  you will see it get 3, 4, 5, etc. matches before it just can't find another match. Eventually, it gets it right!

I have seen it solve the puzzle in as many rounds as 4000+ and as few as just 4 rounds.

Check the JS console to see more solving data.
