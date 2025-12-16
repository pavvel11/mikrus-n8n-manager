'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 15;
const CELL_SIZE = 20;
const INITIAL_SNAKE = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
const INITIAL_DIRECTION = { x: 1, y: 0 };

export default function SnakeGame({ onClose }: { onClose: () => void }) {
    const [snake, setSnake] = useState(INITIAL_SNAKE);
    const [direction, setDirection] = useState(INITIAL_DIRECTION);
    const [food, setFood] = useState({ x: 10, y: 10 });
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const generateFood = useCallback(() => {
        let newFood: { x: number; y: number };
        do {
            newFood = {
                x: Math.floor(Math.random() * (300 / CELL_SIZE)),
                y: Math.floor(Math.random() * (300 / CELL_SIZE))
            };
        } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        setFood(newFood);
    }, [snake]);

    const resetGame = () => {
        setSnake(INITIAL_SNAKE);
        setDirection(INITIAL_DIRECTION);
        setScore(0);
        setGameOver(false);
        setIsRunning(true);
        generateFood();
    };

    useEffect(() => {
        const handleKeydown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp': if (direction.y === 0) setDirection({ x: 0, y: -1 }); break;
                case 'ArrowDown': if (direction.y === 0) setDirection({ x: 0, y: 1 }); break;
                case 'ArrowLeft': if (direction.x === 0) setDirection({ x: -1, y: 0 }); break;
                case 'ArrowRight': if (direction.x === 0) setDirection({ x: 1, y: 0 }); break;
            }
        };
        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, [direction]);

    useEffect(() => {
        if (!isRunning || gameOver) return;

        const moveSnake = setInterval(() => {
            setSnake(prevSnake => {
                const newHead = {
                    x: prevSnake[0].x + direction.x,
                    y: prevSnake[0].y + direction.y
                };

                // Wall collision
                if (newHead.x < 0 || newHead.x >= 300 / CELL_SIZE || newHead.y < 0 || newHead.y >= 300 / CELL_SIZE) {
                    setGameOver(true);
                    return prevSnake;
                }

                // Self collision
                if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                    setGameOver(true);
                    return prevSnake;
                }

                const newSnake = [newHead, ...prevSnake];

                // Eat food
                if (newHead.x === food.x && newHead.y === food.y) {
                    setScore(s => s + 1);
                    generateFood();
                } else {
                    newSnake.pop();
                }

                return newSnake;
            });
        }, 150);

        return () => clearInterval(moveSnake);
    }, [direction, food, gameOver, isRunning, generateFood]);

    // Draw
    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 300, 300);

        // Snake
        ctx.fillStyle = '#10b981';
        snake.forEach(segment => ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2));

        // Food
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2);

    }, [snake, food]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl relative max-w-sm w-full">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
                
                <h3 className="text-xl font-bold text-white mb-2 text-center">Oczekiwanie na instalację...</h3>
                <p className="text-xs text-slate-400 text-center mb-4">Instalacja Dockera może potrwać do 10 min. Zrelaksuj się.</p>
                
                <div className="flex justify-center mb-4 border-4 border-slate-800 rounded-lg overflow-hidden">
                    <canvas ref={canvasRef} width={300} height={300} />
                </div>

                <div className="flex justify-between items-center px-2">
                    <div className="text-sm font-bold text-emerald-400">Score: {score}</div>
                    {!isRunning || gameOver ? (
                        <button onClick={resetGame} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition">
                            {gameOver ? 'Game Over - Try Again' : 'Start Game'}
                        </button>
                    ) : (
                        <div className="text-xs text-slate-500">Użyj strzałek</div>
                    )}
                </div>
            </div>
        </div>
    );
}
