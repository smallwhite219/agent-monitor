import { useEffect, useRef, useMemo, Component } from 'react';
import { Application, Graphics, Text, TextStyle, Container } from 'pixi.js';
import { getSpriteForAgent } from '../data/pixelSprites';

const PIXEL = 4;           // increased from 3 → 4 for higher resolution
const SPRITE_SIZE = 16;
const PADDING_TOP = 55;
const DESK_H = 120;        // taller rows for breathing room

// ── Error Boundary ──────────────────────────────────────────────────
class PixelOfficeErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(err) { console.warn('[PixelOffice] Render error:', err.message); }
    render() {
        if (this.state.hasError) {
            return <div style={{ textAlign: 'center', padding: '2rem', color: '#71717A', fontSize: '0.85rem' }}>⚠️ Pixel Office 渲染失敗，請重新整理</div>;
        }
        return this.props.children;
    }
}

// ── Drawing helpers ─────────────────────────────────────────────────
function drawPixelSprite(container, spriteData, x, y, scale = PIXEL) {
    const g = new Graphics();
    for (let row = 0; row < spriteData.length; row++) {
        for (let col = 0; col < spriteData[row].length; col++) {
            const color = spriteData[row][col];
            if (!color) continue;
            g.rect(col * scale, row * scale, scale, scale).fill(color);
        }
    }
    g.x = x; g.y = y;
    container.addChild(g);
    return g;
}

function drawDesk(container, x, y) {
    const g = new Graphics();
    // desk body
    g.rect(0, 0, 72, 34).fill('#5B3A1A');
    g.rect(2, 2, 68, 30).fill('#7B5B3A');
    // monitor
    g.rect(18, -26, 36, 24).fill('#1a1a2e');
    g.rect(20, -24, 32, 20).fill('#3B82F6');
    // stand
    g.rect(32, -2, 8, 6).fill('#444');
    // keyboard
    g.rect(12, 8, 24, 4).fill('#333');
    g.x = x; g.y = y;
    container.addChild(g);
}

function drawFloor(container, w, h) {
    const g = new Graphics();
    g.rect(0, 0, w, h).fill('#16161E');
    for (let x = 0; x < w; x += 24) g.rect(x, 0, 1, h).fill('#1E1E2E');
    for (let y = 0; y < h; y += 24) g.rect(0, y, w, 1).fill('#1E1E2E');
    container.addChild(g);
}

function drawWall(container, w) {
    const g = new Graphics();
    g.rect(0, 0, w, 46).fill('#1E1E2E');
    g.rect(0, 44, w, 2).fill('#2A2A3E');
    // whiteboard
    const wbX = Math.max(10, Math.floor(w / 2) - 60);
    g.rect(wbX, 5, 120, 34).fill('#E5E7EB');
    g.rect(wbX + 2, 7, 116, 30).fill('#F9FAFB');
    g.rect(wbX + 10, 14, 40, 3).fill('#60A5FA');
    g.rect(wbX + 10, 22, 30, 3).fill('#F472B6');
    g.rect(wbX + 10, 30, 50, 3).fill('#34D399');
    // poster left
    if (w > 300) {
        g.rect(24, 6, 30, 32).fill('#2D2D44');
        g.rect(26, 8, 26, 28).fill('#3B3B5B');
    }
    // plant right
    if (w > 350) {
        g.rect(w - 60, 22, 20, 8).fill('#7B5B3A');
        g.rect(w - 56, 12, 12, 10).fill('#10B981');
        g.rect(w - 60, 10, 8, 8).fill('#34D399');
        g.rect(w - 46, 16, 8, 8).fill('#059669');
    }
    container.addChild(g);
}

function drawPlant(container, x, y) {
    const g = new Graphics();
    g.rect(0, 14, 14, 12).fill('#D97706');
    g.rect(2, 12, 10, 4).fill('#B45309');
    g.rect(2, 0, 10, 14).fill('#10B981');
    g.rect(-2, 4, 8, 8).fill('#34D399');
    g.rect(10, 2, 8, 8).fill('#059669');
    g.x = x; g.y = y;
    container.addChild(g);
}

function createThinkingDots(container, x, y) {
    const c = new Container();
    ['#60A5FA', '#818CF8', '#A78BFA'].forEach((color, i) => {
        const dot = new Graphics();
        dot.circle(i * 8, 0, 3).fill(color);
        c.addChild(dot);
    });
    c.x = x; c.y = y;
    container.addChild(c);
}

function createStatusIcon(container, status, x, y) {
    const g = new Graphics();
    if (status === 'completed') {
        [[2, 8], [4, 10], [6, 8], [8, 6], [10, 4]].forEach(([px, py]) => g.rect(px, py, 3, 3).fill('#34D399'));
    } else if (status === 'acting') {
        [[8, 0], [6, 3], [4, 6]].forEach(([px, py]) => g.rect(px, py, 5, 3).fill('#FBBF24'));
        g.rect(8, 9, 5, 3).fill('#FBBF24');
        g.rect(6, 12, 5, 3).fill('#F59E0B');
    }
    g.x = x; g.y = y;
    container.addChild(g);
}

