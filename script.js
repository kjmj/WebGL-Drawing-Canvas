let gl, program;
let canvas;
let cBuffer, pBuffer;
let vColor, vPosition;
let canvasWidth, canvasHeight;
let initialExtents = [0, 640, 0, 480];

let colorIndex = 0;
let colorCycle = [vec4(0.0, 0.0, 0.0, 1.0), vec4(1.0, 0.0, 0.0, 1.0), vec4(0.0, 1.0, 0.0, 1.0), vec4(0.0, 0.0, 1.0, 1.0)];
let setColor = vec4(0.0, 0.0, 0.0, 1.0);

let drawingHistory = []; // used to keep track of the drawing we have so far
let drawingPoints = []; // used when drawing a new set of points

let drawMode = false;
let newLine = false;

function main() {

    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    gl = WebGLUtils.setupWebGL(canvas, undefined);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    program = initShaders(gl, "vshader", "fshader");
    gl.useProgram(program);

    // Set up the canvas
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;

    // Buffer for our points
    pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);

    // For our vertex positions
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Buffer for our colors
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);

    // For our vertex colors
    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // By default, put the user in file mode
    // Get and handle file input
    let fileInput = document.getElementById("fileSelector");
    fileInput.addEventListener('change', function (e) {
        resetCanvas();
        handleFileChange(fileInput);
    });

    window.onkeydown = function (e) {
        // File Mode
        if (e.key === "f") {
            document.getElementById("mode").innerHTML = "File Mode";
            document.getElementById("modeDescription").innerHTML = "You are currently in file mode. Upload a .dat file to draw a picture! Press 'c' to cycle colors, or 'd' to enter drawing mode";
            document.getElementById("fileSelector").style.display = "block";

            resetCanvas();
            drawMode = false;

            // Get and handle file input
            let fileInput = document.getElementById("fileSelector");
            fileInput.addEventListener('change', function (e) {
                handleFileChange(fileInput);
            });
        }

        // Draw Mode
        if (e.key === "d") {
            document.getElementById("mode").innerHTML = "Draw Mode";
            document.getElementById("modeDescription").innerHTML = "You are currently in draw mode. Click to draw polylines, or hold 'b' and then click to start a new polyline. Press 'c' to cycle colors, or 'f' to enter file mode";
            document.getElementById("fileSelector").style.display = "none";

            resetCanvas();
            drawMode = true;
        }

        // Color cycle
        if (e.key === "c") {
            gl.clear(gl.COLOR_BUFFER_BIT);

            colorIndex++;
            if (colorIndex >= colorCycle.length)
                colorIndex = 0;

            setColor = colorCycle[colorIndex];

            // redraw with the selected color
            for (let d in drawingHistory) {
                drawLine(drawingHistory[d]);
            }
        }

        // When the user holds "b", we must draw a new line
        if (e.key === "b") {
            newLine = true;
            gl.clear(gl.COLOR_BUFFER_BIT);

            for (let d in drawingHistory) {
                drawLine(drawingHistory[d]);
            }
        }

    };

    window.onkeyup = function (e) {
        if (e.key === "b") {
            newLine = false;
        }
    };

    canvas.onclick = function (e) {
        if (drawMode === true) {
            // Get the mouse coordinates of the user
            let pos = getMouseCoordinates(e.clientX, e.clientY);

            if (newLine) {
                drawingPoints = [];
            }

            // Push these points to the drawing history
            drawingPoints.push(vec4(parseFloat(pos.x), parseFloat(pos.y), 0.0, 1.0));
            drawingHistory.push(drawingPoints);

            for (let d in drawingHistory) {
                drawLine(drawingHistory[d]);
            }
        }
    };
}

/**
 * Get the coordinates of the mouse and transform them into suitable coordinates for WebGL
 * @param clientX
 * @param clientY
 * @returns {{x: number, y: number}}
 */
function getMouseCoordinates(clientX, clientY) {
    // Get the canvas rectangle
    let rect = canvas.getBoundingClientRect();

    // Given the viewport, find where the mouse is
    let x = ((clientX - rect.left) / canvas.width);
    let y = ((canvas.height - (clientY - rect.top)) / canvas.height);

    // Given our extents, get the actual coordinates for the point
    x = (x * (initialExtents[1] - initialExtents[0]) + initialExtents[0]);
    y = (y * (initialExtents[3] - initialExtents[2]) + initialExtents[2]);

    return {
        x: x,
        y: y,
    }
}

