import express from "express";
import http from "http";
import { Server } from "socket.io";
import colorGenerator from "randomcolor";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const canvasSize = 20;

app.use(express.static(__dirname + "/public"));

const snakes = {};
let food = { x: 0, y: 0 };

const generateFood = () => {
    food = { x: Math.floor(Math.random() * canvasSize), y: Math.floor(Math.random() * canvasSize) };
};

const moveSnake = () => {
    for (const snakeId in snakes) {
        const snake = snakes[snakeId];
        for (let i = snake.length - 1; i > 0; i--) {
            // Update each segment's position to the position of the previous segment
            snake[i].x = snake[i - 1].x;
            snake[i].y = snake[i - 1].y;
        }
        const head = snake[0];
        switch (head.direction) {
            case "up":
                head.y = (head.y - 1 + canvasSize) % canvasSize;
                break;
            case "down":
                head.y = (head.y + 1) % canvasSize;
                break;
            case "left":
                head.x = (head.x - 1 + canvasSize) % canvasSize;
                break;
            case "right":
                head.x = (head.x + 1) % canvasSize;
                break;
        }
    }
};


const scores = {}; // Define scores object to track scores for each player

// Increment score on collision
const checkCollisions = () => {
    for (const snakeId in snakes) {
        const head = snakes[snakeId][0];
        if (head.x === food.x && head.y === food.y) {
            // Increase snake length
            snakes[snakeId].push({ ...head });
            // Generate new food
            generateFood();
            // Increment score
            if (!scores[snakeId]) {
                scores[snakeId] = 1;
            } else {
                scores[snakeId]++;
            }
        }
    }
};

// Emit updated game state and scores to all clients
io.emit("update", { snakes, food, scores });



// Start the game loop
setInterval(() => {
    moveSnake();
    checkCollisions();
    io.emit("update", { snakes, food, scores });
}, 200); // Adjust the interval as needed

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/snakeindex.html");
});

io.on("connection", (socket) => {
    console.log("New user connected:", socket.id);

    const snakeColor = colorGenerator();
    snakes[socket.id] = [{ x: 10, y: 10, direction: "right", color: snakeColor }];

    socket.emit("init", { snakes, food });

    socket.on("move", (direction) => {
        snakes[socket.id][0].direction = direction;
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        delete snakes[socket.id];
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