// ── Dynamic layout (fills container width) ──────────────────────────
function computeLayout(agents, containerW) {
    const count = agents.length;
    if (count === 0) return { canvasW: containerW, canvasH: 200, positions: [] };

    // dynamically choose columns based on width
    const spriteW = SPRITE_SIZE * PIXEL;
    const deskSlotW = spriteW + 60;
    const cols = Math.max(1, Math.min(count, Math.floor(containerW / deskSlotW)));
    const rows = Math.ceil(count / cols);
    const canvasW = containerW;
    const canvasH = rows * DESK_H + PADDING_TOP + 50;

    const slotW = canvasW / cols;
    const positions = agents.map((agent, i) => ({
        agentId: agent.id,
        label: agent.name,
        x: (i % cols) * slotW + (slotW - spriteW) / 2,
        y: PADDING_TOP + Math.floor(i / cols) * DESK_H,
    }));

    return { canvasW, canvasH, positions };
}

// ── Canvas Component ────────────────────────────────────────────────
const PixelOfficeCanvas = ({ agents }) => {
    const containerRef = useRef(null);
    const appRef = useRef(null);
    const frameRef = useRef(0);
    const agentsRef = useRef(agents);

    useEffect(() => { agentsRef.current = agents; }, [agents]);

    const agentKey = useMemo(
        () => agents.map(a => a.id).sort().join(','),
        [agents]
    );

    useEffect(() => {
        if (!containerRef.current || agents.length === 0) return;

        let destroyed = false;
        let app = null;

        const build = async () => {
            const containerW = containerRef.current.clientWidth || 800;
            const { canvasW, canvasH, positions } = computeLayout(agents, containerW);
            const dynamics = {};

            try {
                app = new Application();
                await app.init({
                    width: canvasW,
                    height: canvasH,
                    backgroundAlpha: 0,
                    antialias: false,
                    resolution: window.devicePixelRatio || 2,
                    autoDensity: true,
                    roundPixels: true,
                    preference: 'webgl',
                });
            } catch (err) {
                console.warn('[PixelOffice] PixiJS init failed:', err.message);
                return;
            }

            if (destroyed) { try { app.destroy(true); } catch { } return; }

            app.canvas.style.imageRendering = 'pixelated';
            app.canvas.style.width = '100%';
            app.canvas.style.height = 'auto';
            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(app.canvas);
            appRef.current = app;

            const bgLayer = new Container();
            const furnitureLayer = new Container();
            const charLayer = new Container();
            const uiLayer = new Container();
            app.stage.addChild(bgLayer, furnitureLayer, charLayer, uiLayer);

            drawFloor(bgLayer, canvasW, canvasH);
            drawWall(bgLayer, canvasW);
            drawPlant(furnitureLayer, 10, canvasH - 36);
            if (canvasW > 300) drawPlant(furnitureLayer, canvasW - 30, canvasH - 36);

            positions.forEach(({ agentId, x, y, label }) => {
                const agentObj = agents.find(a => a.id === agentId);
                const spriteW = SPRITE_SIZE * PIXEL;
                drawDesk(furnitureLayer, x - 4, y + spriteW + 4);

                const nameLabel = new Text({
                    text: label,
                    style: new TextStyle({ fontFamily: 'Consolas, "Courier New", monospace', fontSize: 9, fill: '#A1A1AA' }),
                });
                nameLabel.x = x + 4;
                nameLabel.y = y + spriteW + 40;
                furnitureLayer.addChild(nameLabel);

                const spriteData = getSpriteForAgent(agentId, agentObj?.role || '');
                const sprite = drawPixelSprite(charLayer, spriteData, x, y, PIXEL);
                dynamics[agentId] = { sprite, baseY: y };
            });

            const tickerCb = (time) => {
                frameRef.current += time.deltaTime;
                const frame = frameRef.current;
                const currentAgents = agentsRef.current;

                Object.entries(dynamics).forEach(([id, dyn]) => {
                    const ad = currentAgents.find(a => a.id === id);
                    if (!ad || !dyn.sprite) return;
                    dyn.sprite.y = ad.status === 'thinking' ? dyn.baseY + Math.sin(frame * 0.05) * 2 : dyn.baseY;
                });

                uiLayer.removeChildren();
                currentAgents.forEach(ad => {
                    const dyn = dynamics[ad.id];
                    if (!dyn) return;
                    const pos = positions.find(p => p.agentId === ad.id);
                    if (!pos) return;
                    const cx = pos.x + (SPRITE_SIZE * PIXEL) / 2;
                    const topY = dyn.baseY;
                    if (ad.status === 'thinking') createThinkingDots(uiLayer, cx - 10, topY - 12);
                    else if (ad.status === 'acting') createStatusIcon(uiLayer, 'acting', cx - 8, topY - 16);
                    else if (ad.status === 'completed') createStatusIcon(uiLayer, 'completed', cx - 8, topY - 16);
                });
            };
            app.ticker.add(tickerCb);
        };

        build();

        return () => {
            destroyed = true;
            try { appRef.current?.destroy(true, { children: true }); } catch { }
            appRef.current = null;
        };
    }, [agentKey]);

    return <div ref={containerRef} className="pixel-office-canvas" />;
};

// ── Exported Component ──────────────────────────────────────────────
export const PixelOffice = ({ agents }) => (
    <PixelOfficeErrorBoundary>
        <div className="pixel-office-container">
            <PixelOfficeCanvas agents={agents} />
            <div className="pixel-office-overlay">
                <span className="pixel-office-badge">{agents.length} agents</span>
            </div>
        </div>
    </PixelOfficeErrorBoundary>
);