/**
 * Called when the user changes the selected file
 * @param fileInput
 */
function handleFileChange(fileInput) {
    let file = fileInput.files[0];
    let reader = new FileReader();

    reader.onload = function (e) {
        drawFile(reader.result);
    };

    reader.readAsText(file);
}

/**
 * Adjust the size of the canvas and viewport to preserve the aspect ratio
 * of a drawing
 * @param extentsWidth
 * @param extentsHeight
 */
function adjustCanvasViewport(extentsWidth, extentsHeight) {
    let extentsRatio = extentsWidth / extentsHeight;

    if (extentsRatio > canvasWidth / canvasHeight) {
        gl.viewport(0, 0, canvasWidth, canvasWidth / extentsRatio);
        canvas.height = canvasWidth / extentsRatio;
        canvas.width = canvasWidth;
    } else if (extentsRatio < canvasWidth / canvasHeight) {
        gl.viewport(0, 0, canvasHeight * extentsRatio, canvasHeight);
        canvas.height = canvasHeight;
        canvas.width = canvasHeight * extentsRatio;
    }
}

/**
 * Given an array of points, draw them to our global variable "gl"
 * @param points
 */
function drawLine(points) {
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    // for all of our points, push a color
    let colors = [];
    for (let p in points) {
        colors.push(setColor);
    }

    // let cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    // Draw a dot on the first click
    gl.drawArrays(gl.POINTS, 0, 1);

    gl.drawArrays(gl.LINE_STRIP, 0, points.length);
}

/**
 * Reset our canvas - useful to call if you want to start a new drawing or switch modes
 */
function resetCanvas() {
    drawingHistory = [];
    drawingPoints = [];

    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Set clear color
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // Clear <canvas> by clearing the color buffer
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Handle extents
    let proj = ortho(0.0, 640.0, 0.0, 480.0, -1.0, 1.0);
    let projMatrix = gl.getUniformLocation(program, "projMatrix");
    gl.uniformMatrix4fv(projMatrix, false, flatten(proj));

    // Resize canvas and viewport
    adjustCanvasViewport(640, 480);
}

/**
 * Given the contents of a file, try to draw the data to a canvas
 * @param fileContents
 */
function drawFile(fileContents) {
    drawingHistory = [];

    let fileLines = fileContents.split("\n");

    // Get location of the asterisk
    let asteriskLocation = -1;
    for (let i in fileLines) {
        if (fileLines[i].charAt(0) === "*") {
            asteriskLocation = parseInt(i);
            break;
        }
    }

    // Now process the lines in the file
    let numLines = -1;
    for (let i = asteriskLocation + 1; i < fileLines.length; i++) {
        let currLine = fileLines[i].match(/\S+/g);

        if (!currLine) { // skip blank lines
            continue;
        }

        if (currLine.length === 4) { // our extents dimensions

            // get user specified extents dimensions
            let proj = ortho(parseFloat(currLine[0]), parseFloat(currLine[2]), parseFloat(currLine[3]), parseFloat(currLine[1]), -1.0, 1.0);
            let projMatrix = gl.getUniformLocation(program, 'projMatrix');
            gl.uniformMatrix4fv(projMatrix, false, flatten(proj));

            // adjust the canvas
            let extentsWidth = parseFloat(currLine[2]) - parseFloat(currLine[0]);
            let extentsHeight = parseFloat(currLine[1]) - parseFloat(currLine[3]);
            adjustCanvasViewport(extentsWidth, extentsHeight);

        } else if (numLines === -1) { // the number of polylines in the file
            numLines = parseInt(currLine[0]);
        } else { // we encountered a single polyline
            let points = [];
            let pointsInPolyline = fileLines[i];

            // Process the actual (x, y) coordinates
            for (let p = 0; p < pointsInPolyline;) {
                i++;

                let currPoint = fileLines[i].match(/\S+/g);
                if (!currPoint) { // skip blank lines
                    continue;
                }

                p++;
                points.push(vec4(parseFloat(currPoint[0]), parseFloat(currPoint[1]), 0.0, 1.0));

            }
            drawingHistory.push(points);

            // now draw the line
            drawLine(points);

        }
    }
}
