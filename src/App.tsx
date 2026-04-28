import React, { useState, useEffect, useRef } from 'react';
import { Plus, Layout, X, Edit3, CheckCircle2, Trash2, Home, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

const getPdfJs = () => (window as any)['pdfjs-dist/build/pdf'];

interface Progress {
  task: string;
  workerDone: boolean;
  managerDone: boolean;
}

interface Room {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  progress: Progress[];
}

const DEFAULT_TASKS = [
  { task: '軽鉄下地', workerDone: false, managerDone: false },
  { task: 'ボード貼り', workerDone: false, managerDone: false },
  { task: 'クロス仕上げ', workerDone: false, managerDone: false },
  { task: 'クリーニング', workerDone: false, managerDone: false },
];

const STORAGE_KEY = 'construction-progress-data-v12';

function App() {
  const [rooms, setRooms] = useState<Room[]>(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    return savedData ? JSON.parse(savedData) : [];
  });

  // キャンバスのズーム・パン状態
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  // 背景図面
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [bgScale, setBgScale] = useState(100);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);

  // インタラクション
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [resizingId, setResizingId] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  }, [rooms]);

  // ズーム（ホイール操作）
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomSpeed = 0.001;
      const delta = -e.deltaY;
      const newScale = Math.min(Math.max(transform.scale + delta * zoomSpeed, 0.1), 5);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
      const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
      setTransform({ x: newX, y: newY, scale: newScale });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setTransform({ ...transform, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }

    if (draggingId !== null) {
      setRooms(rooms.map(r => r.id === draggingId ? { 
        ...r, 
        x: (e.clientX - dragStart.x) / transform.scale, 
        y: (e.clientY - dragStart.y) / transform.scale 
      } : r));
    } else if (resizingId !== null) {
      const deltaX = (e.clientX - dragStart.x) / transform.scale;
      const deltaY = (e.clientY - dragStart.y) / transform.scale;
      setRooms(rooms.map(r => r.id === resizingId ? { 
        ...r, 
        width: Math.max(120, initialSize.width + deltaX), 
        height: Math.max(100, initialSize.height + deltaY) 
      } : r));
    }
  };

  // PDF処理
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const pdfjs = getPdfJs();
    if (file.type === 'application/pdf' && pdfjs) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;
        const pdf = await pdfjs.getDocument(typedarray).promise;
        setPdfDoc(pdf); setNumPages(pdf.numPages); renderPDFPage(pdf, 1);
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => { setBgImage(event.target?.result as string); setPdfDoc(null); };
      reader.readAsDataURL(file);
    }
  };

  const renderPDFPage = async (pdf: any, pageNum: number) => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    canvas.height = viewport.height; canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    setBgImage(canvas.toDataURL()); setCurrentPage(pageNum);
  };

  const addRoom = () => {
    const nextNum = rooms.length > 0 ? Math.max(...rooms.map(r => parseInt(r.name.match(/\d+/)?.[0] || '0'))) + 1 : 101;
    const newRoom: Room = {
      id: Date.now(),
      name: `${nextNum}号室`,
      x: (100 - transform.x) / transform.scale,
      y: (100 - transform.y) / transform.scale,
      width: 160, height: 120,
      progress: JSON.parse(JSON.stringify(DEFAULT_TASKS)),
    };
    setRooms([...rooms, newRoom]);
    setSelectedRoomId(newRoom.id);
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; font-family: sans-serif; -webkit-font-smoothing: antialiased; }
        * { box-sizing: border-box; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f8fafc', overflow: 'hidden' }}
           onMouseMove={handleMouseMove} 
           onMouseUp={() => { setDraggingId(null); setResizingId(null); setIsPanning(false); }}>
        
        {/* 左サイドバー */}
        <aside style={{ width: '260px', backgroundColor: '#0f172a', display: 'flex', flexDirection: 'column', color: 'white', zIndex: 30 }}>
          <div style={{ padding: '32px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <div style={{ backgroundColor: '#2563eb', padding: '8px', borderRadius: '10px' }}><Layout size={22} /></div>
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>施工進捗管理</span>
            </div>
            <button onClick={addRoom} style={{ width: '100%', backgroundColor: '#2563eb', border: 'none', padding: '14px', borderRadius: '12px', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Plus size={18} /> 部屋を追加
            </button>
            <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', marginTop: '10px', backgroundColor: '#334155', border: 'none', padding: '14px', borderRadius: '12px', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <FileText size={18} /> 図面(PDF/画像)
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*,application/pdf" />
          </div>
          <nav style={{ flex: 1, padding: '0 20px' }}>
            {bgImage && (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '10px' }}>図面設定</div>
                <input type="range" min="0" max="1" step="0.1" value={bgOpacity} onChange={e => setBgOpacity(parseFloat(e.target.value))} style={{ width: '100%' }} />
                <input type="range" min="5" max="200" value={bgScale} onChange={e => setBgScale(parseInt(e.target.value))} style={{ width: '100%', marginTop: '10px' }} />
              </div>
            )}
          </nav>
        </aside>

        {/* メインキャンバス */}
        <main ref={containerRef} onWheel={handleWheel} onMouseDown={(e) => { if (e.button === 0 && !draggingId && !resizingId) { setIsPanning(true); setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y }); } }}
              style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#e2e8f0', cursor: isPanning ? 'grabbing' : 'grab' }}>
          
          <div style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0', position: 'absolute', inset: 0 }}>
             {/* 背景グリッド */}
             <div style={{ position: 'absolute', width: '5000px', height: '5000px', top: -2500, left: -2500, backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
             
             {/* 図面 */}
             {bgImage && (
               <div style={{ position: 'absolute', top: 0, left: 0, opacity: bgOpacity, transform: `scale(${bgScale / 100})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                 <img src={bgImage} alt="plan" style={{ maxWidth: 'none' }} />
               </div>
             )}

             {/* 部屋要素 */}
             {rooms.map((room) => {
               const completed = room.progress.filter(p => p.managerDone).length;
               const percent = (completed / room.progress.length) * 100;
               const isSelected = selectedRoomId === room.id;
               return (
                 <div key={room.id} onMouseDown={(e) => { setDraggingId(room.id); setDragStart({ x: e.clientX - room.x * transform.scale, y: e.clientY - room.y * transform.scale }); setSelectedRoomId(room.id); e.stopPropagation(); }}
                      style={{ position: 'absolute', left: `${room.x}px`, top: `${room.y}px`, width: `${room.width}px`, height: `${room.height}px`, backgroundColor: 'rgba(255, 255, 255, 0.85)', borderRadius: '16px', cursor: 'move', userSelect: 'none', boxShadow: isSelected ? '0 10px 30px rgba(0,0,0,0.2)' : '0 4px 10px rgba(0,0,0,0.1)', border: isSelected ? '3px solid #3b82f6' : (percent === 100 ? '2px solid #22c55e' : '1px solid #cbd5e1'), display: 'flex', flexDirection: 'column', padding: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{room.name}</div>
                    <div style={{ flex: 1 }}></div>
                    <div style={{ width: '100%', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', backgroundColor: percent === 100 ? '#22c55e' : '#3b82f6' }} />
                    </div>
                    {/* リサイズ */}
                    <div onMouseDown={(e) => { setResizingId(room.id); setDragStart({ x: e.clientX, y: e.clientY }); setInitialSize({ width: room.width, height: room.height }); e.stopPropagation(); e.preventDefault(); }}
                         style={{ position: 'absolute', right: '4px', bottom: '4px', width: '20px', height: '20px', cursor: 'nwse-resize' }}>
                      <div style={{ width: '8px', height: '8px', borderRight: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1' }} />
                    </div>
                 </div>
               );
             })}
          </div>
          {/* ズーム倍率表示 */}
          <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>Zoom: {Math.round(transform.scale * 100)}%</div>
        </main>

        {/* 右サイドバー（編集パネル）: 修正の核心部分 */}
        {selectedRoom && (
          <aside style={{ position: 'relative', width: '400px', backgroundColor: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
            {/* ヘッダー */}
            <div style={{ padding: '32px 32px 20px', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={18} color="#3b82f6" />
                <input value={selectedRoom.name} onChange={(e) => setRooms(rooms.map(r => r.id === selectedRoom.id ? {...r, name: e.target.value} : r))} style={{ fontSize: '18px', fontWeight: '800', border: 'none', outline: 'none' }} />
              </div>
              <button onClick={() => setSelectedRoomId(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            {/* 工程リスト */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }} className="custom-scrollbar">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 45px 45px 30px', gap: '10px', marginBottom: '12px', fontSize: '10px', fontWeight: 'bold', color: '#cbd5e1', textTransform: 'uppercase' }}>
                <span>工程名</span><span style={{ textAlign: 'center' }}>業者</span><span style={{ textAlign: 'center' }}>管理</span><span></span>
              </div>
              
              {selectedRoom.progress.map((p, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 45px 45px 30px', gap: '10px', alignItems: 'center', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '16px', marginBottom: '10px' }}>
                  <input value={p.task} onChange={(e) => {
                    const np = [...selectedRoom.progress]; np[index].task = e.target.value;
                    setRooms(rooms.map(r => r.id === selectedRoom.id ? {...r, progress: np} : r));
                  }} style={{ border: 'none', background: 'transparent', fontSize: '14px', fontWeight: '600', outline: 'none' }} />
                  
                  {/* チェックボックスを復活・固定 */}
                  <input type="checkbox" checked={p.workerDone} onChange={() => {
                    const np = [...selectedRoom.progress]; np[index].workerDone = !p.workerDone;
                    setRooms(rooms.map(r => r.id === selectedRoom.id ? {...r, progress: np} : r));
                  }} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  
                  <input type="checkbox" checked={p.managerDone} onChange={() => {
                    const np = [...selectedRoom.progress]; np[index].managerDone = !p.managerDone;
                    setRooms(rooms.map(r => r.id === selectedRoom.id ? {...r, progress: np} : r));
                  }} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  
                  <button onClick={() => setRooms(rooms.map(r => r.id === selectedRoom.id ? {...r, progress: r.progress.filter((_, i) => i !== index)} : r))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#cbd5e1' }}><Trash2 size={16} /></button>
                </div>
              ))}

              <button onClick={() => setRooms(rooms.map(r => r.id === selectedRoom.id ? {...r, progress: [...r.progress, {task: '新規工程', workerDone: false, managerDone: false}]} : r))} style={{ width: '100%', padding: '16px', border: '2px dashed #e2e8f0', borderRadius: '16px', background: 'white', color: '#94a3b8', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px' }}>
                + 工程を追加
              </button>
            </div>

            {/* フッター */}
            <div style={{ padding: '24px 32px 32px', borderTop: '1px solid #f8fafc', flexShrink: 0 }}>
              <button onClick={() => { if(window.confirm('この部屋を削除してもよろしいですか？')){ setRooms(rooms.filter(r => r.id !== selectedRoom.id)); setSelectedRoomId(null); } }} style={{ width: '100%', padding: '16px', border: 'none', borderRadius: '16px', backgroundColor: '#fff1f2', color: '#e11d48', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
                <Trash2 size={16} /> 部屋を削除する
              </button>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}

export default App;