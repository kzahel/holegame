import { Game } from './Game'

// Simple CSS reset
const style = document.createElement('style');
style.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { overflow: hidden; width: 100vw; height: 100vh; }
  canvas { display: block; }
`;
document.head.appendChild(style);

new Game();
