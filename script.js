let gl, program;
let canvas;
let canvasWidth, canvasHeight;

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

    // Set up the viewport
    // gl.viewport(0, 0, canvas.width, canvas.height);
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;

    // Get and handle file input
    let fileInput = document.getElementById("userFile");
    fileInput.addEventListener('change', function (e) {

        resetCanvas();
        handleFileChange(fileInput);
    });
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
 *
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
    let pBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    let vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.drawArrays(gl.LINE_STRIP, 0, points.length);
}

/**
 * Reset our canvas - useful to call if you want to start a new drawing or switch modes
 */
function resetCanvas() {
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
    let fileLines = fileContents.split("\n");

    // Get location of the asterisk
    let asteriskLocation = -1;
    for (let i in fileLines) {
        if (fileLines[i].charAt(0) == "*") {
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
        if (currLine == null) { // if we dont have a regex match
            break;
        }

        if (currLine.length == 4) { // our extents dimensions

            // get user specified extents dimensions
            let proj = ortho(parseFloat(currLine[0]), parseFloat(currLine[2]), parseFloat(currLine[3]), parseFloat(currLine[1]), -1.0, 1.0);
            let projMatrix = gl.getUniformLocation(program, 'projMatrix');
            gl.uniformMatrix4fv(projMatrix, false, flatten(proj));

            // adjust the canvas
            let extentsWidth = parseFloat(currLine[2]) - parseFloat(currLine[0]);
            let extentsHeight = parseFloat(currLine[1]) - parseFloat(currLine[3]);
            adjustCanvasViewport(extentsWidth, extentsHeight);

        } else if (numLines == -1) { // the number of polylines in the file
            numLines = parseInt(currLine[0]);
        } else { // we encountered a single polyline
            let points = [];
            let pointsInPolyline = fileLines[i];

            for (let p = 0; p < pointsInPolyline;) {
                i++;

                let currPoint = fileLines[i].match(/\S+/g);
                if (!currPoint) { // skip blank lines
                    continue;
                }

                p++;
                points.push(vec4(parseFloat(currPoint[0]), parseFloat(currPoint[1]), 0.0, 1.0));
            }

            // now draw the line
            drawLine(points);
        }
    }
}